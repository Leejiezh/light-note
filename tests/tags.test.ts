// 标签字典 + 主题存储层单元测试（vitest 运行，不依赖 uni-app 环境）
//
// tags.ts / theme.ts 都引用 uni.getStorageSync —— 先装内存版 shim 再用
// （两个模块顶层都不碰 uni，静态 import 安全）。
//
// ★ 字典接口用 api 门面桩替换，不加载真实传输层：
//   既避免 vitest 解析不到 '@' 别名（request → mock/handler → @/utils/markdown），
//   也让「接口到底被调了几次」成为可直接断言的量 —— 「会话内只拉一次」靠它锁住。
import { it, expect, vi } from 'vitest';

const { getNoteLabelsMock } = vi.hoisted(() => ({ getNoteLabelsMock: vi.fn() }));
vi.mock('../src/api', () => ({ getNoteLabels: getNoteLabelsMock }));

// 默认「接口挂了」：第一个用例据此验证「缓存兜底、页面照常可用」，
// 同时因为失败不锁定 loaded，第二个用例才有机会验证「失败可重试 + 成功后不再请求」。
getNoteLabelsMock.mockRejectedValue(new Error('离线'));

const storage = new Map<string, unknown>();
(globalThis as Record<string, unknown>).uni = {
  getStorageSync: (k: string) => (storage.has(k) ? storage.get(k) : ''),
  setStorageSync: (k: string, v: unknown) => { storage.set(k, v); }
};

import {
  normalizeDict, readTagDict, findTag, readTagLabel, readTagColor,
  readTagColors, hexToRgba, ensureTagDict,
  TAG_DICT_KEY, UNTAGGED_LABEL, FALLBACK_TAG_COLOR
} from '../src/utils/store/tags';
import { getTheme, setTheme, onThemeChange } from '../src/utils/store/theme';

/** 后端 GET /dict/note_label 的响应示例（取自 Apifox 接口 521392829） */
const NOTE_LABELS = [
  { key: 'work', label: '工作', sortOrder: 10, extra: { color: { light: '#7C3AED', dark: '#A98BFF' } } },
  { key: 'design', label: '设计', sortOrder: 20, extra: { color: { light: '#EC4899', dark: '#F68EC2' } } },
  { key: 'tech', label: '技术', sortOrder: 30, extra: { color: { light: '#3B82F6', dark: '#8AB5F9' } } },
  { key: 'life', label: '生活', sortOrder: 40, extra: { color: { light: '#F59E0B', dark: '#FBBF24' } } }
];

it('标签字典 + 主题存储（29 个断言）', async () => {
  let pass = 0, fail = 0;
  const fails: string[] = [];

  function eq(actual: unknown, expected: unknown, name: string) {
    if (actual === expected) { pass++; }
    else { fail++; fails.push(`${name}\n   期望: ${JSON.stringify(expected)}\n   实际: ${JSON.stringify(actual)}`); }
  }
  function ok(cond: unknown, name: string) { eq(!!cond, true, name); }
  function deepEq(actual: unknown, expected: unknown, name: string) {
    eq(JSON.stringify(actual), JSON.stringify(expected), name);
  }

  // ---------- normalizeDict：脏数据兜底 ----------
  deepEq(normalizeDict(null), [], 'null → 空数组');
  deepEq(normalizeDict('不是数组'), [], '非数组 → 空数组');
  deepEq(normalizeDict([{ label: '没有 key' }]), [], '无 key 的项被过滤');
  eq(normalizeDict([{ key: 'a' }])[0].label, 'a', 'label 缺失回落 key');
  eq(normalizeDict([{ key: 'a' }])[0].sortOrder, Number.MAX_SAFE_INTEGER, 'sortOrder 非法排到最后');
  deepEq(
    normalizeDict([{ key: 'b', label: 'B', sortOrder: 20 }, { key: 'a', label: 'A', sortOrder: 10 }]).map((x) => x.key),
    ['a', 'b'],
    '按 sortOrder 升序'
  );

  // ---------- 主题：默认值与归一化 ----------
  eq(getTheme(), 'light', '无存储时默认浅色');

  // ---------- 字典加载：吃本地缓存 ----------
  storage.set(TAG_DICT_KEY, NOTE_LABELS);
  await ensureTagDict();
  eq(readTagDict().length, 4, '缓存 hydrate 出 4 个标签');
  ok(!!findTag('work'), 'findTag 命中已有标签');
  eq(findTag('missing'), undefined, 'findTag 未命中返回 undefined');

  // ---------- readTagLabel：展示名 ----------
  eq(readTagLabel('work'), '工作', '命中标签显示后端中文名');
  eq(readTagLabel('travel'), 'travel', '未知标签回落 key（后端新增标签也不空白）');
  eq(readTagLabel(''), UNTAGGED_LABEL, '空标签 = 未分类');
  eq(readTagLabel('all'), UNTAGGED_LABEL, '历史键 all = 未分类');

  // ---------- readTagColor：色值以后端为准，按主题取 ----------
  eq(readTagColor('work'), '#7C3AED', '浅色取 extra.color.light');
  eq(setTheme('dark'), 'dark', 'setTheme 返回归一化后的主题');
  eq(getTheme(), 'dark', '主题已写入存储');
  eq(readTagColor('work'), '#A98BFF', '暗色取 extra.color.dark（切主题即时生效）');
  eq(readTagColor('travel'), FALLBACK_TAG_COLOR, '未知标签回落令牌兜底色');
  eq(setTheme('乱写的值'), 'light', '非法主题值回落浅色');

  // ---------- readTagColors：胶囊配色 ----------
  const workTone = readTagColors('work');
  eq(workTone.color, '#7C3AED', '胶囊文字色 = 标签色');
  eq(workTone.background, 'rgba(124, 58, 237, 0.12)', '胶囊底色 = 同色降透明度');
  const noneTone = readTagColors('travel');
  ok(noneTone.color !== noneTone.background, '取不到颜色时文字与底不同色（否则文字看不见）');

  // ---------- hexToRgba ----------
  eq(hexToRgba('#7C3AED', 0.12), 'rgba(124, 58, 237, 0.12)', '六位 hex');
  eq(hexToRgba('#fff', 0.5), 'rgba(255, 255, 255, 0.5)', '三位 hex 展开');
  eq(hexToRgba(' #A98BFF ', 1), 'rgba(169, 139, 255, 1)', '容忍前后空白');
  eq(hexToRgba('var(--brand-500)', 0.12), 'var(--brand-500)', '非 hex 原样返回');

  // ---------- 主题订阅：切换后标签色要跟着变 ----------
  let notified = '';
  const off = onThemeChange((mode) => { notified = mode; });
  setTheme('dark');
  eq(notified, 'dark', '订阅者收到主题变化');
  off();
  setTheme('light');
  eq(notified, 'dark', '取消订阅后不再收到通知');

  // ---------- 汇总 ----------
  console.log(`\ntags 测试：${pass} 通过，${fail} 失败`);
  if (fail) {
    console.error('\n失败详情：');
    fails.forEach((f) => console.error(' ✗ ' + f));
  }
  expect(fail, fails.join('\n')).toBe(0);
});

it('字典会话内只拉一次：冷启动拉取 + 落缓存，之后不再请求', async () => {
  const labels = [
    { key: 'work', label: '工作', sortOrder: 10 },
    { key: 'life', label: '生活', sortOrder: 20 }
  ];

  getNoteLabelsMock.mockClear();

  // 1) 前一个用例的失败没有锁定状态 → 这里会重试（一次网络抖动不该让字典永久为空）
  await ensureTagDict();
  expect(getNoteLabelsMock.mock.calls.length, '失败后仍会重试').toBe(1);

  // 2) 成功一次：写入字典 + 落缓存
  getNoteLabelsMock.mockResolvedValueOnce(labels);
  await ensureTagDict();
  expect(getNoteLabelsMock.mock.calls.length, '重试发出第二次请求').toBe(2);
  expect(readTagDict().length, '字典已更新为接口数据').toBe(2);
  expect(storage.get(TAG_DICT_KEY), '字典已落缓存').toEqual(labels);

  // 3) 已加载后：切标签 / 进详情页 / 返回列表页都只读缓存，不再发请求
  await ensureTagDict();
  await ensureTagDict();
  expect(getNoteLabelsMock.mock.calls.length, '已加载后不再重复请求 note_label').toBe(2);
  expect(readTagDict().length, '复用缓存不丢数据').toBe(2);
});

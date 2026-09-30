// ============================================================
// 轻记 · Mock 数据层
// 让骨架在无后端时也能完整跑通
// 数据严格遵循 data-api-contract.md §1 的 Note Schema
// ============================================================

import { countTodos, extractExcerpt, normalizeChecks } from '../markdown/index.js';

/** 模拟延迟，贴近真实网络 */
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

/** 生成 id */
let idSeq = 100;
const nextId = () => `n${idSeq++}`;

const now = Date.now();
const HOUR = 3600 * 1000;

/** 初始数据（内存态，刷新即重置） */
let DB = [
  {
    id: 'n1',
    title: '设计系统评审要点',
    body: [
      '## 一、令牌分层',
      '',
      '色彩令牌必须区分两层：**品牌色**与*中性色*。配色的搭配要克制。',
      '',
      '## 二、本周待办',
      '',
      '- [ ] 确认断点方案 —— 768px 是否作为导航切换点',
      '- [x] 校对全部文字对比度 —— 重点查 gray-400 的误用',
      '- [ ] 输出 P0 组件清单 —— 五种状态必须齐全',
      '',
      '> 提醒：`--gray-400` 对比度仅 2.6:1，严禁用于文字。',
      '',
      '## 三、参考链接',
      '',
      '- [WCAG 2.2 标准](https://www.w3.org/TR/WCAG22/)',
      '- [对比度检查器](https://webaim.org/resources/contrastchecker/)',
      '',
      '---',
      '',
      '## 四、下周预告',
      '',
      '- [ ] 暗色模式令牌表',
      '- [ ] 编辑器详细设计'
    ].join('\n'),
    tag: 'work',
    checks: [false, true, false, false, false],
    pinned: true,
    createdAt: now - 48 * HOUR,
    updatedAt: now - 2 * HOUR
  },
  {
    id: 'n2',
    title: '移动优先的断点选择',
    body: [
      '从 **320px** 起步，按需向上增强。',
      '',
      '| 断点 | 设备 |',
      '| --- | --- |',
      '| 576px | 手机 |',
      '| 768px | 平板 |',
      '| 992px | 笔记本 |',
      '',
      '关键：**默认单列布局**，空间允许时再扩展。'
    ].join('\n'),
    tag: 'design',
    checks: [],
    pinned: false,
    createdAt: now - 30 * HOUR,
    updatedAt: now - 26 * HOUR
  },
  {
    id: 'n3',
    title: 'MySQL 全文索引笔记',
    body: [
      'MySQL 8.0 使用 `ngram` 分词器处理中文搜索。',
      '',
      '```sql',
      'ALTER TABLE notes ADD FULLTEXT INDEX ft_note (title, body) WITH PARSER ngram;',
      '```',
      '',
      '要点：',
      '',
      '1. 必须显式指定 `WITH PARSER ngram`',
      '2. `ngram_token_size` 默认 2，单字搜索需降级 LIKE',
      '3. 关键词要先剥离 BOOLEAN MODE 运算符'
    ].join('\n'),
    tag: 'tech',
    checks: [],
    pinned: false,
    createdAt: now - 20 * HOUR,
    updatedAt: now - 18 * HOUR
  },
  {
    id: 'n4',
    title: '读书笔记 · 排版设计',
    body: '字距与行高的关系，比字体本身更影响可读性。\n\n行高建议 1.6 倍字号的搭配最舒服。',
    tag: 'life',
    checks: [],
    pinned: false,
    createdAt: now - 8 * HOUR,
    updatedAt: now - 8 * HOUR
  },
  {
    id: 'n5',
    title: '回收站里的旧笔记',
    body: '这条已被删除，用于演示回收站。',
    tag: 'work',
    checks: [],
    pinned: false,
    deletedAt: now - 1 * HOUR,
    createdAt: now - 5 * HOUR,
    updatedAt: now - 1 * HOUR
  }
];

/** 补齐可能缺失的字段，保证契约完整 */
function hydrate(n) {
  const checks = n.checks && n.checks.length === countTodos(n.body)
    ? n.checks
    : normalizeChecks(n.body, n.checks);
  return { ...n, checks };
}

/** 列表项裁掉 body，只留 excerpt（对应契约：列表不返回 body） */
function toListItem(n) {
  return {
    id: n.id,
    title: n.title,
    excerpt: extractExcerpt(n.body, 60),
    tag: n.tag,
    pinned: !!n.pinned,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt
  };
}

/** 高亮生成（服务端职责的本地模拟） */
function highlight(text, q) {
  if (!q) return text;
  const escapeHtml = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  // ★ 转义的是「关键词」的正则特殊字符，不是正文 —— 之前转义错了变量，
  //   导致正则匹配全文、整个标题/摘要都被包进高亮
  const safeQ = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 先转义原文，再匹配转义后的关键词（对应契约：先转义、后替换，防 XSS）
  return escapeHtml(text).replace(
    new RegExp(escapeHtml(safeQ), 'gi'),
    (m) => `<span class="hl">${m}</span>`
  );
}

/** Mock API 入口，签名与真实 request 保持一致 */
export async function mockApi(options) {
  await delay();
  const { url, method = 'GET', data } = options;
  const path = url.split('?')[0];

  // 列表
  if (path === '/notes' && method === 'GET') {
    const tag = data?.tag;
    const list = DB
      .filter((n) => !n.deletedAt)
      .filter((n) => !tag || tag === 'all' || n.tag === tag)
      .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt))
      .map(toListItem);
    return { list, hasMore: false, cursor: null };
  }

  // 搜索
  if (path === '/search' && method === 'GET') {
    const q = (data?.q || '').trim();
    if (!q) return { list: [], total: 0, hasMore: false, cursor: null };
    const list = DB
      .filter((n) => !n.deletedAt)
      .filter((n) => n.title.includes(q) || n.body.includes(q))
      .map((n) => ({
        ...toListItem(n),
        highlights: {
          title: highlight(n.title, q),
          excerpt: highlight(extractExcerpt(n.body, 60), q)
        }
      }));
    return { list, total: list.length, hasMore: false, cursor: null };
  }

  // 标签
  if (path === '/tags' && method === 'GET') {
    const map = {};
    DB.filter((n) => !n.deletedAt).forEach((n) => {
      map[n.tag] = (map[n.tag] || 0) + 1;
    });
    return { list: Object.entries(map).map(([name, count]) => ({ name, count })) };
  }

  // 详情
  const detailMatch = path.match(/^\/notes\/([^/]+)$/);
  if (detailMatch && method === 'GET') {
    const n = DB.find((x) => x.id === detailMatch[1]);
    return n ? hydrate(n) : Promise.reject(new Error('笔记不存在'));
  }

  // 创建
  if (path === '/notes' && method === 'POST') {
    const note = {
      id: nextId(),
      title: data.title || '',
      body: data.body || '',
      tag: data.tag || 'all',
      checks: data.checks || [],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    note.checks = normalizeChecks(note.body, note.checks);
    DB.unshift(note);
    return note;
  }

  // 更新勾选 ★ 不更新 updatedAt
  const checksMatch = path.match(/^\/notes\/([^/]+)\/checks$/);
  if (checksMatch && method === 'PUT') {
    const n = DB.find((x) => x.id === checksMatch[1]);
    if (!n) return Promise.reject(new Error('笔记不存在'));
    // 校验长度（契约：与 countTodos 一致）
    n.checks = normalizeChecks(n.body, data.checks);
    // ★ 不更新 updatedAt
    return { id: n.id, checks: n.checks };
  }

  // 恢复
  const restoreMatch = path.match(/^\/notes\/([^/]+)\/restore$/);
  if (restoreMatch && method === 'POST') {
    const n = DB.find((x) => x.id === restoreMatch[1]);
    if (n) { delete n.deletedAt; n.updatedAt = Date.now(); }
    return { ok: true };
  }

  // 更新（全量）
  if (detailMatch && method === 'PUT') {
    const n = DB.find((x) => x.id === detailMatch[1]);
    if (!n) return Promise.reject(new Error('笔记不存在'));

    const bodyChanged = n.body !== data.body;

    Object.assign(n, {
      title: data.title ?? n.title,
      body: data.body ?? n.body,
      tag: data.tag ?? n.tag,
      updatedAt: Date.now()
    });

    // ★ 正文变更 → 重置 checks；未变更 → 沿用
    n.checks = bodyChanged
      ? normalizeChecks(n.body, [])      // 重置
      : normalizeChecks(n.body, n.checks);

    return hydrate(n);
  }

  // 删除（软删除）
  if (detailMatch && method === 'DELETE') {
    const n = DB.find((x) => x.id === detailMatch[1]);
    if (n) { n.deletedAt = Date.now(); }
    return { ok: true };
  }

  return Promise.reject(new Error(`未实现的接口: ${method} ${path}`));
}

/** 开发调试用：重置数据 */
export function resetMockData() {
  idSeq = 100;
  DB.forEach((n) => { if (n.deletedAt) delete n.deletedAt; });
}

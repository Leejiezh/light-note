// ============================================================
// 轻记 · Mock 内存数据库
// 让骨架在无后端时也能完整跑通
// 数据严格遵循 data-api-contract.md §1 的 Note Schema
// ============================================================

import { countTodos, normalizeChecks } from '@/utils/markdown';
import type { Note, DictItem } from '../types';

/** 内存态的笔记（比对外多一个软删除标记） */
export type StoredNote = Note & { deletedAt?: number };

/** 模拟延迟，贴近真实网络 */
export const delay = (ms = 200) => new Promise<void>((r) => setTimeout(r, ms));

/** 生成 id */
let idSeq = 100;
export const nextId = () => `n${idSeq++}`;

const now = Date.now();
const HOUR = 3600 * 1000;

/** 初始数据（内存态，刷新即重置） */
export const DB: StoredNote[] = [
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

/**
 * 字典数据（对应真实接口 GET /dict/{typeCode}）
 * ★ 色值与后端（Apifox 项目「轻记-uniapp」接口 521392829 的响应示例）保持一致 ——
 *   mock 模拟的是「后端返回的数据」而不是前端 UI 常量，
 *   所以这里出现 hex 不违反「样式统一走令牌」。
 */
export const DICT: Record<string, DictItem[]> = {
  note_label: [
    { key: 'work', label: '工作', sortOrder: 10, extra: { color: { light: '#7C3AED', dark: '#A98BFF' } } },
    { key: 'design', label: '设计', sortOrder: 20, extra: { color: { light: '#EC4899', dark: '#F68EC2' } } },
    { key: 'tech', label: '技术', sortOrder: 30, extra: { color: { light: '#3B82F6', dark: '#8AB5F9' } } },
    { key: 'life', label: '生活', sortOrder: 40, extra: { color: { light: '#F59E0B', dark: '#FBBF24' } } }
  ]
};

/** 补齐可能缺失的字段，保证契约完整 */
export function hydrate(n: StoredNote): Note {
  const checks = n.checks && n.checks.length === countTodos(n.body)
    ? n.checks
    : normalizeChecks(n.body, n.checks);
  return { ...n, checks };
}

/** HTML 转义（高亮前先转义，防 XSS） */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 高亮生成（服务端职责的本地模拟）
 * ★ 转义的是「关键词」的正则特殊字符，不是正文 —— 之前转义错了变量，
 *   导致正则匹配全文、整个标题/摘要都被包进高亮
 */
export function highlight(text: string, q: string): string {
  if (!q) return text;
  const safeQ = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 先转义原文，再匹配转义后的关键词（对应契约：先转义、后替换，防 XSS）
  return escapeHtml(text).replace(
    new RegExp(escapeHtml(safeQ), 'gi'),
    (m) => `<span class="hl">${m}</span>`
  );
}

/**
 * 围绕首个命中的纯文本摘要（对齐后端 SearchHighlightUtil.excerpt）：
 * 命中在正文靠后时也能看到上下文，而不是固定取开头；正文未命中退化为开头窗口。
 */
export function snippet(content: string, q: string, len = 60, lead = 20): string {
  const text = String(content || '');
  if (!text) return '';
  const kw = String(q || '');
  const idx = text.toLowerCase().indexOf(kw.toLowerCase());
  if (idx < 0) return truncateSnippet(text, 0, len);
  const start = Math.max(0, idx - lead);
  const end = Math.max(idx + kw.length, start + len);
  return truncateSnippet(text, start, end);
}

function truncateSnippet(text: string, start: number, end: number): string {
  const from = Math.min(start, text.length);
  const to = Math.min(Math.max(end, from), text.length);
  let out = '';
  if (from > 0) out += '…';
  out += text.slice(from, to);
  if (to < text.length) out += '…';
  return out;
}

/** 开发调试用：重置数据 */
export function resetMockData(): void {
  idSeq = 100;
  DB.forEach((n) => { delete n.deletedAt; });
}

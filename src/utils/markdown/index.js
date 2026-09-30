// ============================================================
// 轻记 · Markdown 解析器统一出口
//
// 所有解析能力从这里导出，业务代码只 import 本文件，
// 保证「渲染」与「摘要」用的是同一套规则。
// ============================================================

export { parseInline, esc, isSafeUrl } from './inline.js';
export { renderMd } from './block.js';
export {
  parseToSegments,
  collectChecks,
  countTodos,
  normalizeChecks,
  resetChecks
} from './segment.js';
export { extractExcerpt } from './excerpt.js';
export { wrapRange, imageMarkdown, insertImageBlock } from './format.js';
export {
  TOOLBAR_SNIPPETS,
  INLINE_FORMATS,
  TODO_PATTERN,
  ALLOWED_PROTOCOLS,
  MEDIA_PROTOCOLS
} from './rules.js';

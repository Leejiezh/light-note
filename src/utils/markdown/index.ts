// ============================================================
// 轻记 · Markdown 解析器统一出口
//
// 所有解析能力从这里导出，业务代码只 import 本文件，
// 保证「渲染」与「摘要」用的是同一套规则。
// ============================================================

export { parseInline, esc, isSafeUrl } from './inline';
export { renderMd } from './block';
export {
  parseToSegments,
  collectChecks,
  countTodos,
  normalizeChecks,
  resetChecks
} from './segment';
export { extractExcerpt } from './excerpt';
export { wrapRange, imageMarkdown, insertImageBlock } from './format';
export type { Segment, TodoItem, RenderOptions } from './types';
export {
  TOOLBAR_SNIPPETS,
  INLINE_FORMATS,
  TODO_PATTERN,
  ALLOWED_PROTOCOLS,
  MEDIA_PROTOCOLS
} from './rules';

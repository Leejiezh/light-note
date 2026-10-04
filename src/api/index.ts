// ============================================================
// 轻记 · API 层统一出口
//
// 页面只 import 本文件（`import { getNotes } from '@/api'`），
// 分层结构对业务代码透明：
//
//   types.ts    DTO（字段契约）
//   config.ts   BASE_URL / 超时 / mock 开关
//   pagination.ts 分页契约：pageNum / pageSize 归一化 + 默认值上限
//   client.ts   传输层：uni.request + 统一包装剥壳
//   auth.ts     鉴权层：token 存取、静默登录
//   request.ts  编排层：带 Authorization、401 自动重登重放
//   modules/    领域接口（note / tag / search）
//   mock/       无后端时的 stub 实现
// ============================================================

export { getToken, isLoggedIn, ensureLogin, logout } from './auth';
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, normalizePageQuery } from './pagination';
export {
  getNotes, getNote, createNote, updateNote,
  updateChecks, deleteNote, restoreNote
} from './modules/note';
export { getTags } from './modules/tag';
export { search } from './modules/search';

export type {
  Note, NoteListItem, NoteDraft, NoteQuery,
  PageQuery, PageResult, SearchResult, SearchHit, SearchQuery,
  TagItem, LoginResult, CheckUpdateResult, OkResult,
  RequestOptions, HttpMethod, ApiEnvelope
} from './types';

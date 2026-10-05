// ============================================================
// 轻记 · API 层统一出口
//
// 页面只 import 本文件（`import { pageRecords } from '@/api'`），
// 分层结构对业务代码透明：
//
//   types.ts    DTO（字段契约）
//   config.ts   BASE_URL / 超时 / mock 开关
//   pagination.ts 分页契约：pageNum / pageSize 归一化 + 默认值上限
//   client.ts   传输层：uni.request + 统一包装剥壳
//   auth.ts     鉴权层：token 存取、静默登录
//   request.ts  编排层：带 Authorization、401 自动重登重放
//   modules/    领域接口（record / tag / search / dict / file / user）
//   mock/       无后端时的 stub 实现
// ============================================================

export { getToken, isLoggedIn, ensureLogin, logout } from './auth';
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, normalizePageQuery } from './pagination';
export { getTags } from './modules/tag';
export { createRecord, getRecord, updateRecord, pageRecords, deleteRecord } from './modules/record';
export { search } from './modules/search';
export { getDictItems, getNoteLabels, NOTE_LABEL_TYPE_CODE } from './modules/dict';
export { presignImage, uploadToMinio, getFileUrl } from './modules/file';
export { getProfile, updateProfile } from './modules/user';

export type {
  Note, NoteListItem,
  PageQuery, PageResult, SearchResult, SearchHit, SearchQuery,
  TagItem, DictItem, DictItemExtra, LoginResult,
  UserProfile, UserProfileDraft, PresignResp,
  RecordVO, RecordDraft, RecordPageQuery,
  RequestOptions, HttpMethod, ApiEnvelope
} from './types';

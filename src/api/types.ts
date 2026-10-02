// ============================================================
// 轻记 · API 层的领域类型（DTO）
//
// 对应 data-api-contract.md §一 的 Note Schema 与 §五 的接口定义。
// 后端字段变化时，只需要改这一个文件。
// ============================================================

// ---------- 请求 / 响应基建 ----------

/** HTTP 方法 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** 底层请求选项（传输层入参） */
export interface RequestOptions {
  url: string;
  method?: HttpMethod;
  /** 请求参数 / 请求体；领域 DTO（NoteDraft 等）直接可传 */
  data?: object | null;
  header?: Record<string, string>;
}

/** 后端统一响应包装 { code, data, msg } */
export interface ApiEnvelope<T = unknown> {
  code: number;
  data: T;
  msg?: string;
  message?: string;
}

// ---------- 领域模型 ----------

/** 笔记（完整形态，详情接口返回） */
export interface Note {
  id: string;
  title: string;
  body: string;
  tag: string;
  /** 待办勾选状态，长度恒等于正文待办项数量（见 markdown 模块的不变式） */
  checks: boolean[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  /** 软删除时间；未删除时不存在该字段 */
  deletedAt?: number;
}

/** 笔记列表项（列表接口返回，不含 body，只有 excerpt） */
export interface NoteListItem {
  id: string;
  title: string;
  excerpt: string;
  tag: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

/** 游标分页结果 */
export interface PageResult<T> {
  list: T[];
  hasMore: boolean;
  cursor: string | null;
}

/** 搜索命中（比列表项多一份服务端高亮） */
export interface SearchHit extends NoteListItem {
  highlights: {
    title: string;
    excerpt: string;
  };
}

/** 搜索结果 */
export interface SearchResult extends PageResult<SearchHit> {
  total: number;
}

/** 标签（名称 + 笔记数） */
export interface TagItem {
  name: string;
  count: number;
}

/** 登录响应（统一包装已在 client 层剥壳，这里就是 data） */
export interface LoginResult {
  token: string;
}

/** 勾选状态更新响应（§5.2：不更新 updatedAt、不重算 excerpt） */
export interface CheckUpdateResult {
  id: string;
  checks: boolean[];
}

/** 通用 ok 响应（删除 / 恢复等） */
export interface OkResult {
  ok: boolean;
}

// ---------- 查询 / 写入参数 ----------

/** 笔记列表查询参数 */
export interface NoteQuery {
  tag?: string;
  cursor?: string | null;
  limit?: number;
}

/** 搜索查询参数 */
export interface SearchQuery {
  /** 关键词 */
  q?: string;
  /** 标签过滤 */
  tag?: string;
  cursor?: string | null;
  limit?: number;
}

/** 笔记写入载荷（创建 / 更新共用；tag 缺省 'all'） */
export interface NoteDraft {
  title?: string;
  body?: string;
  tag?: string;
  checks?: boolean[];
  /** 客户端便利字段：编辑器用与渲染同源的规则生成；后端可忽略自行重算 */
  excerpt?: string;
}

// ============================================================
// 轻记 · API 层的领域类型（DTO）
//
// 分页的请求 / 响应外壳对应 docs/api/pagination.md（后端统一契约）；
// 业务 VO 字段（RecordVO / ReportVO）尚未冻结，以后端为准。
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

/**
 * 后端统一响应外壳 `R<T>`（docs/api/pagination.md §1）：字段固定 code / msg / data。
 * 成功失败一律看 body.code，不看 HTTP 状态码。
 * message 只是少数旧接口的别名字段，取不到 msg 时兜底。
 */
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

// ---------- 分页（后端统一契约，docs/api/pagination.md §2 / §3） ----------

/**
 * 分页请求参数：GET 查询串传参（不是 JSON body），字段名与响应同名。
 * 不传 / 传空串后端都兜底为 pageNum=1、pageSize=10；pageSize 上限 100。
 */
export interface PageQuery {
  /** 页码，从 1 开始，≥ 1 */
  pageNum?: number;
  /** 每页条数，1 ~ 100 */
  pageSize?: number;
}

/**
 * 分页响应 data：list 里放业务 VO。
 * ★ 上拉加载只需 `if (hasNext) pageNum++` 再请求，前端不自己算总页数。
 */
export interface PageResult<V> {
  /** 当前页数据，为空时是 []（不会是 null） */
  list: V[];
  /** 总条数（"共 N 条"文案用） */
  total: number;
  /** 当前页码（与请求同名） */
  pageNum: number;
  /** 每页条数（与请求同名） */
  pageSize: number;
  /** 是否还有下一页 */
  hasNext: boolean;
}

/** 搜索命中（比列表项多一份服务端高亮） */
export interface SearchHit extends NoteListItem {
  highlights: {
    title: string;
    excerpt: string;
  };
}

/** 搜索结果（与分页契约同形，total 已在 PageResult 内） */
export type SearchResult = PageResult<SearchHit>;

/** 标签（名称 + 笔记数） */
export interface TagItem {
  name: string;
  count: number;
}

// ---------- 字典（GET /dict/{typeCode}） ----------

/**
 * 字典项的「类型专属属性」：后端原样透传、不拍平（如 extra.color）。
 * 用宽松索引签名而不是写死字段 —— 后端给某类型加属性时这里不用改。
 */
export interface DictItemExtra {
  /** 标签色：light / dark 分别对应浅色与暗色模式；缺省时前端走令牌兜底 */
  color?: { light?: string; dark?: string };
  [key: string]: unknown;
}

/** 字典项（GET /dict/{typeCode} 的 data 元素，data 是裸数组，不分页） */
export interface DictItem {
  /** 项键：落库用，RecordVO.label 存的就是它 */
  key: string;
  /** 展示名 */
  label: string;
  /** 排序（后端已按此升序返回） */
  sortOrder: number;
  /** 类型专属属性（如 extra.color） */
  extra?: DictItemExtra;
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

/** 笔记列表查询参数（分页 + 标签筛选） */
export interface NoteQuery extends PageQuery {
  tag?: string;
}

/** 搜索查询参数（分页 + 关键词 / 标签） */
export interface SearchQuery extends PageQuery {
  /** 关键词 */
  q?: string;
  /** 标签过滤 */
  tag?: string;
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

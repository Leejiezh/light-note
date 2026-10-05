// ============================================================
// 轻记 · 记录模块接口（编辑器使用）
//
// 对齐后端 RecordController（见 xTx-server xtx-api/.../RecordController.java）：
//   POST   /record/create          创建 → R<Long>（新记录 id）
//   GET    /record/getDetail/{id}  详情 → R<RecordVO>（images 已换签为访问 URL）
//   PUT    /record/update          更新 → R<Void>（images 传 null 不动、[] 清空）
//   GET    /record/page            分页 → R<PageResult<RecordVO>>（label 筛选，空=不过滤）
//   DELETE /record/{id}            删除（物理删除，无回收站）
//
// 列表 / 详情 / 编辑器统一走本模块；note.ts 过渡层已删除。
// ============================================================

import { request } from '../request';
import { normalizePageQuery } from '../pagination';
import type { RecordDraft, RecordVO, RecordPageQuery, PageResult } from '../types';

/** 创建记录，返回新记录 id（雪花 Long 按字符串下发） */
export function createRecord(data: RecordDraft): Promise<string> {
  return request<string>({ method: 'POST', url: '/record/create', data });
}

/** 记录详情：GET /record/getDetail/{id}（images 为访问 URL，仅用于展示） */
export function getRecord(id: string): Promise<RecordVO> {
  return request<RecordVO>({ url: `/record/getDetail/${id}` });
}

/** 删除记录：DELETE /record/{id}（物理删除，后端无回收站，不可恢复） */
export function deleteRecord(id: string): Promise<void> {
  return request<void>({ method: 'DELETE', url: `/record/${id}` });
}

/** 更新记录：PUT /record/update（id 必填；images 传 null 不动附件、[] 清空） */
export function updateRecord(data: RecordDraft & { id: string }): Promise<void> {
  return request<void>({ method: 'PUT', url: '/record/update', data });
}

/** 分页查询记录：GET /record/page（label 空 = 不过滤） */
export function pageRecords(params: RecordPageQuery = {}): Promise<PageResult<RecordVO>> {
  const query: Record<string, string | number> = { ...normalizePageQuery(params) };
  if (params.label) query.label = params.label;
  return request<PageResult<RecordVO>>({ url: '/record/page', data: query });
}

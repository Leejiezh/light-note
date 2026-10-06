// ============================================================
// 轻记 · 记录模块接口（编辑器使用）
//
// 对齐后端 RecordController（见 xTx-server xtx-api/.../RecordController.java）：
//   POST   /record/create          创建 → R<Long>（新记录 id）
//   GET    /record/getDetail/{id}  详情 → R<RecordVO>（images 已换签为访问 URL）
//   PUT    /record/update          更新 → R<Void>（images 传 null 不动、[] 清空）
//   GET    /record/page            分页 → R<PageResult<RecordVO>>（label 筛选，空=不过滤）
//   DELETE /record/{id}            删除 → 移入回收站（置 recycled_at，不删图片）
//   DELETE /recycle/{id}           彻底删除（仅回收站内记录；图片进入 24h 宽限期后清理）
//
// 列表 / 详情 / 编辑器统一走本模块；note.ts 过渡层已删除。
// ============================================================

import { request } from '../request';
import { normalizePageQuery } from '../pagination';
import type { RecordDraft, RecordVO, RecordPageQuery, LabelCountItem, PageResult } from '../types';

/** 创建记录，返回新记录 id（雪花 Long 按字符串下发） */
export function createRecord(data: RecordDraft): Promise<string> {
  return request<string>({ method: 'POST', url: '/record/create', data });
}

/** 记录详情：GET /record/getDetail/{id}（images 为访问 URL，仅用于展示） */
export function getRecord(id: string): Promise<RecordVO> {
  return request<RecordVO>({ url: `/record/getDetail/${id}` });
}

/** 删除记录：DELETE /record/{id}（移入回收站，图片保留可完整恢复；彻底删除走 DELETE /recycle/{id}） */
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

/** 当前用户各标签笔记数：GET /record/label-counts（data 为裸数组，不分页；label 即 dict key） */
export function getLabelCounts(): Promise<LabelCountItem[]> {
  return request<LabelCountItem[]>({ url: '/record/label-counts' });
}

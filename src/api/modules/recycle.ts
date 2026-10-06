// ============================================================
// 轻记 · 回收站模块（RecycleController）
//
// 对齐后端 RecycleController（见 xTx-server xtx-api/.../RecycleController.java）：
//   GET    /recycle/page           回收站分页 → R<PageResult<RecordVO>>（含 recycledAt）
//   POST   /recycle/restore/{id}   恢复 → R<Void>（置 recycled_at=null，图片随记录还原）
//   DELETE /recycle/{id}           彻底删除 → R<Void>（图片进入 24h 宽限期后清理）
//
// 普通删除（移入回收站）走 modules/record.ts 的 deleteRecord，不走这里。
// ============================================================

import { request } from '../request';
import { normalizePageQuery } from '../pagination';
import type { PageQuery, PageResult, RecordVO } from '../types';

/** 回收站分页：GET /recycle/page（只含回收站记录，按进回收站时间倒序） */
export function recyclePage(params: PageQuery = {}): Promise<PageResult<RecordVO>> {
  const query: Record<string, string | number> = { ...normalizePageQuery(params) };
  return request<PageResult<RecordVO>>({ url: '/recycle/page', data: query });
}

/** 恢复：POST /recycle/restore/{id}（移出回收站，图片随记录还原） */
export function restoreRecord(id: string): Promise<void> {
  return request<void>({ method: 'POST', url: `/recycle/restore/${id}` });
}

/** 彻底删除：DELETE /recycle/{id}（仅回收站内记录；图片进入 24h 宽限期后清理） */
export function purgeRecord(id: string): Promise<void> {
  return request<void>({ method: 'DELETE', url: `/recycle/${id}` });
}

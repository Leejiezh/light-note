// ============================================================
// 轻记 · 笔记模块接口
// 对应 data-api-contract.md §5.1 / §5.2
// ============================================================

import { request } from '../request';
import { normalizePageQuery } from '../pagination';
import type {
  Note, NoteListItem, PageResult, NoteDraft, NoteQuery,
  CheckUpdateResult, OkResult
} from '../types';

/**
 * 笔记列表（不返回 body，只返回 excerpt）
 * ★ 分页走统一契约：GET 查询串只带 pageNum / pageSize（+ tag 筛选），
 *   上拉加载看响应里的 hasNext。
 */
export function getNotes(params: NoteQuery = {}): Promise<PageResult<NoteListItem>> {
  const query: Record<string, string | number> = { ...normalizePageQuery(params) };
  if (params.tag) query.tag = params.tag;
  return request<PageResult<NoteListItem>>({ url: '/notes', data: query });
}

/** 笔记详情（返回完整 Note 含 body、checks） */
export function getNote(id: string): Promise<Note> {
  return request<Note>({ url: `/notes/${id}` });
}

/** 创建笔记 */
export function createNote(data: NoteDraft): Promise<Note> {
  return request<Note>({ method: 'POST', url: '/notes', data });
}

/** 更新笔记（全量，会更新 updatedAt） */
export function updateNote(id: string, data: NoteDraft): Promise<Note> {
  return request<Note>({ method: 'PUT', url: `/notes/${id}`, data });
}

/**
 * 仅更新勾选状态 ★
 * 对应 data-api-contract.md §5.2
 * 不更新 updatedAt、不重算 excerpt
 */
export function updateChecks(id: string, checks: boolean[]): Promise<CheckUpdateResult> {
  return request<CheckUpdateResult>({ method: 'PUT', url: `/notes/${id}/checks`, data: { checks } });
}

/** 软删除 */
export function deleteNote(id: string): Promise<OkResult> {
  return request<OkResult>({ method: 'DELETE', url: `/notes/${id}` });
}

/** 从回收站恢复 */
export function restoreNote(id: string): Promise<OkResult> {
  return request<OkResult>({ method: 'POST', url: `/notes/${id}/restore` });
}

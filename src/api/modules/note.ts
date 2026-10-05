// ============================================================
// 轻记 · 笔记模块接口
// 对应 data-api-contract.md §5.1 / §5.2
// ============================================================

import { request } from '../request';
import { pageRecords, getRecord } from './record';
import type {
  Note, NoteListItem, PageResult, NoteDraft, NoteQuery,
  RecordVO, CheckUpdateResult, OkResult
} from '../types';

/**
 * 笔记列表（不返回 body，只返回 excerpt）
 * ★ 底层已切到真实后端 GET /record/page，RecordVO 就地映射成 NoteListItem；
 *   tag='all' 是前端「全部」筛选项，不属于字典，不下发。
 *   上拉加载看响应里的 hasNext。
 */
export function getNotes(params: NoteQuery = {}): Promise<PageResult<NoteListItem>> {
  const label = params.tag && params.tag !== 'all' ? params.tag : undefined;
  return pageRecords({
    pageNum: params.pageNum,
    pageSize: params.pageSize,
    label
  }).then((page) => ({
    ...page,
    list: page.list.map(toNoteListItem)
  }));
}

/** RecordVO → 列表项：excerpt 由 content 归并空白得到，时间从 ISO 串解析 */
function toNoteListItem(vo: RecordVO): NoteListItem {
  return {
    id: vo.id,
    title: vo.title,
    excerpt: (vo.content || '').replace(/\s+/g, ' ').trim(),
    tag: vo.label || '',
    pinned: false,
    createdAt: Date.parse(vo.createdAt) || 0,
    updatedAt: Date.parse(vo.updatedAt) || 0
  };
}

/**
 * 笔记详情 ★ 已切到真实后端 GET /record/getDetail/{id}（接口 ID 521392835）
 * RecordVO 就地映射成 Note：
 *   - content → body（新编辑器为纯文本，旧 markdown 数据仍可分段渲染）
 *   - images 是后端换签的访问 URL（会过期，仅用于展示，不持久化）
 *   - 新后端不存 checks，传空数组（旧 markdown 数据的待办只读、不可勾）
 */
export function getNote(id: string): Promise<Note> {
  return getRecord(id).then((vo) => ({
    id: vo.id,
    title: vo.title,
    body: vo.content,
    checks: [],
    images: vo.images || [],
    recordDate: vo.recordDate,
    tag: vo.label || '',
    pinned: false,
    createdAt: Date.parse(vo.createdAt) || 0,
    updatedAt: Date.parse(vo.updatedAt) || 0
  }));
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

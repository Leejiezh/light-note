// ============================================================
// 轻记 · 字典模块接口
//
// GET /dict/{typeCode} → R<List<DictItemVO>>
//   data 是裸数组（不分页、不套 list），统一外壳已在 client 层剥掉。
//   后端只返回「启用项」，并按 sortOrder 排好序。
//
// 笔记标签（名称 / 排序 / 颜色）取 note_label 这一类型码；
// 「每类标签的笔记数」不在本接口，由后端另一个接口提供。
// ============================================================

import { request } from '../request';
import type { DictItem } from '../types';

/** 笔记标签的字典类型码（后端 path 参数的示例值） */
export const NOTE_LABEL_TYPE_CODE = 'note_label';

/** 按类型码查询字典项（仅启用项） */
export function getDictItems(typeCode: string): Promise<DictItem[]> {
  return request<DictItem[]>({ url: `/dict/${typeCode}` });
}

/** 笔记标签字典（标签清单的唯一来源，前端不再硬编码标签表） */
export function getNoteLabels(): Promise<DictItem[]> {
  return getDictItems(NOTE_LABEL_TYPE_CODE);
}

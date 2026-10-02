// ============================================================
// 轻记 · 标签模块接口
// ============================================================

import { request } from '../request';
import type { TagItem } from '../types';

/** 标签列表（name + count） */
export function getTags(): Promise<{ list: TagItem[] }> {
  return request<{ list: TagItem[] }>({ url: '/tags' });
}

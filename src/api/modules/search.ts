// ============================================================
// 轻记 · 搜索模块接口（服务端搜索，返回 highlights）
// ============================================================

import { request } from '../request';
import type { SearchResult, SearchQuery } from '../types';

/** 搜索 */
export function search(p: SearchQuery = {}): Promise<SearchResult> {
  return request<SearchResult>({
    url: '/search',
    data: { q: p.q, tag: p.tag, cursor: p.cursor, limit: p.limit || 20 }
  });
}

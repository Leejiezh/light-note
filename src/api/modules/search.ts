// ============================================================
// 轻记 · 搜索模块接口（服务端搜索，返回 highlights）
// ============================================================

import { request } from '../request';
import { normalizePageQuery } from '../pagination';
import type { SearchResult, SearchQuery } from '../types';

/** 搜索（分页契约同列表：pageNum / pageSize 进查询串，看 hasNext 上拉） */
export function search(p: SearchQuery = {}): Promise<SearchResult> {
  const query: Record<string, string | number> = { ...normalizePageQuery(p) };
  if (p.q) query.q = p.q;
  if (p.tag) query.tag = p.tag;
  return request<SearchResult>({ url: '/search', data: query });
}

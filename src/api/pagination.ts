// ============================================================
// 轻记 · 分页契约（docs/api/pagination.md §2 / §3）
//
// 所有分页接口共用同一套参数与响应：
//   请求：只有 pageNum / pageSize（GET 查询串），字段名与响应同名
//   响应：{ list, total, pageNum, pageSize, hasNext }
//   上拉：if (hasNext) pageNum++ 再请求，前端不自己算总页数
// ============================================================

import type { PageQuery } from './types';

/** 每页条数默认值（与后端兜底值一致） */
export const DEFAULT_PAGE_SIZE = 10;

/** 每页条数上限（后端声明 1 ~ 100，前端不要超过） */
export const MAX_PAGE_SIZE = 100;

/**
 * 归一化分页参数，保证发出去的查询串合法：
 * - 页码：缺失 / 非法 → 1
 * - 每页：缺失 / 非法 → 默认 10，超过上限 → 100
 * ★ 只产出 pageNum / pageSize 两个字段，避免 undefined 被拼进查询串。
 */
export function normalizePageQuery(query: PageQuery = {}): { pageNum: number; pageSize: number } {
  const pageNum = Math.floor(Number(query.pageNum));
  const pageSize = Math.floor(Number(query.pageSize));
  return {
    pageNum: pageNum >= 1 ? pageNum : 1,
    pageSize: pageSize >= 1 ? Math.min(pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
  };
}

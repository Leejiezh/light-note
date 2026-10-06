// ============================================================
// 轻记 · Mock 路由
//
// 按 method + path 分发到内存数据库，签名与传输层的请求选项一致。
// ★ 路由表必须与 modules/ 里声明的真实接口一一对应（改接口两边同步）。
// ============================================================

import { extractExcerpt } from '@/utils/markdown';
import { DB, DICT, delay, toListItem, highlight } from './db';
import { normalizePageQuery } from '../pagination';
import type { RequestOptions, PageQuery, PageResult } from '../types';

type MockData = Record<string, unknown>;

/**
 * 统一分页切片：列表类接口都套这一层，
 * 保证响应形状与后端契约一致（list / total / pageNum / pageSize / hasNext）。
 */
function paginate<T>(all: T[], query: PageQuery): PageResult<T> {
  const { pageNum, pageSize } = normalizePageQuery(query);
  const start = (pageNum - 1) * pageSize;
  const list = all.slice(start, start + pageSize);
  return {
    list,
    total: all.length,
    pageNum,
    pageSize,
    hasNext: start + list.length < all.length
  };
}

/** Mock API 入口，签名与真实 request 保持一致 */
export function mockApi<T>(options: RequestOptions): Promise<T> {
  return route(options) as Promise<T>;
}

/** 按路由表分发；返回值形状由各路由自行保证，调用方通过泛型声明契约 */
async function route(options: RequestOptions): Promise<unknown> {
  await delay();
  const method = options.method || 'GET';
  const data = (options.data ?? {}) as MockData;
  const path = options.url.split('?')[0];

  // 登录（Mock：任意 code 都签发假 token，让登录链路可预览）
  // ★ 与真实后端契约对齐：POST /auth/login
  if (path === '/auth/login' && method === 'POST') {
    return { token: `mock-token-${Date.now().toString(36)}` };
  }

  // 搜索（统一分页契约）
  if (path === '/search' && method === 'GET') {
    const q = String(data?.q || '').trim();
    if (!q) return paginate([], data as PageQuery);
    const all = DB
      .filter((n) => !n.deletedAt)
      .filter((n) => n.title.includes(q) || n.body.includes(q))
      .map((n) => ({
        ...toListItem(n),
        highlights: {
          title: highlight(n.title, q),
          excerpt: highlight(extractExcerpt(n.body, 60), q)
        }
      }));
    return paginate(all, data as PageQuery);
  }

  // 字典（GET /dict/{typeCode}）★ 与真实契约对齐：data 是裸数组，不分页
  const dictMatch = path.match(/^\/dict\/([^/]+)$/);
  if (dictMatch && method === 'GET') {
    const items = DICT[dictMatch[1]];
    if (!items) return Promise.reject(new Error(`未知字典类型: ${dictMatch[1]}`));
    return items;
  }

  // ★ 列表 / 详情 / 编辑器统一走 /record，mock 不提供（USE_MOCK 下这些页面不可用）

  return Promise.reject(new Error(`未实现的接口: ${method} ${path}`));
}

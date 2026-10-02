// ============================================================
// 轻记 · Mock 路由
//
// 按 method + path 分发到内存数据库，签名与传输层的请求选项一致。
// ★ 路由表必须与 modules/ 里声明的真实接口一一对应（改接口两边同步）。
// ============================================================

import { normalizeChecks, extractExcerpt } from '@/utils/markdown';
import { DB, nextId, delay, hydrate, toListItem, highlight } from './db';
import type { RequestOptions, NoteDraft } from '../types';

type MockData = Record<string, unknown>;

/** Mock API 入口，签名与真实 request 保持一致 */
export function mockApi<T>(options: RequestOptions): Promise<T> {
  return route(options) as Promise<T>;
}

/** 按路由表分发；返回值形状由各路由自行保证，调用方通过泛型声明契约 */
async function route(options: RequestOptions): Promise<unknown> {
  await delay();
  const method = options.method || 'GET';
  const data = (options.data ?? {}) as NoteDraft & MockData;
  const path = options.url.split('?')[0];

  // 登录（Mock：任意 code 都签发假 token，让登录链路可预览）
  // ★ 与真实后端契约对齐：POST /auth/login
  if (path === '/auth/login' && method === 'POST') {
    return { token: `mock-token-${Date.now().toString(36)}` };
  }

  // 列表
  if (path === '/notes' && method === 'GET') {
    const tag = data.tag;
    const list = DB
      .filter((n) => !n.deletedAt)
      .filter((n) => !tag || tag === 'all' || n.tag === tag)
      .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.updatedAt - a.updatedAt))
      .map(toListItem);
    return { list, hasMore: false, cursor: null };
  }

  // 搜索
  if (path === '/search' && method === 'GET') {
    const q = String(data?.q || '').trim();
    if (!q) return { list: [], total: 0, hasMore: false, cursor: null };
    const list = DB
      .filter((n) => !n.deletedAt)
      .filter((n) => n.title.includes(q) || n.body.includes(q))
      .map((n) => ({
        ...toListItem(n),
        highlights: {
          title: highlight(n.title, q),
          excerpt: highlight(extractExcerpt(n.body, 60), q)
        }
      }));
    return { list, total: list.length, hasMore: false, cursor: null };
  }

  // 标签
  if (path === '/tags' && method === 'GET') {
    const map: Record<string, number> = {};
    DB.filter((n) => !n.deletedAt).forEach((n) => {
      map[n.tag] = (map[n.tag] || 0) + 1;
    });
    return { list: Object.entries(map).map(([name, count]) => ({ name, count })) };
  }

  // 详情
  const detailMatch = path.match(/^\/notes\/([^/]+)$/);
  if (detailMatch && method === 'GET') {
    const n = DB.find((x) => x.id === detailMatch[1]);
    return n ? hydrate(n) : Promise.reject(new Error('笔记不存在'));
  }

  // 创建
  if (path === '/notes' && method === 'POST') {
    const note = {
      id: nextId(),
      title: data.title || '',
      body: data.body || '',
      tag: data.tag || 'all',
      checks: data.checks || [],
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as (typeof DB)[number];
    note.checks = normalizeChecks(note.body, note.checks);
    DB.unshift(note);
    return note;
  }

  // 更新勾选 ★ 不更新 updatedAt
  const checksMatch = path.match(/^\/notes\/([^/]+)\/checks$/);
  if (checksMatch && method === 'PUT') {
    const n = DB.find((x) => x.id === checksMatch[1]);
    if (!n) return Promise.reject(new Error('笔记不存在'));
    // 校验长度（契约：与 countTodos 一致）
    n.checks = normalizeChecks(n.body, data.checks);
    // ★ 不更新 updatedAt
    return { id: n.id, checks: n.checks };
  }

  // 恢复
  const restoreMatch = path.match(/^\/notes\/([^/]+)\/restore$/);
  if (restoreMatch && method === 'POST') {
    const n = DB.find((x) => x.id === restoreMatch[1]);
    if (n) { delete n.deletedAt; n.updatedAt = Date.now(); }
    return { ok: true };
  }

  // 更新（全量）
  if (detailMatch && method === 'PUT') {
    const n = DB.find((x) => x.id === detailMatch[1]);
    if (!n) return Promise.reject(new Error('笔记不存在'));

    const bodyChanged = n.body !== data.body;

    Object.assign(n, {
      title: data.title ?? n.title,
      body: data.body ?? n.body,
      tag: data.tag ?? n.tag,
      updatedAt: Date.now()
    });

    // ★ 正文变更 → 重置 checks；未变更 → 沿用
    n.checks = bodyChanged
      ? normalizeChecks(n.body, undefined)   // 重置
      : normalizeChecks(n.body, n.checks);

    return hydrate(n);
  }

  // 删除（软删除）
  if (detailMatch && method === 'DELETE') {
    const n = DB.find((x) => x.id === detailMatch[1]);
    if (n) { n.deletedAt = Date.now(); }
    return { ok: true };
  }

  return Promise.reject(new Error(`未实现的接口: ${method} ${path}`));
}

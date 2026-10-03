// ============================================================
// 轻记 · 请求编排层 request
//
// 职责（后端类比 ≈ 带拦截器的 RestTemplate）：
//   1. mock 开关分流
//   2. 拼上 Authorization: Bearer <token>
//   3. 调传输层 client 发请求
//   4. 401 时：清登录态 → 静默重登（auth.ensureLogin）→ 重放原请求（仅一次）
//
// 业务代码不要直接 import 本文件，用 modules/ 里的领域接口。
// ============================================================

import { send, parseResponse } from './client';
import { getToken, clearLogin, ensureLogin } from './auth';
import { USE_MOCK } from './config';
import { mockApi } from './mock/handler';
import type { RequestOptions } from './types';

/** 统一请求入口（带鉴权与 401 自动重登） */
export async function request<T = unknown>(options: RequestOptions): Promise<T> {
  if (USE_MOCK) return mockApi<T>(options);
  return requestOnce<T>(options, false);
}

async function requestOnce<T>(options: RequestOptions, retried: boolean): Promise<T> {
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.header || {})
  };
  const token = getToken();
  if (token) {
    header.Authorization = `Bearer ${token}`;
  }

  const res = await send({ ...options, header });
  const parsed = parseResponse<T>(res);
  if (parsed.ok) return parsed.data;

  // 401（HTTP 或业务 code）：token 失效 → 静默重登一次并重放原请求（只重放一次）
  if (parsed.unauthorized && !retried) {
    clearLogin();
    await ensureLogin();
    return requestOnce<T>(options, true);
  }

  // 重登后仍 401（或其他错误）：清掉登录态，让页面回到未登录
  if (parsed.unauthorized) clearLogin();
  throw new Error(parsed.message);
}

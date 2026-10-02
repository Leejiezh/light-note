// ============================================================
// 轻记 · 传输层 client
//
// 职责（后端类比 ≈ RestTemplate）：
//   1. 把请求发出去（拼 BASE_URL、超时、透传 header）
//   2. 把 uni.request 的 success/fail 包装剥掉，返回原始 HttpResult
//   3. 解析统一响应包装 { code, data, msg }，判定成功 / 401 / 失败
//
// ★ 不知道 token 是什么：鉴权与重放是 request.ts（编排层）的事，
//   登录接口也可以直接用这里发请求（天然不带 Authorization）。
// ============================================================

import { BASE_URL, TIMEOUT } from './config';
import type { ApiEnvelope, RequestOptions } from './types';

/** 传输层原始响应（未做任何业务判定） */
export interface HttpResult<T = unknown> {
  statusCode: number;
  body: T;
}

/** 发送一次 HTTP 请求（不做鉴权、不做重试） */
export function send<T = unknown>(options: RequestOptions): Promise<HttpResult<T>> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data ?? undefined,
      timeout: TIMEOUT,
      header: options.header,
      success: (res) => resolve({ statusCode: res.statusCode, body: res.data as T }),
      fail: (err) => reject(new Error(err.errMsg || '网络请求失败'))
    });
  });
}

/** 解析后的响应：ok = 成功且已剥壳；失败时带 unauthorized 标记与可读错误信息 */
export type ParsedResponse<T> =
  | { ok: true; data: T }
  | { ok: false; unauthorized: boolean; message: string };

/**
 * 解析统一包装 { code, data, msg }：
 * - HTTP 2xx 且（无统一格式 或 业务 code 为 200/0）→ 成功，剥壳返回 data
 * - 部分后端 HTTP 200 但业务 code 非 200，这里一并识别
 * - 401（HTTP 或业务 code）标记 unauthorized，由上层决定重登重放
 */
export function parseResponse<T = unknown>(res: HttpResult<unknown>): ParsedResponse<T> {
  const body = res.body;
  const envelope: ApiEnvelope | null =
    body && typeof body === 'object' && typeof (body as ApiEnvelope).code === 'number'
      ? (body as ApiEnvelope)
      : null;
  const bizCode = envelope ? envelope.code : null;

  const httpOk = res.statusCode >= 200 && res.statusCode < 300;
  const bizOk = bizCode === null || bizCode === 200 || bizCode === 0;

  if (httpOk && bizOk) {
    return { ok: true, data: (envelope ? envelope.data : body) as T };
  }

  return {
    ok: false,
    unauthorized: res.statusCode === 401 || bizCode === 401,
    message: (envelope?.msg || envelope?.message) || `HTTP ${res.statusCode}`
  };
}

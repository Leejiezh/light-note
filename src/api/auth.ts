// ============================================================
// 轻记 · 鉴权层 auth
//
// 登录态（微信小程序标准流程）：
//   uni.login() 拿临时 code（静默，无需用户授权）
//     → POST /auth/login { code }
//     → 后端用 code + appid + secret 调微信 code2Session 换 openid
//     → 后端按 openid 建用户、签发 token 返回
//     → 前端存本地，后续请求带 Authorization: Bearer <token>
//
//   token 失效（401）→ 编排层清本地态 → 静默重登一次 → 重放原请求
// ============================================================

import { send, parseResponse } from './client';
import type { LoginResult } from './types';

/** token 的本地存储键 */
const TOKEN_KEY = 'ln_token';

/** 读 token（同步，来自本地存储） */
export function getToken(): string {
  return uni.getStorageSync(TOKEN_KEY) || '';
}

/** 是否已登录（仅代表本地持有 token，真实有效性以接口 401 为准） */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/** 清除本地登录态 */
export function clearLogin(): void {
  uni.removeStorageSync(TOKEN_KEY);
}

/** 取微信临时登录凭证 code（一次性，5 分钟有效）。仅小程序端使用；H5 预览走 dev-token，见 loginWithCode。 */
function getWxCode(): Promise<string> {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (r) => (r.code ? resolve(r.code) : reject(new Error('未获取到登录凭证'))),
      fail: (e: { errMsg?: string }) => reject(new Error(e.errMsg || 'uni.login 调用失败'))
    });
  });
  // #endif
}

/** 小程序端登录：wx.login 换 code → POST /auth/login 换 token */
async function wxLogin(): Promise<string> {
  const code = await getWxCode();
  const res = await send({ method: 'POST', url: '/auth/login', data: { code } });
  const parsed = parseResponse<LoginResult>(res);
  if (!parsed.ok) throw new Error(parsed.message);
  if (!parsed.data?.token) throw new Error('登录响应缺少 token');
  uni.setStorageSync(TOKEN_KEY, parsed.data.token);
  return parsed.data.token;
}

/** H5 预览登录：没有 wx.login，直接 GET /auth/dev-token 签发 dev token（仅后端 dev profile 存在） */
async function h5Login(): Promise<string> {
  const res = await send({ method: 'GET', url: '/auth/dev-token', data: { userId: 1 } });
  const parsed = parseResponse<string>(res);
  if (!parsed.ok) throw new Error(parsed.message);
  if (!parsed.data) throw new Error('dev-token 响应缺少 token');
  uni.setStorageSync(TOKEN_KEY, parsed.data);
  return parsed.data;
}

/**
 * 登录并落 token。按平台分发：小程序走 wxLogin，H5 预览走 h5Login。
 * ★ 统一包装已在 client 层剥壳，这里拿到的直接是 data（token）。
 *   登录直接走传输层 send —— 不带 Authorization、401 也不会重试（防死循环）。
 */
async function loginWithCode(): Promise<string> {
  // #ifdef MP-WEIXIN
  return wxLogin();
  // #endif
  // #ifdef H5
  return h5Login();
  // #endif
}

/** 并发锁：启动登录与 401 重放共用，避免并发时重复消费 code */
let loginTask: Promise<string> | null = null;

/**
 * 静默登录（幂等）：已有 token 直接返回；没有则登录。
 * 并发调用共享同一个 Promise，不会触发多次 /login。
 */
export function ensureLogin(): Promise<string> {
  if (isLoggedIn()) return Promise.resolve(getToken());
  if (!loginTask) {
    loginTask = loginWithCode().finally(() => { loginTask = null; });
  }
  return loginTask;
}

/**
 * 退出登录：清本地 token。
 * 微信身份本身退不掉，下次启动 / 下一个 401 仍会静默重登，属平台正常行为。
 * 后端如有作废接口，可在这里补一次调用。
 */
export function logout(): void {
  clearLogin();
}

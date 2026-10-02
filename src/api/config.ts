// ============================================================
// 轻记 · 请求层配置
//
// 切换到真实后端只需把 USE_MOCK 改为 true 并配置 BASE_URL。
// ============================================================

/** ★ mock 开关：true = 内存假数据，false = 请求真实后端 */
export const USE_MOCK = false;

/** 真实后端地址 */
export const BASE_URL = 'http://localhost:8080/api';

/** 请求超时（毫秒） */
export const TIMEOUT = 15000;

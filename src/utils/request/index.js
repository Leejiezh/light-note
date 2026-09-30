// ============================================================
// 轻记 · 请求封装
// 对应 data-api-contract.md §五 的接口定义
//
// 当前使用 mock 数据，切换到真实后端只需把 USE_MOCK 改为 false
// 并配置 BASE_URL。
// ============================================================

import { mockApi } from './mock.js';

const USE_MOCK = true;               // ★ 切换开关
const BASE_URL = 'https://api.example.com';  // 真实后端地址
const TIMEOUT = 15000;

/** 统一请求 */
function request(options) {
  if (USE_MOCK) return mockApi(options);

  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      timeout: TIMEOUT,
      header: {
        'Content-Type': 'application/json',
        // 按需加鉴权：Authorization: `Bearer ${token}`
        ...(options.header || {})
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error(res.data?.message || `HTTP ${res.statusCode}`));
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络请求失败'))
    });
  });
}

// ---------- 列表与详情 ----------

/** 笔记列表（不返回 body，只返回 excerpt） */
export function getNotes(params = {}) {
  return request({
    url: '/notes',
    data: { tag: params.tag, cursor: params.cursor, limit: params.limit || 20 }
  });
}

/** 笔记详情（返回完整 Note 含 body、checks） */
export function getNote(id) {
  return request({ url: `/notes/${id}` });
}

/** 创建笔记 */
export function createNote(data) {
  return request({ method: 'POST', url: '/notes', data });
}

/** 更新笔记（全量，会更新 updatedAt） */
export function updateNote(id, data) {
  return request({ method: 'PUT', url: `/notes/${id}`, data });
}

/**
 * 仅更新勾选状态 ★
 * 对应 data-api-contract.md §5.2
 * 不更新 updatedAt、不重算 excerpt
 */
export function updateChecks(id, checks) {
  return request({ method: 'PUT', url: `/notes/${id}/checks`, data: { checks } });
}

/** 软删除 */
export function deleteNote(id) {
  return request({ method: 'DELETE', url: `/notes/${id}` });
}

/** 从回收站恢复 */
export function restoreNote(id) {
  return request({ method: 'POST', url: `/notes/${id}/restore` });
}

// ---------- 标签 ----------

export function getTags() {
  return request({ url: '/tags' });
}

// ---------- 搜索（服务端搜索，返回 highlights）----------

/**
 * 搜索
 * @param {object} p
 * @param {string} p.q     关键词
 * @param {string} p.tag   标签过滤
 * @param {string} p.cursor 游标
 * @param {number} p.limit 数量
 */
export function search(p = {}) {
  return request({
    url: '/search',
    data: { q: p.q, tag: p.tag, cursor: p.cursor, limit: p.limit || 20 }
  });
}

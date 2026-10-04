// ============================================================
// 轻记 · 用户资料模块接口（对接后端 UserController）
//
// GET/PUT /user/profile 都以 JWT 定位当前用户，无路径参数。
// avatarKey（objectKey）与 avatarUrl（现签访问 URL）的分工见 types.ts。
// ============================================================

import { request } from '../request';
import type { UserProfile, UserProfileDraft } from '../types';

/** 当前用户资料（avatarUrl 已由后端现签，可直接渲染） */
export function getProfile(): Promise<UserProfile> {
  return request<UserProfile>({ url: '/user/profile' });
}

/** 更新当前用户资料；avatarUrl 传 objectKey（不是 URL），空串 = 清空头像 */
export function updateProfile(profile: UserProfileDraft): Promise<void> {
  return request<void>({ url: '/user/profile', method: 'PUT', data: profile });
}

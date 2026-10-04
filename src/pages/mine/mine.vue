<template>
  <view class="page">
    <!-- ═══════════ 未登录：登录卡 ═══════════ -->
    <view v-if="!logged && !editing" class="card login" key="login-view">
      <view class="login-avatar" aria-hidden="true">
        <Icon name="user" :size="56" color="var(--brand-500)" />
      </view>
      <text class="name">未登录</text>
      <text class="desc">登录后可在多设备同步你的笔记</text>
      <view
        class="login-btn touch-target"
        role="button"
        :aria-label="loggingIn ? '正在登录' : '微信一键登录'"
        @tap="doLogin"
      >
        <Icon v-if="!loggingIn" name="user" :size="30" color="#ffffff" />
        <text class="login-btn-text">{{ loggingIn ? '登录中…' : '微信一键登录' }}</text>
      </view>
    </view>

    <!-- ═══════════ 资料卡：浏览态 ═══════════ -->
    <view v-else-if="!editing" class="card profile" key="profile-view">
      <!-- 头像：渐变底 + 昵称首字符（底色来自用户在编辑态选的预设） -->
      <view class="avatar" :style="avatarStyle" aria-hidden="true">
        <text class="avatar-char">{{ initial }}</text>
      </view>

      <text class="name">{{ profile.nickname }}</text>
      <text v-if="profile.signature" class="desc">{{ profile.signature }}</text>

      <!-- 编辑入口：胶囊按钮 -->
      <view
        class="edit-btn touch-target"
        role="button"
        aria-label="编辑个人资料"
        @tap="startEdit"
      >
        <Icon name="edit" :size="28" color="var(--brand-500)" />
        <text class="edit-btn-text">编辑资料</text>
      </view>

      <!-- 邮箱 / 所在地：两列信息条 -->
      <view class="info-grid">
        <view class="info-cell">
          <view class="info-icon" aria-hidden="true">
            <Icon name="mail" :size="30" color="var(--brand-500)" />
          </view>
          <view class="info-body">
            <text class="info-label">邮箱</text>
            <text class="info-value ellipsis" :class="{ 'is-empty': !profile.email }">
              {{ profile.email || '未设置' }}
            </text>
          </view>
        </view>
        <view class="info-cell">
          <view class="info-icon" aria-hidden="true">
            <Icon name="location" :size="30" color="var(--brand-500)" />
          </view>
          <view class="info-body">
            <text class="info-label">所在地</text>
            <text class="info-value ellipsis" :class="{ 'is-empty': !profile.location }">
              {{ profile.location || '未设置' }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- ═══════════ 资料卡：编辑态（原地展开） ═══════════ -->
    <view v-else class="card profile editing" key="profile-edit">
      <!-- 头像预览（随选中底色实时变化） -->
      <view class="avatar" :style="draftAvatarStyle" aria-hidden="true">
        <text class="avatar-char">{{ draftInitial }}</text>
      </view>
      <text class="swatch-hint">选择头像底色</text>

      <!-- 底色预设：选中的带同色外圈 + 白色对勾 -->
      <view class="swatches">
        <view
          v-for="p in AVATAR_PRESETS"
          :key="p.key"
          class="swatch"
          :class="{ 'is-on': draft.avatar === p.key }"
          :style="swatchStyle(p)"
          role="button"
          :aria-label="`头像底色：${p.label}`"
          @tap="draft.avatar = p.key"
        >
          <Icon v-if="draft.avatar === p.key" name="check" :size="34" color="#ffffff" />
        </view>
      </view>

      <!-- 表单字段 -->
      <view
        class="field"
        :class="{ 'is-focus': focused === 'nickname', 'is-error': !!errors.nickname }"
      >
        <view class="field-head">
          <text class="field-label">昵称</text>
          <text class="field-count" :class="{ 'is-max': countAtMax('nickname') }">
            {{ charCount(draft.nickname) }}/{{ NICKNAME_MAX }}
          </text>
        </view>
        <input
          v-model="draft.nickname"
          class="field-input"
          type="text"
          :maxlength="NICKNAME_MAX"
          placeholder="怎么称呼你"
          placeholder-class="ph"
          aria-label="昵称"
          @focus="focused = 'nickname'"
          @blur="focused = ''"
          @input="clearError('nickname')"
        />
      </view>
      <text v-if="errors.nickname" class="field-error">{{ errors.nickname }}</text>

      <view
        class="field"
        :class="{ 'is-focus': focused === 'signature', 'is-error': !!errors.signature }"
      >
        <view class="field-head">
          <text class="field-label">个性签名</text>
          <text class="field-count" :class="{ 'is-max': countAtMax('signature') }">
            {{ charCount(draft.signature) }}/{{ SIGNATURE_MAX }}
          </text>
        </view>
        <input
          v-model="draft.signature"
          class="field-input"
          type="text"
          :maxlength="SIGNATURE_MAX"
          placeholder="一句话介绍自己"
          placeholder-class="ph"
          aria-label="个性签名"
          @focus="focused = 'signature'"
          @blur="focused = ''"
          @input="clearError('signature')"
        />
      </view>
      <text v-if="errors.signature" class="field-error">{{ errors.signature }}</text>

      <view class="field-pair">
        <view class="field-col">
          <view
            class="field"
            :class="{ 'is-focus': focused === 'email', 'is-error': !!errors.email }"
          >
            <view class="field-head">
              <text class="field-label">邮箱</text>
            </view>
            <input
              v-model="draft.email"
              class="field-input"
              type="text"
              :maxlength="EMAIL_MAX"
              placeholder="name@example.com"
              placeholder-class="ph"
              aria-label="邮箱"
              @focus="focused = 'email'"
              @blur="focused = ''"
              @input="clearError('email')"
            />
          </view>
          <text v-if="errors.email" class="field-error">{{ errors.email }}</text>
        </view>

        <view class="field-col">
          <view
            class="field"
            :class="{ 'is-focus': focused === 'location', 'is-error': !!errors.location }"
          >
            <view class="field-head">
              <text class="field-label">所在地</text>
            </view>
            <input
              v-model="draft.location"
              class="field-input"
              type="text"
              maxlength="30"
              placeholder="如：杭州"
              placeholder-class="ph"
              aria-label="所在地"
              @focus="focused = 'location'"
              @blur="focused = ''"
              @input="clearError('location')"
            />
          </view>
          <text v-if="errors.location" class="field-error">{{ errors.location }}</text>
        </view>
      </view>

      <!-- 操作区：取消 + 保存 -->
      <view class="actions">
        <view
          class="btn btn-ghost touch-target"
          role="button"
          aria-label="取消编辑"
          @tap="cancelEdit"
        >
          <text class="btn-ghost-text">取消</text>
        </view>
        <view
          class="btn btn-primary touch-target"
          role="button"
          aria-label="保存资料"
          @tap="save"
        >
          <text class="btn-primary-text">保存</text>
        </view>
      </view>
    </view>

    <!-- ═══════════ 统计 ═══════════ -->
    <view class="stats">
      <view class="stat">
        <text class="stat-num">{{ stats.total }}</text>
        <text class="stat-label">全部笔记</text>
      </view>
      <view class="stat">
        <text class="stat-num">{{ stats.done }}</text>
        <text class="stat-label">已完成待办</text>
      </view>
      <view class="stat">
        <text class="stat-num">{{ stats.tags }}</text>
        <text class="stat-label">标签数</text>
      </view>
    </view>

    <!-- ═══════════ 设置 ═══════════ -->
    <view class="group">
      <view class="row touch-target" role="button" aria-label="外观设置" @tap="onAppearance">
        <view class="row-left">
          <view class="row-icon" aria-hidden="true">
            <Icon :name="theme === 'dark' ? 'moon' : 'sun'" :size="36" />
          </view>
          <text class="row-label">外观</text>
        </view>
        <view class="row-right">
          <text class="row-value">{{ themeLabel }}</text>
          <Icon name="chevron" :size="36" color="var(--text-disabled)" />
        </view>
      </view>

      <view class="row touch-target" role="button" aria-label="回收站" @tap="onRecycle">
        <view class="row-left">
          <view class="row-icon" aria-hidden="true">
            <Icon name="trash" :size="36" />
          </view>
          <text class="row-label">回收站</text>
        </view>
        <view class="row-right">
          <Icon name="chevron" :size="36" color="var(--text-disabled)" />
        </view>
      </view>

      <view class="row touch-target" role="button" aria-label="关于轻记" @tap="onAbout">
        <view class="row-left">
          <view class="row-icon" aria-hidden="true">
            <Icon name="info" :size="36" />
          </view>
          <text class="row-label">关于轻记</text>
        </view>
        <view class="row-right">
          <text class="row-value">v1.0.0</text>
          <Icon name="chevron" :size="36" color="var(--text-disabled)" />
        </view>
      </view>

      <!-- 退出登录：仅登录后显示 -->
      <view
        v-if="logged"
        class="row touch-target"
        role="button"
        aria-label="退出登录"
        @tap="onLogout"
      >
        <view class="row-left">
          <view class="row-icon is-danger" aria-hidden="true">
            <Icon name="close" :size="36" color="var(--semantic-error)" />
          </view>
          <text class="row-label is-danger">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import Icon from '@/components/Icon.vue';
import { getNotes, getTags, isLoggedIn, ensureLogin, logout } from '@/api';
import {
  readProfile,
  writeProfile,
  validateProfile,
  getAvatar,
  initialOf,
  charCount,
  AVATAR_PRESETS,
  NICKNAME_MAX,
  SIGNATURE_MAX,
  EMAIL_MAX
} from '@/utils/store/profile';
import type { Profile, ProfileDraft, AvatarKey, AvatarPreset } from '@/utils/store/profile';
import { errorMessage } from '@/utils/errorMessage';

// ---------- 资料（浏览态） ----------
const profile = ref<Profile>(readProfile());
const editing = ref(false);

// ---------- 登录态 ----------
const logged = ref(isLoggedIn());
const loggingIn = ref(false);

/** 显式登录（与启动静默登录共用 ensureLogin 的并发锁，不会重复消费 code） */
async function doLogin() {
  if (loggingIn.value) return;
  loggingIn.value = true;
  try {
    await ensureLogin();
    logged.value = true;
    uni.showToast({ title: '登录成功', icon: 'success' });
    load();
  } catch (e) {
    uni.showToast({ title: errorMessage(e, '登录失败，请稍后再试'), icon: 'none' });
  } finally {
    loggingIn.value = false;
  }
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '退出后云端笔记将不再同步，确定退出？',
    success: ({ confirm }) => {
      if (!confirm) return;
      logout();
      logged.value = false;
      uni.showToast({ title: '已退出登录', icon: 'none' });
    }
  });
}

/** 编辑态草稿：进编辑时拷贝一份，取消即丢弃，保存才落盘 */
const draft = ref<Profile | ProfileDraft>({});
const focused = ref('');
const errors = ref<Record<string, string>>({});
const saving = ref(false);

const initial = computed(() => initialOf(profile.value.nickname));
const draftInitial = computed(() => initialOf(draft.value.nickname));

/**
 * 头像的内联样式
 * 渐变与投影颜色是「用户数据」（预设表里的常量），不随暗色模式变化，
 * 所以以内联样式写入 —— 这是 AGENTS.md「不硬编码颜色」的刻意例外：
 * 它们是内容（身份色），不是主题表面色。
 */
function avatarStyleOf(key: AvatarKey | undefined) {
  const p = getAvatar(key);
  return {
    background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
    boxShadow: `0 8rpx 24rpx ${p.shadow}, inset 0 0 0 3rpx rgba(255, 255, 255, 0.22)`
  };
}
const avatarStyle = computed(() => avatarStyleOf(profile.value.avatar));
const draftAvatarStyle = computed(() => avatarStyleOf(draft.value.avatar as AvatarKey));

/** 色块选中态外圈：内圈用页面卡片底色隔开，外圈用同色 */
function swatchStyle(p: AvatarPreset) {
  if (draft.value.avatar !== p.key) {
    return { background: `linear-gradient(135deg, ${p.from}, ${p.to})` };
  }
  return {
    background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
    boxShadow: `0 0 0 4rpx var(--bg-surface), 0 0 0 8rpx ${p.from}`
  };
}

// ---------- 编辑流转 ----------
function startEdit() {
  draft.value = { ...profile.value };
  errors.value = {};
  focused.value = '';
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
}

function clearError(field: 'nickname' | 'signature' | 'email' | 'location') {
  if (errors.value[field]) {
    errors.value = { ...errors.value, [field]: '' };
  }
}

/** 计数是否到达上限（到达后计数变警示色） */
function countAtMax(key: 'nickname' | 'signature') {
  const max = { nickname: NICKNAME_MAX, signature: SIGNATURE_MAX }[key];
  return max ? charCount(draft.value[key]) >= max : false;
}

function save() {
  if (saving.value) return;

  const res = validateProfile(draft.value);
  if (!res.ok || !res.profile) {
    errors.value = { [res.field || '']: res.message || '' };
    uni.showToast({ title: res.message, icon: 'none' });
    return;
  }

  saving.value = true;
  try {
    profile.value = writeProfile(res.profile);
    editing.value = false;
    uni.showToast({ title: '资料已更新', icon: 'success' });
  } catch (e) {
    uni.showToast({ title: errorMessage(e, '保存失败'), icon: 'none' });
  } finally {
    saving.value = false;
  }
}

// ---------- 统计（沿用原有逻辑） ----------
const stats = ref({ total: 0, done: 0, tags: 0 });
const theme = ref<string>(String(uni.getStorageSync('theme') || 'light'));
const themeLabel = computed(() => (theme.value === 'dark' ? '深色' : '浅色'));

async function load() {
  try {
    const [notesRes, tagsRes] = await Promise.all([getNotes({}), getTags()]);
    stats.value = {
      // 分页响应自带总条数，不要用当前页的 list.length
      total: notesRes.total ?? (notesRes.list || []).length,
      done: 0, // 骨架阶段：真实实现需从各笔记 checks 汇总
      tags: (tagsRes.list || []).length
    };
  } catch (e) {
    // 忽略
  }
}

function onAppearance() {
  const next = theme.value === 'dark' ? 'light' : 'dark';
  uni.showModal({
    title: '切换外观',
    content: `切换到${next === 'dark' ? '深色' : '浅色'}模式？`,
    success: ({ confirm }) => {
      if (!confirm) return;
      theme.value = next;
      uni.setStorageSync('theme', next);
      // 骨架阶段仅记录设置；小程序端需配合页面根节点 class 生效
      uni.showToast({
        title: next === 'dark' ? '已切换深色（需重启生效）' : '已切换浅色',
        icon: 'none'
      });
    }
  });
}

function onRecycle() {
  uni.showToast({ title: '回收站开发中', icon: 'none' });
}

function onAbout() {
  uni.showModal({
    title: '关于轻记',
    content: '轻记 v1.0.0\n一个纯粹的笔记小程序\n\n存储格式：Markdown',
    showCancel: false
  });
}

onShow(() => {
  load();
  // 回到页面时重读一次，防止其他入口改过存储（目前只有本页写，但读一次更稳）
  if (!editing.value) profile.value = readProfile();
  // 登录态可能被启动静默登录 / 401 自动重登改变，同步一次
  logged.value = isLoggedIn();
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $space-4 $space-4 $space-8;
}

/* ═══════════ 资料卡 ═══════════ */
.card {
  background: var(--bg-surface);
  border-radius: $radius-lg;
  box-shadow: var(--shadow-sm);
  padding: $space-6 $space-4 $space-5;
  margin-bottom: $space-5;
}

/* 卡片进场：只在 transform/opacity 上做动效（令牌注释的硬约束） */
.profile,
.login {
  animation: card-rise $duration-base $ease-out;
}

@keyframes card-rise {
  from {
    opacity: 0;
    transform: translateY(12rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ═══════════ 未登录：登录卡 ═══════════ */
.login {
  padding: $space-8 $space-4 $space-6;
  text-align: center;
}

/* 虚线描边头像位：与登录后的渐变头像同尺寸呼应 */
.login-avatar {
  width: 136rpx;
  height: 136rpx;
  border-radius: $radius-full;
  margin: 0 auto $space-3;
  border: 3rpx dashed var(--brand-500);
  background: var(--brand-50);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 主操作：品牌色实心胶囊（复用编辑态保存按钮的语言） */
.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-1;
  height: 88rpx;
  border-radius: $radius-full;
  background: var(--brand-500);
  margin-top: $space-2;
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.97);
  }
}

.login-btn-text {
  font-size: $text-base;
  font-weight: $font-medium;
  color: #ffffff;
}

/*
 * 头像 ★ 渐变底 + 首字符（底色可换）
 * - 渐变与彩色投影由 JS 内联写入（用户数据）
 * - 顶部内高光用 ::after 叠加，模拟光照；不与内联 background 冲突
 */
.avatar {
  position: relative;
  width: 136rpx;
  height: 136rpx;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto $space-3;
}

.avatar::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: $radius-full;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 46%);
  pointer-events: none;
}

.avatar-char {
  color: #fff;
  font-size: 56rpx;
  font-weight: $font-bold;
  letter-spacing: 2rpx;
  text-shadow: 0 2rpx 6rpx rgba(59, 15, 122, 0.35);
}

.name {
  display: block;
  text-align: center;
  font-size: $text-lg;
  font-weight: $font-medium;
  color: var(--text-primary);
  margin-bottom: $space-1;
}

.desc {
  display: block;
  text-align: center;
  font-size: $text-sm;
  color: var(--text-secondary);
  margin-bottom: $space-4;
}

/* 编辑入口胶囊：浅品牌底 + 品牌字，和设置项图标同语言 */
.edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-1;
  height: 64rpx;
  padding: 0 $space-4;
  margin: 0 auto $space-5;
  border-radius: $radius-full;
  background: var(--brand-50);
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.95);
  }
}

.edit-btn-text {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: var(--brand-500);
}

/* 信息条：邮箱 / 所在地 两列 */
.info-grid {
  display: flex;
  gap: $space-3;
}

.info-cell {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: $space-2;
  background: var(--bg-muted);
  border-radius: $radius-md;
  padding: $space-2 $space-3;
}

.info-icon {
  width: 52rpx;
  height: 52rpx;
  border-radius: $radius-full;
  background: var(--brand-50);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.info-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.info-label {
  font-size: $text-xs;
  color: var(--text-tertiary);
}

.info-value {
  font-size: $text-sm;
  color: var(--text-primary);

  &.is-empty {
    color: var(--text-disabled);
  }
}

/* ═══════════ 编辑态 ═══════════ */
.swatch-hint {
  display: block;
  text-align: center;
  font-size: $text-xs;
  color: var(--text-tertiary);
  margin-bottom: $space-3;
}

.swatches {
  display: flex;
  justify-content: center;
  gap: $space-3;
  margin-bottom: $space-6;
}

.swatch {
  width: 68rpx;
  height: 68rpx;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.9);
  }
}

/* 字段：内嵌的软底输入卡 */
.field {
  background: var(--bg-muted);
  border-radius: $radius-md;
  padding: $space-2 $space-3;
  margin-bottom: $space-3;
  transition: box-shadow $duration-fast ease;

  /* 聚焦态：品牌色细环（mp 端 input 无 :focus 样式，用 @focus 切类实现） */
  &.is-focus {
    box-shadow: inset 0 0 0 2rpx var(--brand-500);
  }

  &.is-error {
    box-shadow: inset 0 0 0 2rpx var(--semantic-error);
  }
}

.field-pair {
  display: flex;
  gap: $space-3;

  .field-col {
    flex: 1;
    min-width: 0;
  }
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4rpx;
}

.field-label {
  font-size: $text-xs;
  color: var(--text-tertiary);
}

.field-count {
  font-size: $text-xs;
  color: var(--text-disabled);
  font-variant-numeric: tabular-nums;

  &.is-max {
    color: var(--semantic-warning);
  }
}

.field-input {
  height: 56rpx;
  font-size: $text-base;
  color: var(--text-primary);
}

.field-error {
  display: block;
  font-size: $text-xs;
  color: var(--semantic-error);
  margin: -8rpx 0 $space-2 $space-2;
}

/* 操作区：取消（浅）+ 保存（实心） */
.actions {
  display: flex;
  gap: $space-3;
  margin-top: $space-2;
}

.btn {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.97);
  }
}

.btn-ghost {
  background: var(--bg-muted);
}

.btn-ghost-text {
  font-size: $text-base;
  color: var(--text-secondary);
}

.btn-primary {
  background: var(--brand-500);
}

.btn-primary-text {
  font-size: $text-base;
  font-weight: $font-medium;
  color: #ffffff;
}

/* ═══════════ 统计与设置（沿用既有语言） ═══════════ */
.stats {
  display: flex;
  background: var(--bg-surface);
  border-radius: $radius-lg;
  padding: $space-4 0;
  margin-bottom: $space-5;
  box-shadow: var(--shadow-sm);
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.stat-num {
  font-size: $text-2xl;
  font-weight: $font-bold;
  color: $brand-500;
}

.stat-label {
  font-size: $text-xs;
  color: var(--text-secondary);
}

.group {
  background: var(--bg-surface);
  border-radius: $radius-lg;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-4;
  min-height: 88rpx;
  transition: background-color $duration-fast ease;

  &:active {
    background: var(--bg-muted);
  }

  & + & {
    border-top: 2rpx solid var(--border-default);
  }
}

.row-left {
  display: flex;
  align-items: center;
  gap: $space-3;
}

/* 设置项图标：浅品牌底 + 品牌色图形，和整体紫色语言呼应 */
.row-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: $radius-md;
  background: var(--brand-50);
  color: var(--brand-500);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.row-label {
  font-size: $text-base;
  color: var(--text-primary);

  /* 危险操作（退出登录）：警示色文字 + 中性底图标 */
  &.is-danger {
    color: var(--semantic-error);
  }
}

.row-icon.is-danger {
  background: var(--bg-muted);
}

.row-right {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.row-value {
  font-size: $text-sm;
  color: var(--text-tertiary);
}
</style>

<style lang="scss">
/* placeholder 样式必须放非 scoped 块：小程序 placeholder-class 的类名
   挂在原生 input 内部，scoped 属性选择器够不到（同 rich-text 的处理） */
.ph {
  color: var(--text-disabled);
  font-size: $text-sm;
}
</style>

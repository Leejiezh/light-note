<template>
  <view class="page">
    <view class="profile">
      <view class="avatar" aria-hidden="true">
        <text>记</text>
      </view>
      <text class="name">轻记用户</text>
      <text class="desc">记录每一个值得记下的想法</text>
    </view>

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

    <view class="group">
      <view class="row touch-target" role="button" aria-label="外观设置" @tap="onAppearance">
        <text class="row-label">外观</text>
        <view class="row-right">
          <text class="row-value">{{ themeLabel }}</text>
          <text class="chevron">›</text>
        </view>
      </view>

      <view class="row touch-target" role="button" aria-label="回收站" @tap="onRecycle">
        <text class="row-label">回收站</text>
        <view class="row-right">
          <text class="chevron">›</text>
        </view>
      </view>

      <view class="row touch-target" role="button" aria-label="关于轻记" @tap="onAbout">
        <text class="row-label">关于轻记</text>
        <view class="row-right">
          <text class="row-value">v1.0.0</text>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getNotes, getTags } from '@/utils/request/index.js';

const stats = ref({ total: 0, done: 0, tags: 0 });
const theme = ref(uni.getStorageSync('theme') || 'light');

const themeLabel = computed(() => (theme.value === 'dark' ? '深色' : '浅色'));

async function load() {
  try {
    const [notesRes, tagsRes] = await Promise.all([getNotes({}), getTags()]);
    stats.value = {
      total: (notesRes.list || []).length,
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

onShow(() => load());
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $space-4;
}

.profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-6 0 $space-5;
}

.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: $radius-full;
  background: linear-gradient(135deg, $brand-500, $brand-400);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $space-3;
  box-shadow: $shadow-md;

  text {
    color: #fff;
    font-size: 52rpx;
    font-weight: $font-bold;
  }
}

.name {
  font-size: $text-lg;
  font-weight: $font-medium;
  color: var(--text-primary);
  margin-bottom: $space-1;
}

.desc {
  font-size: $text-sm;
  color: var(--text-secondary);
}

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

.row-label {
  font-size: $text-base;
  color: var(--text-primary);
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

.chevron {
  font-size: 36rpx;
  color: var(--text-disabled);
  line-height: 1;
}
</style>

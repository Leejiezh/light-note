<template>
  <view class="page">
    <view class="header">
      <text class="title">标签</text>
      <text class="subtitle">按标签分类查看笔记</text>
    </view>

    <view v-if="loading" class="loading">加载中…</view>

    <EmptyState
      v-else-if="!tags.length"
      emoji="🏷️"
      title="还没有标签"
      desc="创建笔记时选一个标签吧"
    />

    <view v-else class="list">
      <view
        v-for="t in tags"
        :key="t.name"
        class="tag-row touch-target"
        role="button"
        :aria-label="`标签 ${labelOf(t.name)}，${t.count} 条笔记`"
        @tap="goList(t.name)"
      >
        <view class="tag-left">
          <view class="dot" :style="{ background: colorOf(t.name) }" />
          <text class="tag-name">{{ labelOf(t.name) }}</text>
        </view>
        <view class="tag-right">
          <text class="tag-count">{{ t.count }}</text>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import EmptyState from '@/components/EmptyState.vue';
import { getTags } from '@/api';
import type { TagItem } from '@/api';

const tags = ref<TagItem[]>([]);
const loading = ref(false);

const LABELS: Record<string, string> = { work: '工作', design: '设计', tech: '技术', life: '生活', all: '未分类' };
const COLORS: Record<string, string> = {
  work: '#7C3AED',
  design: '#EC4899',
  tech: '#3B82F6',
  life: '#F59E0B',
  all: '#9C9CA8'
};

const labelOf = (n: string) => LABELS[n] || n;
const colorOf = (n: string) => COLORS[n] || '#7C3AED';

async function load() {
  loading.value = true;
  try {
    const res = await getTags();
    tags.value = res.list || [];
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function goList(_name: string) {
  uni.switchTab({ url: '/pages/list/list' });
}

onShow(() => load());
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $space-4;
}

.header {
  margin-bottom: $space-5;
}

.title {
  display: block;
  font-size: $text-2xl;
  font-weight: $font-bold;
  color: var(--text-primary);
  margin-bottom: $space-1;
}

.subtitle {
  font-size: $text-sm;
  color: var(--text-secondary);
}

.loading {
  text-align: center;
  color: var(--text-secondary);
  font-size: $text-sm;
  padding: $space-8 0;
}

.list {
  background: var(--bg-surface);
  border-radius: $radius-lg;
  overflow: hidden;
}

.tag-row {
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

.tag-left {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: $radius-full;
  flex: none;
}

.tag-name {
  font-size: $text-base;
  color: var(--text-primary);
}

.tag-right {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.tag-count {
  font-size: $text-sm;
  color: var(--text-tertiary);
}

.chevron {
  font-size: 36rpx;
  color: var(--text-disabled);
  line-height: 1;
}
</style>

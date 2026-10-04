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
import { ensureTagDict, readTagLabel, readTagColor } from '@/utils/store/tags';

const tags = ref<TagItem[]>([]);
const loading = ref(false);

// 标签名与颜色统一来自字典（GET /dict/note_label），前端不再维护标签表
const labelOf = (n: string) => readTagLabel(n);
const colorOf = (n: string) => readTagColor(n);

async function load() {
  loading.value = true;
  try {
    // 字典（名称 / 颜色）与计数（后端另一接口）并行；字典拉取失败会静默降级
    const [, res] = await Promise.all([ensureTagDict(), getTags()]);
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

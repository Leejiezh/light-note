<template>
  <view class="page">
    <!-- 标签筛选条 -->
    <scroll-view class="filter-bar" scroll-x :show-scrollbar="false">
      <view class="filter-inner">
        <view
          v-for="t in tagOptions"
          :key="t.value"
          class="chip"
          :class="{ 'is-on': activeTag === t.value }"
          role="button"
          :aria-label="`筛选：${t.label}`"
          @tap="switchTag(t.value)"
        >
          <text>{{ t.label }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 列表 -->
    <view v-if="loading && !notes.length" class="skeleton-wrap">
      <view v-for="i in 3" :key="i" class="skeleton-card">
        <view class="sk-line sk-title" />
        <view class="sk-line" />
        <view class="sk-line sk-short" />
      </view>
    </view>

    <EmptyState
      v-else-if="!notes.length"
      emoji="📝"
      title="还没有笔记"
      desc="记录第一个想法，从一个标题开始"
      action-text="新建笔记"
      @action="goCreate"
    />

    <view v-else class="list">
      <NoteCard
        v-for="n in notes"
        :key="n.id"
        :note="n"
        @open="goDetail"
        @longpress="onLongPress"
      />
      <text class="list-end">共 {{ notes.length }} 条笔记</text>
    </view>

    <!-- 悬浮新建按钮 -->
    <view
      class="fab"
      role="button"
      aria-label="新建笔记"
      @tap="goCreate"
    >
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import NoteCard from '@/components/NoteCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import { getNotes } from '@/utils/request/index.js';

const notes = ref([]);
const loading = ref(false);
const activeTag = ref('all');

const TAG_LABELS = { all: '全部', work: '工作', design: '设计', tech: '技术', life: '生活' };

const tagOptions = computed(() =>
  Object.entries(TAG_LABELS).map(([value, label]) => ({ value, label }))
);

async function load() {
  loading.value = true;
  try {
    const res = await getNotes({ tag: activeTag.value });
    notes.value = res.list || [];
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function switchTag(v) {
  if (activeTag.value === v) return;
  activeTag.value = v;
  load();
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
}

function goCreate() {
  uni.navigateTo({ url: '/pages/editor/editor' });
}

function onLongPress(note) {
  uni.showActionSheet({
    itemList: ['删除笔记'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) confirmDelete(note);
    }
  });
}

function confirmDelete(note) {
  uni.showModal({
    title: '删除笔记',
    content: `「${note.title || '无标题'}」将被移入回收站，30 天后永久清除。`,
    confirmText: '删除',
    confirmColor: '#EF4444',
    success: ({ confirm }) => {
      if (confirm) {
        // 骨架阶段仅提示，真实实现调 deleteNote
        uni.showToast({ title: '已移入回收站', icon: 'none' });
        notes.value = notes.value.filter((x) => x.id !== note.id);
      }
    }
  });
}

// 每次显示都刷新（从编辑器返回后能看到新笔记）
onShow(() => load());

onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding-bottom: 160rpx;
}

/* 筛选条 */
.filter-bar {
  white-space: nowrap;
  background: var(--bg-surface);
  padding: $space-3 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.filter-inner {
  display: inline-flex;
  gap: $space-2;
  padding: 0 $space-4;
}

.chip {
  flex: none;
  padding: 12rpx $space-3;
  min-height: 64rpx;
  display: inline-flex;
  align-items: center;
  border-radius: $radius-full;
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: $text-sm;
  transition: background-color $duration-fast ease, color $duration-fast ease;

  &.is-on {
    background: $brand-500;
    color: #fff;
    font-weight: $font-medium;
  }
}

/* 列表 */
.list {
  padding: $space-3 $space-4 0;
}

.list-end {
  display: block;
  text-align: center;
  font-size: $text-xs;
  color: var(--text-tertiary);
  padding: $space-4 0;
}

/* 骨架屏 */
.skeleton-wrap {
  padding: $space-3 $space-4;
}

.skeleton-card {
  background: var(--bg-surface);
  border-radius: $radius-lg;
  padding: $space-4;
  margin-bottom: $space-3;
}

.sk-line {
  height: 28rpx;
  border-radius: $radius-sm;
  background: linear-gradient(90deg, var(--bg-muted) 25%, $gray-200 37%, var(--bg-muted) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  margin-bottom: $space-2;

  &.sk-title { width: 55%; height: 34rpx; }
  &.sk-short { width: 35%; margin-bottom: 0; }
}

@keyframes shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

/* 悬浮按钮 */
.fab {
  position: fixed;
  right: $space-4;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  width: 112rpx;
  height: 112rpx;
  border-radius: $radius-full;
  background: $brand-500;
  box-shadow: $shadow-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  transition: transform $duration-fast $ease-spring;

  &:active {
    transform: scale(0.92);
  }
}

.fab-icon {
  color: #fff;
  font-size: 56rpx;
  line-height: 1;
  margin-top: -4rpx;
}
</style>

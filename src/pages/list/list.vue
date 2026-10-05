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
      <text class="list-end">{{ listEnd }}</text>
    </view>

    <!-- 悬浮新建按钮 -->
    <view
      class="fab"
      role="button"
      aria-label="新建笔记"
      @tap="goCreate"
    >
      <Icon name="plus" :size="52" color="#FFFFFF" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import NoteCard from '@/components/NoteCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import Icon from '@/components/Icon.vue';
import { pageRecords, deleteRecord, DEFAULT_PAGE_SIZE } from '@/api';
import type { RecordVO } from '@/api';
import { errorMessage } from '@/utils/errorMessage';
import { ensureTagDict, readTagDict } from '@/utils/store/tags';

const notes = ref<RecordVO[]>([]);
const loading = ref(false);       // 首屏 / 下拉刷新
const loadingMore = ref(false);   // 上拉加载下一页
const activeTag = ref('all');

/** 分页状态（后端统一契约：请求 pageNum / pageSize，响应 hasNext 决定还能不能上拉） */
const pageNum = ref(1);
const total = ref(0);
const hasNext = ref(false);

/** 「全部」是前端筛选项（不按标签过滤），不属于字典项 */
const ALL_FILTER = { value: 'all', label: '全部' };

/** 筛选项 = 全部 + 字典里的标签（名称与顺序以后端字典为准） */
const tagOptions = computed(() => [
  ALL_FILTER,
  ...readTagDict().map((it) => ({ value: it.key, label: it.label }))
]);

const listEnd = computed(() =>
  loadingMore.value ? '正在加载…' : hasNext.value ? '上拉加载更多' : `共 ${total.value} 条笔记`
);

/**
 * mode='reset'：第 1 页（首次 / 切标签 / 下拉刷新）
 * mode='more' ：下一页（上拉加载）
 * ★ 按「目标页」请求，成功后才把页码落库，失败时不会漏掉一页。
 */
async function load(mode: 'reset' | 'more' = 'reset') {
  const targetPage = mode === 'reset' ? 1 : pageNum.value + 1;
  if (mode === 'reset') loading.value = true;
  else loadingMore.value = true;

  // 标签字典兜底：App.onLaunch 已拉过 → 这里直接返回，不发请求；
  // 若冷启动那次失败，进本页会再试一次。不阻塞列表。
  ensureTagDict().catch(() => {});

  try {
    const res = await pageRecords({
      // 「全部」不下发 label，后端不过滤
      label: activeTag.value === 'all' ? undefined : activeTag.value,
      pageNum: targetPage,
      pageSize: DEFAULT_PAGE_SIZE
    });
    const list = res.list || [];
    notes.value = mode === 'reset' ? list : notes.value.concat(list);
    total.value = res.total ?? notes.value.length;
    hasNext.value = !!res.hasNext;
    pageNum.value = targetPage;
  } catch (e) {
    uni.showToast({ title: errorMessage(e, '加载失败'), icon: 'none' });
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

/** 上拉加载：只有后端说 hasNext 才加一页 */
function loadMore() {
  if (loading.value || loadingMore.value || !hasNext.value) return;
  load('more');
}

function switchTag(v: string) {
  if (activeTag.value === v) return;
  activeTag.value = v;
  load();
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
}

function goCreate() {
  uni.navigateTo({ url: '/pages/editor/editor' });
}

function onLongPress(note: RecordVO) {
  uni.showActionSheet({
    itemList: ['删除笔记'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) confirmDelete(note);
    }
  });
}

async function confirmDelete(note: RecordVO) {
  uni.showModal({
    title: '删除笔记',
    content: `「${note.title || '无标题'}」将被永久删除，无法恢复。`,
    confirmText: '删除',
    confirmColor: '#EF4444',
    success: async ({ confirm }) => {
      if (!confirm) return;
      try {
        await deleteRecord(note.id);
        notes.value = notes.value.filter((x) => x.id !== note.id);
        uni.showToast({ title: '已删除', icon: 'none' });
      } catch (e) {
        uni.showToast({ title: errorMessage(e, '删除失败'), icon: 'none' });
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

// 触底加载下一页
onReachBottom(loadMore);
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
</style>

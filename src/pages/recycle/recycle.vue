<template>
  <view class="page" :class="{ 'theme-dark': theme === 'dark' }">
    <!-- 首屏骨架（沿用列表页语言） -->
    <view v-if="loading && !notes.length" class="skeleton-wrap">
      <view v-for="i in 3" :key="i" class="skeleton-card">
        <view class="sk-line sk-title" />
        <view class="sk-line" />
        <view class="sk-line sk-short" />
      </view>
    </view>

    <!-- 空态：安静不催促（这是歇脚处，不是垃圾场） -->
    <EmptyState
      v-else-if="!notes.length"
      emoji="🌙"
      title="回收站是空的"
      desc="删除的笔记会先在这里歇一歇，你随时可以把它们找回来"
    />

    <view v-else class="list">
      <RecycleCard
        v-for="n in notes"
        :key="n.id"
        :note="n"
        @restore="onRestore"
        @purge="onPurge"
      />
      <text class="list-end">{{ listEnd }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app';
import EmptyState from '@/components/EmptyState.vue';
import RecycleCard from '@/components/RecycleCard.vue';
import { recyclePage, restoreRecord, purgeRecord, DEFAULT_PAGE_SIZE } from '@/api';
import type { RecordVO } from '@/api';
import { errorMessage } from '@/utils/errorMessage';
import { useTheme, applyChrome } from '@/utils/store/theme';

const theme = useTheme();
const notes = ref<RecordVO[]>([]);
const loading = ref(false);       // 首屏 / 下拉刷新
const loadingMore = ref(false);   // 上拉加载下一页
const mutating = ref(false);      // 防连点：恢复/彻底删除进行中

/** 分页状态（后端统一契约：hasNext 决定还能不能上拉） */
const pageNum = ref(1);
const total = ref(0);
const hasNext = ref(false);

const listEnd = computed(() =>
  loadingMore.value ? '正在加载…' : hasNext.value ? '上拉加载更多' : `共 ${total.value} 条已回收`
);

/**
 * mode='reset'：第 1 页（首次 / 下拉刷新）；mode='more'：下一页（上拉加载）。
 * 按「目标页」请求，成功后才把页码落库，失败不会漏掉一页。
 */
async function load(mode: 'reset' | 'more' = 'reset') {
  const targetPage = mode === 'reset' ? 1 : pageNum.value + 1;
  if (mode === 'reset') loading.value = true;
  else loadingMore.value = true;

  try {
    const res = await recyclePage({ pageNum: targetPage, pageSize: DEFAULT_PAGE_SIZE });
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

function loadMore() {
  if (loading.value || loadingMore.value || !hasNext.value) return;
  load('more');
}

/** 恢复可逆，无需确认；成功后从列表移除，笔记回到主列表 */
async function onRestore(note: RecordVO) {
  if (mutating.value) return;
  mutating.value = true;
  try {
    await restoreRecord(note.id);
    notes.value = notes.value.filter((x) => x.id !== note.id);
    total.value = Math.max(0, total.value - 1);
    uni.showToast({ title: '已恢复', icon: 'success' });
  } catch (e) {
    uni.showToast({ title: errorMessage(e, '恢复失败'), icon: 'none' });
  } finally {
    mutating.value = false;
  }
}

/** 彻底删除不可逆，必须确认；confirmColor 用 hex：原生 API 参数不吃 CSS 变量（同 list 页先例） */
function onPurge(note: RecordVO) {
  if (mutating.value) return;
  uni.showModal({
    title: '彻底删除',
    content: `「${note.title || '无标题'}」将从回收站永久删除，图片也会一并清除，无法恢复。`,
    confirmText: '彻底删除',
    confirmColor: '#EF4444',
    success: async ({ confirm }) => {
      if (!confirm) return;
      mutating.value = true;
      try {
        await purgeRecord(note.id);
        notes.value = notes.value.filter((x) => x.id !== note.id);
        total.value = Math.max(0, total.value - 1);
        uni.showToast({ title: '已彻底删除', icon: 'none' });
      } catch (e) {
        uni.showToast({ title: errorMessage(e, '删除失败'), icon: 'none' });
      } finally {
        mutating.value = false;
      }
    }
  });
}

onShow(() => {
  applyChrome(theme.value);
  load();
});

onPullDownRefresh(async () => {
  await load();
  uni.stopPullDownRefresh();
});

onReachBottom(loadMore);
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  /* 页面元素背景不随根节点 theme-dark 变，根 view 自涂背景遮住 */
  background-color: var(--bg-page);
  padding-bottom: $space-8;
}

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

/* 骨架屏（沿用列表页语言） */
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

  &.sk-title {
    width: 55%;
    height: 34rpx;
  }

  &.sk-short {
    width: 35%;
    margin-bottom: 0;
  }
}

@keyframes shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>

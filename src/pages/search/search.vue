<template>
  <view class="page">
    <!-- 搜索框 -->
    <view class="searchbar">
      <Icon name="search" :size="34" color="var(--text-tertiary)" />
      <input
        v-model="keyword"
        class="input"
        type="text"
        placeholder="搜索笔记内容"
        placeholder-class="ph"
        confirm-type="search"
        :focus="autoFocus"
        aria-label="搜索关键词"
        @input="onInput"
        @confirm="doSearch"
      />
      <view
        v-if="keyword"
        class="clear touch-target"
        role="button"
        aria-label="清空关键词"
        @tap="clear"
      >
        <Icon name="close" :size="26" color="var(--text-tertiary)" />
      </view>
    </view>

    <!-- 搜索历史 / 提示（未搜索时）-->
    <view v-if="!searched" class="idle">
      <text class="idle-tip">输入关键词，在标题与正文中搜索</text>
      <view class="note">
        <text class="note-title">搜索说明</text>
        <text class="note-item">· 中文搜索走服务端（MySQL 全文索引）</text>
        <text class="note-item">· 输入至少 2 个字效果最佳</text>
        <text class="note-item">· 高亮由服务端返回，前端只渲染</text>
      </view>
    </view>

    <!-- 无结果 -->
    <EmptyState
      v-else-if="!loading && !results.length"
      emoji="🔍"
      title="没有找到相关笔记"
      desc="换个关键词试试"
    />

    <!-- 结果 -->
    <view v-else class="results">
      <text class="count">找到 {{ total }} 条</text>
      <view
        v-for="n in results"
        :key="n.id"
        class="result"
        role="button"
        :aria-label="`笔记：${n.title || '无标题'}`"
        @tap="goDetail(n.id)"
      >
        <!-- highlights 由服务端生成，只接受 <span class="hl"> 单个标签 -->
        <rich-text v-if="n.highlights" class="r-title" :nodes="n.highlights.title || n.title" />
        <text v-else class="r-title">{{ n.title || '无标题' }}</text>

        <rich-text
          v-if="n.highlights"
          class="r-excerpt"
          :nodes="n.highlights.excerpt || n.excerpt"
        />
        <text v-else class="r-excerpt">{{ n.excerpt }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import EmptyState from '@/components/EmptyState.vue';
import Icon from '@/components/Icon.vue';
import { search } from '@/api';
import type { SearchHit } from '@/api';
import { errorMessage } from '@/utils/errorMessage';

const keyword = ref('');
const results = ref<SearchHit[]>([]);
const total = ref(0);
const searched = ref(false);
const loading = ref(false);
const autoFocus = ref(true);

onLoad(() => {
  autoFocus.value = true;
});

/** 防抖：输入时自动搜索 */
let timer: ReturnType<typeof setTimeout> | null = null;
function onInput() {
  if (timer) clearTimeout(timer);
  if (!keyword.value.trim()) {
    searched.value = false;
    results.value = [];
    return;
  }
  timer = setTimeout(doSearch, 400);
}

async function doSearch() {
  const q = keyword.value.trim();
  if (!q) return;

  loading.value = true;
  searched.value = true;
  try {
    const res = await search({ q });
    results.value = res.list || [];
    total.value = res.total ?? results.value.length;
  } catch (e) {
    uni.showToast({ title: errorMessage(e, '搜索失败'), icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function clear() {
  keyword.value = '';
  results.value = [];
  searched.value = false;
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $space-4;
}

.searchbar {
  display: flex;
  align-items: center;
  gap: $space-2;
  background: var(--bg-surface);
  border-radius: $radius-full;
  padding: 0 $space-4;
  height: 88rpx;
  box-shadow: var(--shadow-sm);
}

.input {
  flex: 1;
  font-size: $text-base;
  color: var(--text-primary);
  height: 88rpx;
}

.ph {
  color: var(--text-disabled);
  font-size: $text-sm;
}

.clear {
  flex: none;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 空闲态 */
.idle {
  padding: $space-6 0;
}

.idle-tip {
  display: block;
  font-size: $text-sm;
  color: var(--text-secondary);
  margin-bottom: $space-5;
}

.note {
  background: var(--bg-surface);
  border-radius: $radius-lg;
  padding: $space-4;
}

.note-title {
  display: block;
  font-size: $text-sm;
  font-weight: $font-medium;
  color: var(--text-primary);
  margin-bottom: $space-2;
}

.note-item {
  display: block;
  font-size: $text-xs;
  color: var(--text-secondary);
  line-height: 1.9;
}

/* 结果 */
.results {
  padding-top: $space-3;
}

.count {
  display: block;
  font-size: $text-xs;
  color: var(--text-tertiary);
  margin-bottom: $space-3;
}

.result {
  background: var(--bg-surface);
  border-radius: $radius-lg;
  padding: $space-4;
  margin-bottom: $space-3;
  box-shadow: var(--shadow-sm);
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.98);
  }
}

.r-title {
  display: block;
  font-size: $text-base;
  font-weight: $font-medium;
  color: var(--text-primary);
  margin-bottom: $space-2;
  line-height: $leading-tight;
}

.r-excerpt {
  display: block;
  font-size: $text-sm;
  color: var(--text-secondary);
  line-height: $leading-normal;
}
</style>

<!-- rich-text 高亮样式需非 scoped -->
<style lang="scss">
.hl {
  background: #FEF08A;
  color: #232329;
  border-radius: 4rpx;
  padding: 0 4rpx;
  font-weight: 500;
}
</style>

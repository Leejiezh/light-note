<template>
  <view
    class="note-card"
    role="button"
    :aria-label="`笔记：${note.title || '无标题'}`"
    @tap="$emit('open', note.id)"
    @longpress="$emit('longpress', note)"
  >
    <view class="card-head">
      <!-- 置顶是纯视觉提示（Icon 组件自带 aria-hidden），卡片语义由根节点 aria-label 提供 -->
      <Icon v-if="note.pinned" name="pin" :size="28" color="var(--brand-500)" />
      <text class="title ellipsis">{{ note.title || '无标题' }}</text>
    </view>

    <text class="excerpt ellipsis-2">{{ note.excerpt || '（空笔记）' }}</text>

    <view class="card-foot">
      <text v-if="note.tag && note.tag !== 'all'" class="tag">{{ tagLabel }}</text>
      <text class="time">{{ relTime }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Icon from '@/components/Icon.vue';
import type { NoteListItem } from '@/api';

const props = defineProps<{
  note: NoteListItem;
}>();

defineEmits<{
  (e: 'open', id: string): void;
  (e: 'longpress', note: NoteListItem): void;
}>();

const TAG_LABELS: Record<string, string> = {
  work: '工作',
  design: '设计',
  tech: '技术',
  life: '生活',
  all: '全部'
};

const tagLabel = computed(() => TAG_LABELS[props.note.tag] || props.note.tag);

/** 相对时间 */
const relTime = computed(() => {
  const t = props.note.updatedAt;
  if (!t) return '';
  const diff = Date.now() - t;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  if (diff < min) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;

  const d = new Date(t);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
});
</script>

<style lang="scss" scoped>
.note-card {
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

.card-head {
  display: flex;
  align-items: center;
  gap: $space-1;
  margin-bottom: $space-2;
}

.title {
  flex: 1;
  font-size: $text-base;
  font-weight: $font-medium;
  color: var(--text-primary);
  line-height: $leading-tight;
}

.excerpt {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: $text-sm;
  color: var(--text-secondary);
  line-height: $leading-normal;
  margin-bottom: $space-3;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
}

.tag {
  font-size: $text-xs;
  color: $brand-600;
  background: $brand-50;
  padding: 4rpx 14rpx;
  border-radius: $radius-full;
}

.time {
  font-size: $text-xs;
  color: var(--text-tertiary);
  margin-left: auto;
}
</style>

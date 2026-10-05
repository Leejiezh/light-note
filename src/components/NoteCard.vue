<template>
  <view
    class="note-card"
    role="button"
    :aria-label="`笔记：${note.title || '无标题'}`"
    @tap="$emit('open', note.id)"
    @longpress="$emit('longpress', note)"
  >
    <view class="card-head">
      <text class="title ellipsis">{{ note.title || '无标题' }}</text>
    </view>

    <text class="excerpt ellipsis-2">{{ excerpt || '（空笔记）' }}</text>

    <view class="card-foot">
      <text
        v-if="note.label && note.label !== 'all'"
        class="tag"
        :style="{ color: tagColors.color, background: tagColors.background }"
      >
        {{ tagLabel }}
      </text>
      <text class="time">{{ relTime }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RecordVO } from '@/api';
import { readTagLabel, readTagColors } from '@/utils/store/tags';

const props = defineProps<{
  note: RecordVO;
}>();

defineEmits<{
  (e: 'open', id: string): void;
  (e: 'longpress', note: RecordVO): void;
}>();

/** 摘要：content 归并空白（与后端列表 excerpt 同一规则） */
const excerpt = computed(() => (props.note.content || '').replace(/\s+/g, ' ').trim());

/** 标签名与配色统一来自字典（GET /dict/note_label） */
const tagLabel = computed(() => readTagLabel(props.note.label));
const tagColors = computed(() => readTagColors(props.note.label));

/** 相对时间（updatedAt 是 ISO 串，先转时间戳） */
const relTime = computed(() => {
  const t = Date.parse(props.note.updatedAt);
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
  /* 文字色与底色由字典配色内联给出（见 tagColors），避免两处色值来源 */
  padding: 4rpx 14rpx;
  border-radius: $radius-full;
}

.time {
  font-size: $text-xs;
  color: var(--text-tertiary);
  margin-left: auto;
}
</style>

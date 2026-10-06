<template>
  <view class="recycle-card" role="group" :aria-label="`已回收笔记：${note.title || '无标题'}`">
    <!-- 状态眉：回收期限倒计时（随期限临近升级） + 标签（认领笔记） -->
    <view class="card-head">
      <text class="status" :class="{ 'is-warn': status.tone === 'warn', 'is-danger': status.tone === 'danger' }">
        {{ status.text }}
      </text>
      <text
        v-if="note.label && note.label !== 'all'"
        class="tag"
        :style="{ color: tagColors.color, background: tagColors.background }"
      >
        {{ tagLabel }}
      </text>
    </view>

    <!-- 沉睡态标题/摘要：静置灰，区别于主列表的「活」笔记 -->
    <text class="title ellipsis">{{ note.title || '无标题' }}</text>
    <text class="excerpt ellipsis-2">{{ excerpt || '（空笔记）' }}</text>

    <!-- 动作：恢复是主角（品牌胶囊），彻底删除是次操作（安静红色文字） -->
    <view class="card-foot">
      <view class="restore touch-target" role="button" aria-label="恢复这篇笔记" @tap="$emit('restore', note)">
        <text class="restore-text">恢复</text>
      </view>
      <view class="purge touch-target" role="button" aria-label="彻底删除这篇笔记" @tap="$emit('purge', note)">
        <text class="purge-text">彻底删除</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RecordVO } from '@/api';
import { readTagLabel, readTagColors } from '@/utils/store/tags';

/**
 * 回收站保留期限（天）：到期由后端定时任务彻底删除。
 * 当前后端清理任务未实现，前端默认 15 天；后端定稿后应改为从契约/配置读取，避免漂移。
 */
const RECYCLE_RETENTION_DAYS = 15;

const props = defineProps<{
  note: RecordVO;
}>();

defineEmits<{
  (e: 'restore', note: RecordVO): void;
  (e: 'purge', note: RecordVO): void;
}>();

/** 摘要：content 归并空白（与列表页同一规则） */
const excerpt = computed(() => (props.note.content || '').replace(/\s+/g, ' ').trim());

/** 标签名与配色统一来自字典 */
const tagLabel = computed(() => readTagLabel(props.note.label));
const tagColors = computed(() => readTagColors(props.note.label));

/**
 * 回收期限倒计时：recycledAt + 保留期 − now。
 * 按「自然日」取整（同一天到期=今天），随期限临近升级文案与颜色。
 */
const status = computed<{ text: string; tone: 'neutral' | 'warn' | 'danger' }>(() => {
  const recycled = Date.parse(props.note.recycledAt || '');
  if (!recycled) return { text: '已回收', tone: 'neutral' };

  const deadline = new Date(recycled + RECYCLE_RETENTION_DAYS * 24 * 3600 * 1000);
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysLeft = Math.round((dayStart(deadline) - dayStart(new Date())) / (24 * 3600 * 1000));

  if (daysLeft <= 0) return { text: '今天彻底删除', tone: 'danger' };
  if (daysLeft === 1) return { text: '明天彻底删除', tone: 'warn' };
  if (daysLeft <= 3) return { text: `剩 ${daysLeft} 天`, tone: 'warn' };
  return { text: `剩 ${daysLeft} 天`, tone: 'neutral' };
});
</script>

<style lang="scss" scoped>
.recycle-card {
  background: var(--bg-surface);
  border-radius: $radius-lg;
  padding: $space-4;
  margin-bottom: $space-3;
  box-shadow: var(--shadow-sm);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  margin-bottom: $space-2;
}

/* 倒计时：软底小胶囊，临近期限时文字升级为警示/错误色 */
.status {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: $radius-full;
  background: var(--bg-muted);
  color: var(--text-tertiary);
  font-size: $text-xs;

  &.is-warn {
    color: var(--semantic-warning);
  }

  &.is-danger {
    color: var(--semantic-error);
  }
}

.tag {
  font-size: $text-xs;
  padding: 4rpx 14rpx;
  border-radius: $radius-full;
  /* 文字色与底色由字典配色内联给出 */
}

.title {
  display: block;
  font-size: $text-base;
  font-weight: $font-medium;
  /* 沉睡态：非主色，视觉上「睡着」 */
  color: var(--text-secondary);
  line-height: $leading-tight;
  margin-bottom: $space-1;
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
  border-top: 2rpx solid var(--border-default);
  padding-top: $space-2;
}

/* 恢复：主角，品牌胶囊（touch-target 保证 88rpx 触摸目标） */
.restore {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 $space-5;
  border-radius: $radius-full;
  background: var(--brand-50);
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.95);
  }
}

.restore-text {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: var(--brand-500);
}

/* 彻底删除：次操作，安静的错误色文字 */
.purge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 $space-2;
  transition: opacity $duration-fast ease;

  &:active {
    opacity: 0.6;
  }
}

.purge-text {
  font-size: $text-sm;
  color: var(--semantic-error);
}
</style>

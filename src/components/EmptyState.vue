<template>
  <view class="empty" role="status">
    <text class="emoji" aria-hidden="true">{{ emoji }}</text>
    <text class="title">{{ title }}</text>
    <text v-if="desc" class="desc">{{ desc }}</text>
    <view
      v-if="actionText"
      class="action touch-target"
      role="button"
      :aria-label="actionText"
      @tap="$emit('action')"
    >
      <text>{{ actionText }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  emoji: { type: String, default: '📝' },
  title: { type: String, default: '还没有内容' },
  desc: { type: String, default: '' },
  actionText: { type: String, default: '' }
});

defineEmits(['action']);
</script>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-10 $space-6;
  text-align: center;
}

.emoji {
  font-size: 96rpx;
  margin-bottom: $space-3;
  opacity: 0.6;
}

.title {
  font-size: $text-base;
  font-weight: $font-medium;
  color: var(--text-primary);
  margin-bottom: $space-2;
}

.desc {
  font-size: $text-sm;
  color: var(--text-secondary);
  line-height: $leading-normal;
  margin-bottom: $space-4;
}

.action {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 $space-5;
  height: 88rpx;
  background: $brand-500;
  color: #fff;
  font-size: $text-sm;
  font-weight: $font-medium;
  border-radius: $radius-full;
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.96);
  }
}
</style>

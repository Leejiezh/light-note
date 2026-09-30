<template>
  <view class="todo-list">
    <view
      v-for="(todo, ti) in items"
      :key="ti"
      class="todo-item"
      :class="{ 'is-checked-row': todo.checked }"
      role="checkbox"
      :aria-checked="String(todo.checked)"
      :aria-label="`${todo.text}，${todo.checked ? '已完成' : '未完成'}`"
      @tap="$emit('toggle', ti)"
    >
      <view class="todo-box" :class="{ 'is-checked': todo.checked }">
        <view v-if="todo.checked" class="todo-check">✓</view>
      </view>
      <text class="todo-text" :class="{ 'is-done': todo.checked }">{{ todo.text }}</text>
    </view>
  </view>
</template>

<script setup>
/**
 * 待办列表组件
 * 对应 uniapp-adaptation.md §3.3
 *
 * ⚠️ 为什么待办不用 rich-text 渲染：
 *    微信小程序 rich-text 内部屏蔽所有节点事件，
 *    放进去就无法点击勾选。必须用原生组件。
 */
defineProps({
  /** [{ text: string, checked: boolean }] */
  items: { type: Array, default: () => [] }
});

defineEmits(['toggle']);
</script>

<style lang="scss" scoped>
.todo-list {
  margin: 0 0 $space-4;
}

/* 触摸目标 ≥ 88rpx（44px），可用性硬要求 */
.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  padding: 14rpx 0;
  min-height: $touch-target-min;
  box-sizing: border-box;
}

.todo-box {
  flex: none;
  width: 34rpx;
  height: 34rpx;
  margin-top: 4rpx;
  border-radius: 10rpx;
  border: 3rpx solid $gray-300;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 只动画 transform / opacity，GPU 加速 */
  transition: transform $duration-fast $ease-spring,
              border-color $duration-fast ease,
              background-color $duration-fast ease;
}

.todo-box.is-checked {
  border-color: $brand-500;
  background: $brand-500;
}

.todo-check {
  color: #fff;
  font-size: 22rpx;
  font-weight: $font-bold;
}

.todo-text {
  flex: 1;
  line-height: 1.65;
  font-size: 31rpx;
  color: $gray-900;
  transition: opacity $duration-fast ease;
}

.todo-text.is-done {
  text-decoration: line-through;
  opacity: 0.5;
}
</style>

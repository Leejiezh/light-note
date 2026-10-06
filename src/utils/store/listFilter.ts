// ============================================================
// 轻记 · 首页筛选小桥（跨页指定首页标签筛选）
//
// 微信 switchTab 不能带 query 参数，跨页跳首页时没法直接把
// 「要按哪个标签筛选」传过去。这里用一个模块级响应式值做桥：
//   - 来源页（我的页标签 chip）跳转前调用 requestFilter(label)
//   - 首页 onShow 时 consumePendingFilter() 读一次并清除
// 「读一次即清」保证：不消费就丢弃，不会把上个会话的筛选带到下个展示。
// ============================================================

import { ref } from 'vue';

/** 待应用的首页标签筛选（字典 key；'all' 表示不过滤） */
const pending = ref<string | undefined>(undefined);

/** 跳转首页前登记要应用的标签筛选 */
export function requestFilter(label: string | undefined): void {
  pending.value = label;
}

/** 首页 onShow 时消费：读到一次就清掉，避免残留影响后续展示 */
export function consumePendingFilter(): string | undefined {
  const label = pending.value;
  pending.value = undefined;
  return label;
}

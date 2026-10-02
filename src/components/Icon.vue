<template>
  <!--
    图标组件 ★

    为什么直接输出字形字符而不是用 ::before + class：
      小程序端自定义组件默认「样式隔离」（styleIsolation: isolated），
      app.wxss 里的 .ln-icon-xxx::before { content } 进不到组件内部，
      图标会显示成方块；而 H5 没有隔离概念，两种写法都正常——
      这正是「H5 通过 ≠ 小程序通过」的典型坑。
      所以这里把字形字符直接渲染到 text 节点里，font-family 用内联样式写死：
      内联样式 + 组件自身样式不受隔离影响，两端表现一致。

    为什么要 aria-hidden：
      图标是纯视觉元素，语义由调用方在外层按钮/行上提供 aria-label；
      否则读屏会把私用区字符念出来。
  -->
  <text class="ln-icon" :style="styleObj" aria-hidden="true">{{ glyphChar }}</text>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * 图标名 → 字体码点
 *
 * ⚠️ 必须与 src/styles/iconfont.scss 头部注释的码点表保持一致；
 *    字形来源是 src/static/fonts/lnicon.ttf（Remixicon 子集）。
 *    新增图标三步：子集字体加码点 → iconfont.scss 注释同步 → 这里加映射。
 */
const ICONS: Record<string, number> = {
  // 主导航语义（tabBar 用 png，此处用于页面内呼应）
  note: 0xf19b,
  tag: 0xf023,
  search: 0xf0d1,
  user: 0xf264,

  // 交互
  plus: 0xea13,
  chevron: 0xea6e,
  close: 0xeb99,
  check: 0xeb7b,

  // 设置项
  trash: 0xec2a,
  image: 0xee4b,
  info: 0xee59,
  moon: 0xef75,
  sun: 0xf1bf,
  edit: 0xefe0,
  location: 0xef14,
  mail: 0xeef6,

  // 内容标记
  pin: 0xf039
};

const props = defineProps<{
  /** 图标名（见上面 ICONS 的键） */
  name: string;
  /**
   * 尺寸：传数字按 rpx 处理；也可直接传 '32rpx' / '16px'
   * 默认 32rpx（= 16px），与 $text-base 一致
   */
  size?: number | string;
  /**
   * 颜色：默认「继承父级文字色」（currentColor 继承不受样式隔离影响）。
   * 需要指定时建议传 CSS 变量（如 'var(--text-tertiary)'），
   * 以内联样式写入，两端都可靠。
   */
  color?: string;
}>();

const glyphChar = computed(() => {
  const cp = ICONS[props.name];
  if (!cp) {
    console.warn(`[Icon] 未知图标名 "${props.name}"，可用：${Object.keys(ICONS).join(' / ')}`);
    return '';
  }
  return String.fromCodePoint(cp);
});

const styleObj = computed<Record<string, string>>(() => {
  const s: Record<string, string> = {
    // 内联写死字体族：样式隔离下全局类不可靠，内联最稳
    fontFamily: 'lnicon',
    fontSize: typeof props.size === 'number' ? `${props.size}rpx` : props.size || '32rpx'
  };
  if (props.color) s.color = props.color;
  return s;
});
</script>

<style lang="scss" scoped>
/*
 * 组件自身样式不受样式隔离影响，这里的排版约束是可靠的。
 * 字体声明（@font-face）在 iconfont.scss 全局引入一次即可——
 * @font-face 是字体注册不是选择器规则，不受隔离限制。
 */
.ln-icon {
  display: inline-block;
  flex: none; /* 放进 flex 行时不参与收缩 */
  text-align: center;
  line-height: 1;
}
</style>

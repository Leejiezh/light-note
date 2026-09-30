<script setup>
import { onLaunch, onShow } from '@dcloudio/uni-app';

onLaunch(() => {
  // 读取主题设置（暗色模式）
  const theme = uni.getStorageSync('theme') || 'light';
  applyTheme(theme);
});

onShow(() => {
  // 应用回到前台时的处理
});

/** 应用主题：切换 page 上的 class */
function applyTheme(theme) {
  // #ifdef H5
  document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  // #endif
  // #ifdef MP-WEIXIN
  // 小程序端通过页面根节点 class 切换，见各页面的 pageClass
  // #endif
}
</script>

<style lang="scss">
@import '@/styles/global.scss';
</style>

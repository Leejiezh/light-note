<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { ensureLogin } from '@/api';

onLaunch(() => {
  // 读取主题设置（暗色模式）：getStorageSync 返回 unknown，只认 'dark'，其余一律 light
  const theme = uni.getStorageSync('theme') === 'dark' ? 'dark' : 'light';
  applyTheme(theme);

  // 静默登录：wx.login 无需用户授权；失败不阻塞启动（后续 401 会自动重登）
  ensureLogin().catch(() => {});
});

onShow(() => {
  // 应用回到前台时的处理
});

/** 应用主题：切换 page 上的 class */
function applyTheme(theme: string) {
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
/* 图标字体（lnicon）：须全局引入一次，@font-face 才会在两端生效 */
@import '@/styles/iconfont.scss';
</style>

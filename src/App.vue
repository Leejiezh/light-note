<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';
import { ensureLogin } from '@/api';
import { getTheme, onThemeChange } from '@/utils/store/theme';
import type { ThemeMode } from '@/utils/store/theme';
import { ensureTagDict } from '@/utils/store/tags';

onLaunch(() => {
  // 读取主题设置（暗色模式）：统一走 utils/store/theme，
  // 不再各处直接读 storage —— 主题还被「我的」页外观开关与标签取色消费。
  // H5 由本文件切根节点 class；小程序端由各页面根节点 theme-dark class + onShow applyChrome 接管。
  applyH5Theme(getTheme());
  // 主题在运行期切换时，H5 根节点实时跟随（小程序端为空操作，主题由页面自身订阅）
  onThemeChange(applyH5Theme);

  // 静默登录：wx.login 无需用户授权；失败不阻塞启动（后续 401 会自动重登）
  ensureLogin().catch(() => {});

  // 标签字典：冷启动拉一次 GET /dict/note_label 并落缓存，
  // 之后整个运行期只读缓存 —— 切标签 / 进详情页不再重复打接口。
  // 注：onLaunch 只在冷启动执行，切后台回前台不触发（那正是我们想要的）。
  ensureTagDict().catch(() => {});
});

onShow(() => {
  // 应用回到前台时的处理
});

/**
 * H5 端应用主题：切换根节点 class。
 * 小程序端无需任何全局 DOM 操作：page 元素无法动态挂 class，
 * 内容主题由各页面根节点 theme-dark class 绑定，原生 chrome（导航栏/窗口/tabBar）
 * 由各页 onShow 的 applyChrome() 接管。
 */
function applyH5Theme(theme: ThemeMode) {
  // #ifdef H5
  document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  // #endif
  // #ifdef MP-WEIXIN
  // MP：内容由页面根节点 class + applyChrome 接管，这里留空
  // #endif
}
</script>

<style lang="scss">
@import '@/styles/global.scss';
/* 图标字体（lnicon）：须全局引入一次，@font-face 才会在两端生效 */
@import '@/styles/iconfont.scss';
</style>

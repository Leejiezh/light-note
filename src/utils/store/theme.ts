// ============================================================
// 轻记 · 主题（浅色 / 暗色）状态
//
// 为什么独立成文件而不是各处 read storage：
//   主题现在被多处消费 —— App.vue（切根节点 class）、「我的」页（外观开关）、
//   各页面（根节点 theme-dark class + 原生导航栏/窗口/tabBar 色）、
//   以及标签取色（后端给 light / dark 两套色值，要按当前主题选）。
//   各处分别读存储会导致「切了主题、颜色没跟上」，所以收敛成单一来源：
//   读取同步，写入时广播给订阅者。
//
// ★ 模块顶层不碰 uni（只在函数调用时用），静态 import 安全，
//   单测无需预先装 shim 也不会崩。
//   useTheme() 是响应式入口，只在 <script setup>（或 effectScope 测试）里调用。
// ============================================================

import { ref, onScopeDispose, type Ref } from 'vue';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark';

/** 存储键 */
export const THEME_KEY = 'theme';

/** 订阅者（写入时同步通知） */
const listeners = new Set<(mode: ThemeMode) => void>();

/** 读当前主题（同步，任何时候都能拿到可用值） */
export function getTheme(): ThemeMode {
  try {
    // getStorageSync 返回 unknown：只认 'dark'，其余一律 light
    return uni.getStorageSync(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch (e) {
    // 存储不可用（极端隐私模式）→ 回落浅色，不打断页面
    return 'light';
  }
}

/** 写主题（写存储 + 通知订阅者；返回值即归一化后的主题，便于调用方直接落 ref） */
export function setTheme(mode: unknown): ThemeMode {
  const next: ThemeMode = mode === 'dark' ? 'dark' : 'light';
  try {
    uni.setStorageSync(THEME_KEY, next);
  } catch (e) {
    // 写失败不回滚：内存态已经生效，界面先跟着走，避免开关点了没反应
  }
  listeners.forEach((fn) => fn(next));
  return next;
}

/** 订阅主题变化，返回取消订阅函数 */
export function onThemeChange(fn: (mode: ThemeMode) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ------------------------------------------------------------
// 原生 chrome（导航栏 / 窗口背景 / tabBar）配色
//
// 这些真实色值是 AGENTS.md「不硬编码颜色」的刻意例外：原生 API
// （setNavigationBarColor / setBackgroundColor / setTabBarStyle）只吃真实色值，
// CSS 变量喂不进去，所以集中收敛在 chromeFor() 一处，并在注释里标明与
// global.scss 令牌的对应关系，页面里不得再散落硬编码。
// ------------------------------------------------------------

/** 原生 chrome 配色（light / dark 两套） */
export interface ChromeTheme {
  /** setNavigationBarColor.backgroundColor（= --bg-page） */
  navBg: string;
  /** setNavigationBarColor.frontColor：原生仅支持 #ffffff / #000000 */
  navFront: string;
  /** setBackgroundColor.backgroundColor（= --bg-page，含下拉刷新区） */
  windowBg: string;
  /** tabBar 文字（= --text-secondary） */
  tabColor: string;
  /** tabBar 选中（= --brand-500） */
  tabSelected: string;
  /** tabBar 背景（= --bg-surface） */
  tabBg: string;
  /** setTabBarStyle.borderStyle：原生仅支持 black / white */
  tabBorder: 'black' | 'white';
}

/** 主题对应的原生 chrome 配色（值镜像 global.scss 令牌） */
export function chromeFor(mode: ThemeMode): ChromeTheme {
  return mode === 'dark'
    ? {
        navBg: '#16161A',
        navFront: '#ffffff',
        windowBg: '#16161A',
        tabColor: '#A8A8B4',
        tabSelected: '#A98BFF',
        tabBg: '#232329',
        tabBorder: 'white'
      }
    : {
        navBg: '#FFFFFF',
        navFront: '#000000',
        windowBg: '#F7F7FA',
        tabColor: '#5A5A66',
        tabSelected: '#7C3AED',
        tabBg: '#FFFFFF',
        tabBorder: 'black'
      };
}

/**
 * 应用原生 chrome（导航栏 / 窗口背景 / tabBar）。
 * 仅 MP-WEIXIN 下生效；H5 / 其它端为空操作。
 * 由各页面 onShow 调用（保证进页 / 回页 / 切 tab 都对），mine 页切主题后立即再调一次。
 */
export function applyChrome(mode: ThemeMode): void {
  // #ifdef MP-WEIXIN
  const c = chromeFor(mode);
  // uni 类型定义里这三个方法返回 Promise（实际是回调风格），设置类调用无需等待，void 显式忽略
  void uni.setNavigationBarColor({ frontColor: c.navFront, backgroundColor: c.navBg });
  // backgroundColorTop/Bottom 管 iOS 顶部/底部窗口背景（安卓忽略），暗色下与窗口背景一致
  void uni.setBackgroundColor({
    backgroundColor: c.windowBg,
    backgroundColorTop: c.windowBg,
    backgroundColorBottom: c.windowBg
  });
  void uni.setTabBarStyle({
    color: c.tabColor,
    selectedColor: c.tabSelected,
    backgroundColor: c.tabBg,
    borderStyle: c.tabBorder
  });
  // #endif
}

/**
 * 页面响应式主题：懒初始化（getTheme）+ 订阅 onThemeChange 同步 + 组件卸载退订。
 * 返回的 ref 供模板绑 `theme-dark` class 用；只应在 <script setup> 里调用。
 */
export function useTheme(): Ref<ThemeMode> {
  const theme = ref<ThemeMode>(getTheme());
  const off = onThemeChange((mode) => {
    theme.value = mode;
  });
  onScopeDispose(off);
  return theme;
}

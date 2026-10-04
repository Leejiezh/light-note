// ============================================================
// 轻记 · 主题（浅色 / 暗色）状态
//
// 为什么独立成文件而不是各处 read storage：
//   主题现在被多处消费 —— App.vue（切根节点 class）、「我的」页（外观开关），
//   以及标签取色（后端给 light / dark 两套色值，要按当前主题选）。
//   各处分别读存储会导致「切了主题、颜色没跟上」，所以收敛成单一来源：
//   读取同步，写入时广播给订阅者。
//
// ★ 模块顶层不碰 uni（只在函数调用时用），静态 import 安全，
//   单测无需预先装 shim 也不会崩。
// ============================================================

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

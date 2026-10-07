// 主题存储层 + 原生 chrome 配色 + 页面响应式主题（useTheme）单元测试
// vitest 运行，不依赖 uni-app 环境。
//
// theme.ts 顶层不碰 uni，静态 import 安全；useTheme 用 effectScope 包裹（onScopeDispose 需要活动作用域）。
// ★ applyChrome 在 vitest 里不经过 uni 预处理器，#ifdef 注释原样保留、函数体会执行，
//   所以 uni 需额外 mock setNavigationBarColor / setBackgroundColor / setTabBarStyle。
import { it, expect, vi } from 'vitest';
import { effectScope } from 'vue';
import type { Ref } from 'vue';

const storage = new Map<string, unknown>();
const navMock = vi.fn();
const bgMock = vi.fn();
const tabMock = vi.fn();
(globalThis as Record<string, unknown>).uni = {
  getStorageSync: (k: string) => (storage.has(k) ? storage.get(k) : ''),
  setStorageSync: (k: string, v: unknown) => { storage.set(k, v); },
  setNavigationBarColor: navMock,
  setBackgroundColor: bgMock,
  setTabBarStyle: tabMock
};

import { chromeFor, applyChrome, useTheme, setTheme, THEME_KEY } from '../src/utils/store/theme';

/** 单文件断言辅助：与 tests/tags.test.ts 同风格，尾部 expect(fail).toBe(0) 收口 */
function makeAssert() {
  let pass = 0, fail = 0;
  const fails: string[] = [];
  return {
    pass: () => pass,
    eq(actual: unknown, expected: unknown, name: string) {
      if (actual === expected) { pass++; }
      else { fail++; fails.push(`${name}\n   期望: ${JSON.stringify(expected)}\n   实际: ${JSON.stringify(actual)}`); }
    },
    ok(cond: unknown, name: string) {
      if (cond) { pass++; }
      else { fail++; fails.push(`${name}\n   期望成立，实际: ${JSON.stringify(cond)}`); }
    },
    summary(label: string) {
      console.log(`\n${label}：${pass} 通过，${fail} 失败`);
      if (fail) {
        console.error('\n失败详情：');
        fails.forEach((f) => console.error(' ✗ ' + f));
      }
      expect(fail, fails.join('\n')).toBe(0);
    }
  };
}

it('chromeFor：深浅两套原生配色精确匹配（值与 global.scss 令牌对应）', () => {
  const a = makeAssert();

  const d = chromeFor('dark');
  a.eq(d.navBg, '#16161A', 'dark navBg = --bg-page 暗');
  a.eq(d.navFront, '#ffffff', 'dark navFront（原生仅黑白）');
  a.eq(d.windowBg, '#16161A', 'dark windowBg = --bg-page 暗');
  a.eq(d.tabColor, '#A8A8B4', 'dark tabColor = --text-secondary 暗');
  a.eq(d.tabSelected, '#A98BFF', 'dark tabSelected = --brand-500 暗');
  a.eq(d.tabBg, '#232329', 'dark tabBg = --bg-surface 暗');
  a.eq(d.tabBorder, 'white', 'dark tabBorder（原生仅 black/white）');

  const l = chromeFor('light');
  a.eq(l.navBg, '#FFFFFF', 'light navBg');
  a.eq(l.navFront, '#000000', 'light navFront');
  a.eq(l.windowBg, '#F7F7FA', 'light windowBg');
  a.eq(l.tabColor, '#5A5A66', 'light tabColor');
  a.eq(l.tabSelected, '#7C3AED', 'light tabSelected');
  a.eq(l.tabBg, '#FFFFFF', 'light tabBg');
  a.eq(l.tabBorder, 'black', 'light tabBorder');

  a.summary('chromeFor');
});

it('useTheme：懒初始化 + 订阅同步 + scope 退订', () => {
  const a = makeAssert();

  // 初始化：存储为空 → light
  const scope1 = effectScope();
  const theme1 = scope1.run(() => useTheme()) as Ref<string>;
  a.eq(theme1.value, 'light', '无存储默认浅色');

  // 响应式：setTheme 广播后 ref 更新（页面根节点 theme-dark class 跟着变）
  setTheme('dark');
  a.eq(theme1.value, 'dark', 'setTheme(dark) 后 useTheme ref 更新');

  // 退订：scope.stop() 后不再跟随
  scope1.stop();
  setTheme('light');
  a.eq(theme1.value, 'dark', 'scope.stop() 后不再跟随主题');

  // 新 scope 从存储恢复当前主题
  const scope2 = effectScope();
  const theme2 = scope2.run(() => useTheme()) as Ref<string>;
  a.eq(theme2.value, 'light', '存储已是 light，新 scope 读到 light');
  scope2.stop();

  // 存储为 dark 时新 scope 读到 dark（冷启动按已存主题渲染）
  storage.set(THEME_KEY, 'dark');
  const scope3 = effectScope();
  const theme3 = scope3.run(() => useTheme()) as Ref<string>;
  a.eq(theme3.value, 'dark', '存储为 dark 时新 scope 读到 dark');
  scope3.stop();
  storage.delete(THEME_KEY);

  a.summary('useTheme');
});

it('applyChrome：把配色下发到导航栏/窗口/tabBar 三个原生 API', () => {
  navMock.mockClear(); bgMock.mockClear(); tabMock.mockClear();
  applyChrome('dark');
  expect(navMock).toHaveBeenCalledWith({ frontColor: '#ffffff', backgroundColor: '#16161A' });
  expect(bgMock).toHaveBeenCalledWith({
    backgroundColor: '#16161A', backgroundColorTop: '#16161A', backgroundColorBottom: '#16161A'
  });
  expect(tabMock).toHaveBeenCalledWith({
    color: '#A8A8B4', selectedColor: '#A98BFF', backgroundColor: '#232329', borderStyle: 'white'
  });

  navMock.mockClear(); bgMock.mockClear(); tabMock.mockClear();
  applyChrome('light');
  expect(navMock).toHaveBeenCalledWith({ frontColor: '#000000', backgroundColor: '#FFFFFF' });
  expect(bgMock).toHaveBeenCalledWith({
    backgroundColor: '#F7F7FA', backgroundColorTop: '#F7F7FA', backgroundColorBottom: '#F7F7FA'
  });
  expect(tabMock).toHaveBeenCalledWith({
    color: '#5A5A66', selectedColor: '#7C3AED', backgroundColor: '#FFFFFF', borderStyle: 'black'
  });
});

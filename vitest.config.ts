import { defineConfig } from 'vitest/config';

// 单测只覆盖纯函数层（markdown / profile），不加载 uni-app 插件，
// 避免 @dcloudio/vite-plugin-uni 在 node 环境下的副作用。
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});

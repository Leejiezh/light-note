import { defineConfig } from 'vite';
import uni from '@dcloudio/vite-plugin-uni';

export default defineConfig({
  plugins: [uni()],
  server: {
    // 监听 0.0.0.0，允许手机等局域网设备访问（H5 真机预览）
    host: true,
    port: 5173,
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 全局注入设计令牌变量（对应 design-spec.md 的令牌表）
        // 用 @use ... as * 而非 @import，避免 Sass 弃用警告
        additionalData: '@use "@/styles/tokens.scss" as *;'
      }
    }
  }
});

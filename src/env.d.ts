/// <reference types="@dcloudio/types" />
/// <reference types="vite/client" />

// .vue 单文件组件的模块声明（vue-tsc 本身能解析 .vue，
// 这里给不识别 .vue 的工具链一个兜底）
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any -- vue 官方 shim 的宽松兜底，仅给不识别 .vue 的工具链使用
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// ============================================================
// 微信小程序专属 API（@dcloudio/types 只声明了 uni，这里补上
// 编辑器实际用到的 wx 子集；按需扩充）
// ============================================================

interface WxChooseMediaSuccess {
  tempFiles?: { tempFilePath?: string; path?: string }[];
}

interface WxFileSystemManager {
  saveFile(opts: {
    tempFilePath: string;
    success: (res: { savedFilePath?: string }) => void;
    fail: () => void;
  }): void;
}

interface Wx {
  /** 媒体选择（基础库 2.10.0+，替代 chooseImage） */
  chooseMedia?(opts: {
    count?: number;
    mediaType?: string[];
    sizeType?: string[];
    sourceType?: string[];
    success: (res: WxChooseMediaSuccess) => void;
    fail: (err: unknown) => void;
  }): void;
  /** 读 textarea 选区（基础库 2.7.0+，仅 focus 时有效） */
  getSelectedTextRange?(opts: {
    success: (res: { start: number; end: number }) => void;
    fail: () => void;
  }): void;
  /** 文件系统（saveFile 把临时文件落成长期路径） */
  getFileSystemManager?(): WxFileSystemManager;
}

declare const wx: Wx | undefined;

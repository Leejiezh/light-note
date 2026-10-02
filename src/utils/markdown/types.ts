// ============================================================
// 轻记 · Markdown 解析器公共类型
// ============================================================

/** 待办项（分段渲染时由原生组件 TodoList 渲染） */
export interface TodoItem {
  text: string;
  checked: boolean;
}

/**
 * 正文分段 —— 详情页渲染的最小单元
 *
 * - `richtext` 普通富文本（rich-text 组件）
 * - `todo`     待办项（原生组件，事件可挂）
 * - `image`    独占一行的图片（原生 <image>，对「本机路径」兼容性最好）
 */
export type Segment =
  | { type: 'richtext'; html: string }
  | { type: 'todo'; items: TodoItem[] }
  | { type: 'image'; src: string; alt: string };

/** renderMd 的选项 */
export interface RenderOptions {
  /** 是否跳过待办行（分段渲染时，待办由原生组件渲染） */
  skipTodo?: boolean;
}

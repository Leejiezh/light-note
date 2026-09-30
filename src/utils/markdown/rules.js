// ============================================================
// 轻记 · Markdown 语法规则常量
//
// ★ 关键设计：解析（渲染）与摘要（extractExcerpt）必须共用这一份常量，
//   否则会出现「正文渲染认得某语法，但摘要里漏着 ** 星号」的不一致。
//   对应 data-api-contract.md §四 的硬性要求。
// ============================================================

/** 待办项匹配：- [ ] / - [x] / * [ ] */
export const TODO_PATTERN = /^[-*]\s\[([ xX])\]\s?(.*)$/;

/** 标题：## 标题 */
export const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;

/** 引用：> 引用内容 */
export const QUOTE_PATTERN = /^>\s?(.*)$/;

/** 无序列表：- 项 / * 项（不匹配待办） */
export const UL_PATTERN = /^[-*]\s+(?!\[[ xX]\])(.*)$/;

/** 有序列表：1. 项 */
export const OL_PATTERN = /^\d+\.\s+(.*)$/;

/** 分割线：--- / *** */
export const HR_PATTERN = /^(-{3,}|\*{3,})$/;

/**
 * 独占一行的图片：![描述](地址)
 *
 * ★ 只有「整行就是一张图」才会被切成图片段（详情页用原生 <image> 渲染）。
 *   跟文字混在一行的图片仍然留在富文本段里 —— 原生 <image> 是块级组件，
 *   塞进行内会把整行的排版打散。
 */
export const IMAGE_LINE_PATTERN = /^\s*!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)\)\s*$/;

/** 代码块围栏：```lang */
export const FENCE_PATTERN = /^```(\w*)$/;

/**
 * 链接协议白名单 —— XSS 防护
 * 只允许这三种协议，其余（javascript: / data:text 等）一律拦截
 */
export const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * 图片额外允许的来源协议 —— ★ 只给「图片」用，链接仍然只认上面的白名单
 *
 * - `wxfile:` 小程序本机文件（相册选出的图先落盘，路径形如 wxfile://usr/xxx.jpg）
 * - `blob:`   H5 端 uni.chooseImage 返回的临时对象地址
 *
 * 安全性：这两种协议只能指向「本机已有文件」，无法像 javascript: / data:text
 * 那样携带可执行内容，所以放开它们不会削弱链接那边的 XSS 防护。
 */
export const MEDIA_PROTOCOLS = ['wxfile:', 'blob:'];

/**
 * 行内语法的标记字符（供摘要剔除使用）
 * 与 parseInline 的处理范围保持一致
 */
export const INLINE_MARKERS = {
  code: /`([^`\n]+)`/g,
  bold: /\*\*([^*\n]+)\*\*/g,
  italic: /(^|[^*])\*([^*\n]+)\*(?!\*)/g,
  strike: /~~([^~\n]+)~~/g,
  image: /!\[([^\]]*)\]\([^)]*\)/g,
  link: /\[([^\]]*)\]\([^)]*\)/g
};

/**
 * 块级语法映射到 rich-text 标签
 * 对应 syntax-render-mapping.md §2 的渲染映射表
 *
 * 注意：rich-text 白名单比 editor 宽松，
 *       pre / code / blockquote 均可直接使用，无需降级模拟。
 */
export const BLOCK_TAG_MAP = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
  5: 'h5',
  6: 'h6'
};

/**
 * 工具栏 · 行内格式（key → 包裹标记）
 *
 * ★ 与上面的 INLINE_MARKERS 必须是同一套语法：改这里就要同步改正则，
 *   否则「工具栏写进去的标记」和「解析器认得的标记」会漂移。
 *
 * 交互是「开关式」：点一下开启（按钮高亮），再点一下关闭，
 * 关闭时才把「开启期间输入的文字」包上标记 —— 详见 editor.vue 的 toggleInlineFormat。
 */
export const INLINE_FORMATS = {
  b: '**',
  i: '*',
  del: '~~',
  code: '`'
};

/**
 * 工具栏 · 块级 / 插入类模板（点一下直接插入，不可开关）
 * 对应 uniapp-adaptation.md §4.2；行内格式见上面的 INLINE_FORMATS
 *
 * ★ 这里没有 image：图片按钮不走「插模板」，而是调起本机相册，
 *   把用户选中的真实文件路径插进来（见 editor.vue 的 pickImage
 *   与 format.js 的 insertImageBlock）。
 */
export const TOOLBAR_SNIPPETS = {
  h:     '\n## 小标题\n',
  ul:    '\n- 列表项\n',
  ol:    '\n1. 列表项\n',
  todo:  '\n- [ ] 待办事项\n',
  quote: '\n> 引用内容\n',
  hr:    '\n---\n'
};

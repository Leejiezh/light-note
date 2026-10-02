// ============================================================
// 轻记 · 块级语法解析 → rich-text HTML
// 对应 syntax-render-mapping.md §2 的块级映射
//
// ⚠️ 输出的是 rich-text 可用的标签。
//    rich-text 白名单比 editor 宽松：
//    pre / code / blockquote / table 均可直接使用，无需降级模拟。
// ============================================================

import { parseInline } from './inline';
import type { RenderOptions } from './types';
import {
  TODO_PATTERN, HEADING_PATTERN, QUOTE_PATTERN, UL_PATTERN,
  OL_PATTERN, HR_PATTERN, FENCE_PATTERN, BLOCK_TAG_MAP
} from './rules';

/**
 * 渲染 Markdown 为 rich-text 支持的 HTML
 * @param src  Markdown 正文
 * @param opts skipTodo 为 true 时跳过待办行（分段渲染时，待办由原生组件渲染）
 * @returns HTML 字符串
 */
export function renderMd(src: unknown, opts: RenderOptions = {}): string {
  const { skipTodo = false } = opts;
  const lines = String(src || '').split('\n');
  const out: string[] = [];

  let i: number;
  let inCode = false;        // 是否在代码块内
  let codeLang = '';
  let codeBuf: string[] = [];
  let listBuf: string[] = [];  // 累积列表项
  let listType: 'ul' | 'ol' | null = null;

  /** 冲刷列表缓冲 */
  function flushList() {
    if (!listBuf.length) return;
    const tag = listType === 'ol' ? 'ol' : 'ul';
    out.push(`<${tag} class="md-${tag}">${listBuf.map((t) => `<li class="md-li">${t}</li>`).join('')}</${tag}>`);
    listBuf = [];
    listType = null;
  }

  /** 冲刷代码块 */
  function flushCode() {
    if (!codeBuf.length && !codeLang) return;
    const cls = codeLang ? ` class="md-code language-${codeLang}"` : ' class="md-code"';
    out.push(`<pre class="md-pre"><code${cls}>${codeBuf.join('\n')}</code></pre>`);
    codeBuf = [];
    codeLang = '';
  }

  for (i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ---------- 代码块围栏 ----------
    const fence = line.match(FENCE_PATTERN);
    if (fence) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushList();
        inCode = true;
        codeLang = fence[1] || '';
      }
      continue;
    }
    if (inCode) {
      // 代码块内不解析任何语法，只转义
      codeBuf.push(parseInline(line).replace(/&lt;/g, '&lt;'));
      continue;
    }

    // ---------- 空行 ----------
    if (!line.trim()) {
      flushList();
      continue;
    }

    // ---------- 待办项 ----------
    if (TODO_PATTERN.test(line)) {
      flushList();
      if (!skipTodo) {
        // 非分段模式下，待办渲染为普通 li（但注意：此路径下勾选不可用）
        const m = line.match(TODO_PATTERN);
        const checked = /[xX]/.test(m![1]);
        out.push(
          `<p class="md-todo">${checked ? '☑' : '☐'} ${parseInline(m![2])}</p>`
        );
      }
      // skipTodo=true 时直接跳过，交给上层分段逻辑处理
      continue;
    }

    // ---------- 标题 ----------
    const h = line.match(HEADING_PATTERN);
    if (h) {
      flushList();
      const tag = BLOCK_TAG_MAP[h[1].length] || 'h6';
      out.push(`<${tag} class="md-${tag}">${parseInline(h[2])}</${tag}>`);
      continue;
    }

    // ---------- 分割线 ----------
    if (HR_PATTERN.test(line.trim())) {
      flushList();
      // ⚠️ 小程序端不支持 hr 标签选择器，必须带 class 才能命中样式
      out.push('<hr class="md-hr">');
      continue;
    }

    // ---------- 引用 ----------
    const q = line.match(QUOTE_PATTERN);
    if (q) {
      flushList();
      out.push(`<blockquote class="md-blockquote">${parseInline(q[1])}</blockquote>`);
      continue;
    }

    // ---------- 无序列表 ----------
    const ul = line.match(UL_PATTERN);
    if (ul) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listBuf.push(parseInline(ul[1]));
      continue;
    }

    // ---------- 有序列表 ----------
    const ol = line.match(OL_PATTERN);
    if (ol) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listBuf.push(parseInline(ol[1]));
      continue;
    }

    // ---------- 普通段落 ----------
    flushList();
    out.push(`<p class="md-p">${parseInline(line)}</p>`);
  }

  // 收尾冲刷
  if (inCode) flushCode();
  flushList();

  return out.join('');
}

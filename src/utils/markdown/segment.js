// ============================================================
// 轻记 · 分段解析器（待办分段渲染的核心）
// 对应 uniapp-adaptation.md §三
//
// 为什么要分段：
//   微信小程序 <rich-text> 内部屏蔽所有节点的事件，
//   待办项放进去就无法点击勾选。必须把正文切成段，
//   待办段用原生组件渲染，其余段交给 rich-text。
// ============================================================

import { renderMd } from './block.js';
import { isSafeUrl } from './inline.js';
import { TODO_PATTERN, IMAGE_LINE_PATTERN } from './rules.js';

/**
 * 把 body 切成段数组
 *
 * ★ 关键：globalTodoIdx 必须跨段累加！
 *   checks[i] 是全篇待办项按顺序索引的，
 *   若误用段内局部索引，第二段待办会去取第一段的 checks，导致勾选错位。
 *
 * 段类型：
 * - `richtext` 普通富文本
 * - `todo`     待办项（原生组件，事件可挂）
 * - `image`    ★ 独占一行的图片（原生 <image>，对「本机路径」兼容性最好）
 *
 * @param {string} body 笔记正文（Markdown）
 * @param {boolean[]} checks 勾选状态数组（与全篇待办项下标一一对应）
 * @returns {Array<{type:'richtext'|'todo'|'image', html?:string, items?:Array, src?:string, alt?:string}>}
 */
export function parseToSegments(body, checks = []) {
  const lines = String(body || '').split('\n');
  const segments = [];
  let buf = [];           // 累积的普通行
  let todoBuf = [];       // 累积的待办项
  let globalTodoIdx = 0;  // ★ 全篇待办计数，对应 checks 下标

  function flushRich() {
    if (buf.length) {
      segments.push({
        type: 'richtext',
        html: renderMd(buf.join('\n'), { skipTodo: true })
      });
      buf = [];
    }
  }

  function flushTodo() {
    if (todoBuf.length) {
      segments.push({ type: 'todo', items: todoBuf });
      todoBuf = [];
    }
  }

  for (const line of lines) {
    const m = line.match(TODO_PATTERN);
    if (m) {
      flushRich();
      // ⚠️ 这里不能 flushTodo：连续多行待办必须累进同一段，
      //    否则每一项都会变成独立的一段
      todoBuf.push({
        text: m[2],
        checked: checks[globalTodoIdx] === true  // ★ 用全篇序号取状态
      });
      globalTodoIdx++;
      continue;
    }

    // ★ 独占一行的图片 → 单独成段，交给原生 <image>
    const mi = line.match(IMAGE_LINE_PATTERN);
    // 地址不安全时不当图片：退回普通行，让 rich-text 按「只保留描述」处理，
    // 保证「是否放行」只有 isSafeUrl 一个判定源头
    if (mi && isSafeUrl(mi[2], { media: true })) {
      flushRich();
      flushTodo();        // 图片是块级组件，不能和待办挤在同一段里
      segments.push({ type: 'image', alt: mi[1], src: mi[2] });
      continue;
    }

    flushTodo();
    buf.push(line);
  }

  flushRich();
  flushTodo();
  return segments;
}

/**
 * 把分段中的 items 拍平回全篇 checks 顺序
 * 用于勾选后回写 checks 数组
 */
export function collectChecks(segments) {
  const out = [];
  segments.forEach((seg) => {
    if (seg.type === 'todo') {
      seg.items.forEach((it) => out.push(!!it.checked));
    }
  });
  return out;
}

/**
 * 统计正文中的待办项数量
 * 对应 data-api-contract.md §2.1 不变式 1
 */
export function countTodos(src) {
  return (String(src || '').match(/^[-*]\s\[[ xX]\]/gm) || []).length;
}

/**
 * 对齐 checks 长度（不变式 1：length 恒等于待办项数量）
 * 仅在正文未变更时使用 —— 沿用已有勾选状态
 */
export function normalizeChecks(src, checks) {
  const n = countTodos(src);
  const out = new Array(n).fill(false);
  if (Array.isArray(checks)) {
    for (let i = 0; i < Math.min(n, checks.length); i++) {
      out[i] = checks[i] === true;
    }
  }
  return out;
}

/**
 * 重置 checks（不变式 3：正文变更后必须重置）
 *
 * ⚠️ 这是数据正确性的关键：
 *   checks 按位置索引对齐，正文结构一变索引即失效。
 *   若沿用旧数组，会出现「用户没勾过的项自己变勾」。
 */
export function resetChecks(src) {
  return new Array(countTodos(src)).fill(false);
}

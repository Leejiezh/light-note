// ============================================================
// 轻记 · 摘要生成 extractExcerpt
// 对应 data-api-contract.md §四
//
// ★ 硬性要求：本函数必须与渲染解析器共用 rules.js 的语法规则常量，
//   否则会出现「正文渲染认得某语法，但摘要里漏着 ** 星号」的不一致。
// ============================================================

import {
  TODO_PATTERN, HEADING_PATTERN, QUOTE_PATTERN,
  UL_PATTERN, OL_PATTERN, HR_PATTERN, FENCE_PATTERN
} from './rules.js';

/**
 * 把正文转成纯文本摘要
 *
 * 处理步骤（顺序不可调换）：
 *   1. 剔除代码块围栏
 *   2. 剔除图片语法，保留描述文字
 *   3. 链接只保留文字，丢弃 URL
 *   4. 去掉行首标记（# > - 1.）
 *   5. 去掉行内标记（** * ~~ `）
 *   6. 合并连续空白与换行
 *   7. 截断到 maxLen，超出加 …
 *
 * @param {string} body    Markdown 正文
 * @param {number} maxLen  最大长度，默认 60
 * @returns {string}
 */
export function extractExcerpt(body, maxLen = 60) {
  let s = String(body || '');

  // 1. 剔除代码块围栏（保留内容，去掉 ``` 标记）
  s = s.replace(/^```\w*$/gm, '');

  // 2-3. 图片优先（先于链接，否则 ![alt](url) 会被链接规则吃掉）
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');   // 图片 → 描述文字
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');    // 链接 → 链接文字

  const lines = s.split('\n');
  const kept = [];

  for (const raw of lines) {
    let line = raw;

    // 4. 去掉行首块级标记
    line = line.replace(HEADING_PATTERN, '$2');       // ## 标题 → 标题
    line = line.replace(QUOTE_PATTERN, '$1');         // > 引用 → 引用
    if (TODO_PATTERN.test(line)) {
      line = line.replace(TODO_PATTERN, '$2');        // - [ ] 待办 → 待办
    } else if (HR_PATTERN.test(line.trim())) {
      continue;                                        // 分割线整行丢弃
    } else if (UL_PATTERN.test(line)) {
      line = line.replace(UL_PATTERN, '$1');          // - 列表项 → 列表项
    } else if (OL_PATTERN.test(line)) {
      line = line.replace(OL_PATTERN, '$1');          // 1. 列表项 → 列表项
    }

    // 5. 去掉行内标记
    line = line.replace(/`([^`\n]+)`/g, '$1');        // 行内代码
    line = line.replace(/\*\*([^*\n]+)\*\*/g, '$1');  // 加粗
    line = line.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1$2');  // 斜体
    line = line.replace(/~~([^~\n]+)~~/g, '$1');      // 删除线

    if (line.trim()) kept.push(line.trim());
  }

  // 6. 合并为单行
  let text = kept.join(' ').replace(/\s+/g, ' ').trim();

  // 7. 截断
  if (text.length > maxLen) {
    text = text.slice(0, maxLen) + '…';
  }
  return text;
}

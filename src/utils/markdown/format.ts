// ============================================================
// 轻记 · 行内格式的纯函数工具
//
// ★ 不依赖 uni / 小程序环境，可以直接单测（见 tests/parser.test.ts）。
//   编辑器工具栏的「包裹标记 + 光标落点」全靠这里，
//   区间算差一位就会把光标放到错误的位置，所以单独抽出来锁住行为。
// ============================================================

/**
 * 把 number 夹到 [0, max]，并把 undefined / NaN / 小数 规整成整数
 */
function clamp(n: unknown, max: number): number {
  const v = Number.isFinite(n) ? Math.trunc(n as number) : 0;
  return Math.min(Math.max(v, 0), max);
}

/** wrapRange 的返回值：包裹后的正文 + 光标落点 */
export interface WrapResult {
  text: string;
  caret: number;
}

/**
 * 给 text 的 [start, end) 区间包上首尾标记
 *
 * 语义约定（调用方依赖这些边界行为）：
 * - 返回 `caret` = 右标记之后的位置，用于把光标放到包裹结果的外侧
 * - 空区间（start >= end）→ 返回 null，表示「什么都不做」。
 *   对应「刚开启格式、一个字都没输入就关闭」，此时不该往正文里塞 `****`
 * - start 越界 / 为负 → 夹到合法范围
 *
 * @param text  原正文
 * @param start 区间起点（含）
 * @param end   区间终点（不含）
 * @param mark  首尾标记，如 '**' / '*' / '~~' / '`'
 */
export function wrapRange(text: unknown, start: unknown, end: unknown, mark: unknown): WrapResult | null {
  if (typeof text !== 'string' || !mark) return null;

  const s = clamp(start, text.length);
  const e = clamp(end, text.length);
  if (e <= s) return null;

  const inner = text.slice(s, e);
  return {
    text: text.slice(0, s) + String(mark) + inner + String(mark) + text.slice(e),
    caret: e + String(mark).length * 2
  };
}

/**
 * 生成图片的 Markdown 片段
 *
 * ⚠️ alt 里的 `[` `]` 会破坏 `![alt](url)` 的结构（解析器认不出、图片变文字），
 *    所以直接剔除；url 为空时返回 null，交由调用方决定怎么提示。
 *
 * @param url 图片地址（网络地址，或相册选出的本机路径）
 * @param alt 图片描述，默认「图片」
 */
export function imageMarkdown(url: unknown, alt: unknown = '图片'): string | null {
  const src = String(url == null ? '' : url).trim();
  if (!src) return null;

  const label = String(alt == null ? '' : alt)
    .replace(/[[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return `![${label || '图片'}](${src})`;
}

/** insertImageBlock 的返回值：插入后的正文 + 光标落点 + 插入的片段 */
export interface InsertImageResult {
  text: string;
  caret: number;
  snippet: string;
}

/**
 * 把图片插到 Pos 处，并保证它独占一行
 *
 * 为什么要求独占一行：
 *   详情页把「独占一行的图片」交给原生 <image> 渲染（rich-text 对本地路径
 *   支持不可靠），跟文字混在一行时就会被当成行内内容，图片可能显示不出来。
 *
 * 光标落在整块之后（即尾部换行的下一行行首），用户可以直接接着写。
 *
 * @param text 原正文
 * @param pos  插入位置
 * @param url  图片地址
 * @param alt  图片描述
 */
export function insertImageBlock(text: unknown, pos: unknown, url: unknown, alt?: unknown): InsertImageResult | null {
  if (typeof text !== 'string') return null;

  const md = imageMarkdown(url, alt);
  if (!md) return null;

  const p = clamp(pos, text.length);
  const before = text.slice(0, p);
  const after = text.slice(p);

  // 前面不是行首就补一个换行；后面不是「已经在下一行」就补一个换行
  const lead = !before || before.endsWith('\n') ? '' : '\n';
  const tail = after.startsWith('\n') ? '' : '\n';

  const snippet = lead + md + tail;
  return {
    text: before + snippet + after,
    caret: p + snippet.length,
    snippet
  };
}

// ============================================================
// 轻记 · 行内语法解析
// 对应 syntax-render-mapping.md §2 的行内语法映射
//
// 处理顺序（顺序不可调换）：
//   行内代码 → 图片 → 链接 → 加粗 → 斜体 → 删除线
//   理由：代码优先摘出避免被后续规则破坏；
//         加粗必须早于斜体，否则 ** 会被 * 抢先匹配。
// ============================================================

import { ALLOWED_PROTOCOLS, MEDIA_PROTOCOLS } from './rules.js';

/** HTML 转义 —— XSS 防护第一道防线 */
export function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 协议白名单校验
 * 拦截 javascript: / data:text/html 等危险协议
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {boolean} [opts.media] 图片专用：额外放行 wxfile: / blob:（本机文件来源）
 */
export function isSafeUrl(url, opts = {}) {
  const u = String(url || '').trim().toLowerCase();
  if (!u) return false;
  // 相对路径 / 锚点允许
  if (u.startsWith('/') || u.startsWith('#') || u.startsWith('.')) return true;
  // 无协议头的（如 example.com/x.png）视为 http
  if (!/^[a-z][a-z0-9+.-]*:/.test(u)) return true;

  const allowed = opts.media ? ALLOWED_PROTOCOLS.concat(MEDIA_PROTOCOLS) : ALLOWED_PROTOCOLS;
  return allowed.some((p) => u.startsWith(p));
}

/**
 * URL 允许成对括号
 * 修复：维基百科等真实 URL 含括号，用 [^)\s]+ 会截断并泄漏游离的 )
 * 例：https://a.com/x(y) 之前会输出 href="https://a.com/x(y"
 */
const URL_PAT = '((?:[^()\\s]|\\([^()\\s]*\\))+)';

/**
 * 行内解析主函数
 * @param {string} text 原始行内文本（未转义）
 * @returns {string} HTML 片段（已转义，仅含白名单标签）
 */
export function parseInline(text) {
  // ① 先整体转义，之后所有替换都在安全文本上进行
  let s = esc(text);

  // ② 摘出行内代码（stash），避免其内容被后续规则处理
  const stash = [];
  s = s.replace(/`([^`\n]+)`/g, (m, code) => {
    stash.push(`<code class="md-code-inline">${code}</code>`);
    return `\u0000${stash.length - 1}\u0000`;
  });

  // ③ 图片 ![alt](url)
  //    ★ 图片用 media 白名单：放行 wxfile: / blob:（相册选的本机文件）
  s = s.replace(
    new RegExp(`!\\[([^\\]]*)\\]\\(${URL_PAT}\\)`, 'g'),
    (m, alt, url) => (isSafeUrl(url, { media: true }) ? `<img class="md-img" src="${url}" alt="${alt}">` : alt)
  );

  // ④ 链接 [text](url)
  s = s.replace(
    new RegExp(`\\[([^\\]]*)\\]\\(${URL_PAT}\\)`, 'g'),
    (m, label, url) => (isSafeUrl(url) ? `<a class="md-a" href="${url}">${label}</a>` : label)
  );

  // ⑤ 加粗（必须早于斜体）
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong class="md-strong">$1</strong>');

  // ⑥ 斜体（用前后非 * 断言，避免误吃加粗的星号）
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em class="md-em">$2</em>');

  // ⑦ 删除线
  s = s.replace(/~~([^~\n]+)~~/g, '<del class="md-del">$1</del>');

  // ⑧ 还原行内代码
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[Number(i)] || '');
}

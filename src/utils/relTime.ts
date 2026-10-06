// ============================================================
// 轻记 · 相对时间
//
// 列表页 / 回收站卡片共用：把 ISO 时间戳格式化成「刚刚 / N 分钟前 /
// N 小时前 / N 天前 / M月D日」。输入非法或为空时返回空串（调用方兜底）。
// ============================================================

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** ISO 串 / 时间戳 → 相对时间；空值或非法输入返回 '' */
export function relTime(value: string | number | null | undefined): string {
  const t = typeof value === 'number' ? value : value ? Date.parse(value) : NaN;
  if (!t || Number.isNaN(t)) return '';

  const diff = Date.now() - t;
  if (diff < MINUTE) return '刚刚';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时前`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`;

  const d = new Date(t);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ============================================================
// 轻记 · 笔记标签字典（名称 / 排序 / 颜色）
//
// 数据源：GET /dict/note_label —— 标签清单以后端为准，前端不再硬编码标签表。
//
// 为什么要有这一层：
//   1. 标签在「标签页 / 列表页筛选 / 笔记卡片 / 详情页」四处都要显示，
//      各自请求会打四遍接口，各自维护 label 表会长期不一致（合并前已有三份）；
//   2. 冷启动先用本地缓存渲染，避免标签名「先空白后跳出」；
//      接口失败也还有东西可显示，不会让页面变空白。
//
// 颜色（★ 走后端为准）：后端在 extra.color 里给了 light / dark 两套色值，
//   这里按当前主题取一套；取不到时回落项目令牌（不硬编码色值）。
// ============================================================

import { ref } from 'vue';
// 这里用相对路径而不是 '@/api'：vitest 环境不认 @ 别名，
// 本模块有配套单测（tests/tags.test.ts），凡是可单测的模块都走相对路径，
// 与 utils/markdown、utils/store/profile 的写法保持一致。
import { getNoteLabels } from '../../api';
import type { DictItem } from '../../api';
import { getTheme, onThemeChange } from './theme';
import type { ThemeMode } from './theme';

/** 本地缓存键 */
export const TAG_DICT_KEY = 'tag_dict';

/** 「未分类」的展示名（后端字典不含这个键：RecordCreateReq.label 注释为「空 = 未分类」） */
export const UNTAGGED_LABEL = '未分类';

/** 前端历史约定键：数据里的 'all' 等价于「未分类」 */
const LEGACY_UNTAGGED_KEY = 'all';

/** 取不到颜色时的兜底主色（走令牌变量，不硬编码色值） */
export const FALLBACK_TAG_COLOR = 'var(--brand-500)';

/** 兜底配色的底色（与 FALLBACK_TAG_COLOR 同色系，保证文字可见） */
const FALLBACK_TAG_BG = 'var(--brand-50)';

/** 兜底配色的文字色 */
const FALLBACK_TAG_TEXT = 'var(--brand-600)';

/** 标签配色（给 :style 绑定用） */
export interface TagColors {
  /** 文字色 / 圆点色 */
  color: string;
  /** 胶囊底色 */
  background: string;
}

/** 字典（响应式，模板直接读即可建立依赖） */
const dict = ref<DictItem[]>([]);

/**
 * 当前主题（响应式）：颜色按它选 light / dark。
 * 初值 null 表示「还没同步过」—— 模块顶层不读存储，避免静态 import 就碰 uni。
 */
const theme = ref<ThemeMode | null>(null);

// 订阅主题变化：主题一改，所有按字典取色的地方跟着重算
onThemeChange((mode) => {
  theme.value = mode;
});

/** 惰性同步主题（读一次存储后就靠订阅维护） */
function currentTheme(): ThemeMode {
  if (theme.value === null) theme.value = getTheme();
  return theme.value;
}

/** 是否已经尝试过读缓存（避免每次 ensure 都读一遍存储） */
let hydrated = false;

/**
 * 本次运行（一次冷启动）是否已成功拉取过字典。
 * ★ 拉过就锁住：后续 ensureTagDict 只读缓存，不再发请求。
 *   失败时不置位，保证网络恢复后还有重试机会。
 */
let loaded = false;

/** 正在进行的拉取（并发去重：多页面同时 ensure 只发一次请求） */
let inflight: Promise<void> | null = null;

/**
 * 归一化字典：过滤脏项 + 补兜底 + 按 sortOrder 升序。
 * 缓存里的旧数据、接口返回的异常数据都过这一道，调用方就不用再防御。
 */
export function normalizeDict(raw: unknown): DictItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((it) => !!it && typeof it === 'object' && typeof (it as DictItem).key === 'string' && !!(it as DictItem).key)
    .map((it) => {
      const item = it as DictItem;
      return {
        key: item.key,
        // label 缺失时回落 key：显示 work 总好过显示空白
        label: typeof item.label === 'string' && item.label ? item.label : item.key,
        // sortOrder 非法时排到最后，不打乱后端给的相对顺序（Array.sort 稳定）
        sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : Number.MAX_SAFE_INTEGER,
        extra: item.extra && typeof item.extra === 'object' ? item.extra : undefined
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** 同步吃本地缓存（冷启动立即有标签名） */
function hydrateFromCache(): void {
  if (dict.value.length) return;
  try {
    const cached = normalizeDict(uni.getStorageSync(TAG_DICT_KEY));
    if (cached.length) dict.value = cached;
  } catch (e) {
    // 缓存不可读 → 等接口结果，页面回退为显示 key
  }
}

/** 拉取字典并落缓存（失败静默降级：保留缓存 / 空字典） */
async function fetchDict(): Promise<void> {
  try {
    const list = normalizeDict(await getNoteLabels());
    // 空数组说明后端确实没有启用标签，也算拉取成功，
    // 否则每次 ensure 都会重试一遍（等于退回到「每次进页面都打接口」）
    loaded = true;
    if (!list.length) return;
    dict.value = list;
    try {
      uni.setStorageSync(TAG_DICT_KEY, list);
    } catch (e) {
      // 缓存写失败不影响本次渲染，下次启动再拉一次即可
    }
  } catch (e) {
    // 拉取失败不抛、也不置 loaded：标签名回落为 key，颜色回落令牌，
    // 页面照常可用，且下一次 ensure 仍会重试
  }
}

/**
 * 幂等准备标签字典。
 *
 * ★ 拉取时机：只在冷启动（App.onLaunch）拉一次，之后整个运行期复用缓存：
 *   - 已加载 → 直接返回（切标签 / 进详情页 / 返回列表页都不再打 note_label 接口）
 *   - 未加载 → 先同步读本地缓存让当轮渲染可用，再发一次请求
 *   - 请求失败不锁定，下次 ensure 仍会重试（缓存兜底，页面照常可用）
 *
 * 各页面照旧调用即可，不需要关心「什么时候该拉」。
 */
export function ensureTagDict(): Promise<void> {
  currentTheme();
  if (!hydrated) {
    hydrated = true;
    hydrateFromCache();
  }
  if (loaded) return Promise.resolve();
  if (!inflight) {
    inflight = fetchDict().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/** 读字典（响应式）：给需要自己遍历的场景（如列表页筛选条）用 */
export function readTagDict(): DictItem[] {
  return dict.value;
}

/** 查字典项 */
export function findTag(key: string): DictItem | undefined {
  return dict.value.find((it) => it.key === key);
}

/**
 * 标签展示名。
 * 查不到时回落为 key 本身 —— 后端新增了标签而本地字典还没刷新时，
 * 宁可先显示 work，也不要显示空白。
 */
export function readTagLabel(key: string): string {
  if (!key || key === LEGACY_UNTAGGED_KEY) return UNTAGGED_LABEL;
  return findTag(key)?.label || key;
}

/**
 * 标签识别色（圆点 / 文字用）。
 * ★ 走 A：色值以后端 extra.color 为准，按当前主题取 light / dark；
 *   后端没给色值时回落令牌变量。
 */
export function readTagColor(key: string): string {
  const color = findTag(key)?.extra?.color;
  const mode = currentTheme();
  const picked = (mode === 'dark' ? color?.dark : color?.light) || color?.light || color?.dark;
  return picked || FALLBACK_TAG_COLOR;
}

/**
 * 标签配色（文字色 + 胶囊底色）。
 * 底色由主色降透明度生成，保证换标签色后胶囊仍然协调；
 * 没有字典色值时回落令牌的「深字浅底」组合，避免文字与底同色。
 */
export function readTagColors(key: string): TagColors {
  const color = findTag(key)?.extra?.color;
  const mode = currentTheme();
  const picked = (mode === 'dark' ? color?.dark : color?.light) || color?.light || color?.dark;
  if (!picked) return { color: FALLBACK_TAG_TEXT, background: FALLBACK_TAG_BG };
  return { color: picked, background: hexToRgba(picked, 0.12) };
}

/**
 * hex 转 rgba（给胶囊底色用）。
 * 非 hex（如 var(--brand-500) 这类令牌值、拼接色）原样返回，交给 CSS 处理。
 */
export function hexToRgba(color: string, alpha: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color ?? '').trim());
  if (!m) return color;
  let hex = m[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

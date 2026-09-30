// ============================================================
// 轻记 · 个人资料本地存储
//
// 为什么独立成文件而不是写在 mine.vue 里：
//   1. 「我的」页要在 onShow 里读、编辑态里写，逻辑混在组件里会让模板噪音很大
//   2. 校验规则（昵称长度、邮箱格式、字符清洗）是纯函数，可以单独测
//   3. 将来接后端只需把 read/write 换成 request，组件层不动
//
// 存储介质：uni.getStorageSync / setStorageSync（两端通用，无原生组件限制）
// ============================================================

/** 存储键 */
export const PROFILE_KEY = 'profile';

/** 昵称长度上限（按「字符数」计，不是字节） */
export const NICKNAME_MAX = 12;

/** 个性签名长度上限 */
export const SIGNATURE_MAX = 40;

/** 邮箱长度上限（RFC 5321 的本地部分+域名总长上限 254，这里取宽松值） */
export const EMAIL_MAX = 60;

/**
 * 头像底色预设
 *
 * 为什么只给「换底色 + 首字符」而不做自定义上传：
 *   编辑页图片存的是本机路径（chooseImage 的 tempFilePath / saveFile），
 *   换设备或清缓存就失效。头像比笔记图片更显眼，用一个必然失效的地址
 *   反而更糟。所以沿用项目既有的「渐变底 + 昵称首字符」视觉，
 *   只让用户挑底色 —— 任何设备上都稳定，且同样有个人辨识度。
 */
export const AVATAR_PRESETS = [
  { key: 'violet', label: '紫罗兰', from: '#A78BFA', to: '#6D28D9', shadow: 'rgba(124, 58, 237, 0.30)' },
  { key: 'ocean', label: '深海蓝', from: '#7DB8F0', to: '#2563EB', shadow: 'rgba(37, 99, 235, 0.30)' },
  { key: 'mint', label: '薄荷绿', from: '#5EEAD4', to: '#0D9488', shadow: 'rgba(13, 148, 136, 0.30)' },
  { key: 'sunset', label: '落日橘', from: '#FDBA74', to: '#EA580C', shadow: 'rgba(234, 88, 12, 0.30)' },
  { key: 'rose', label: '玫瑰粉', from: '#F9A8D4', to: '#DB2777', shadow: 'rgba(219, 39, 119, 0.30)' },
  { key: 'graphite', label: '石墨黑', from: '#6B7280', to: '#1F2937', shadow: 'rgba(31, 41, 55, 0.35)' }
];

/** 默认资料 */
export const DEFAULT_PROFILE = {
  nickname: '轻记用户',
  signature: '记录每一个值得记下的想法',
  avatar: 'violet',
  email: '',
  location: ''
};

/** 取头像预设（容错：未知 key 回落第一个） */
export function getAvatar(key) {
  return AVATAR_PRESETS.find((p) => p.key === key) || AVATAR_PRESETS[0];
}

/**
 * 昵称首字符
 *
 * 用 Array.from 而不是 s[0]：中文/emoji 都是多码元字符，
 * s[0] 可能切出半个代理对（显示成「？」）。Array.from 按码点切分。
 */
export function initialOf(nickname) {
  const s = String(nickname || '').trim();
  if (!s) return '记';
  return Array.from(s)[0];
}

/**
 * 清洗单行文本
 *
 * 为什么必须做：input 的 value 里混入换行符时，
 * 小程序端会把这两处文本渲染成多行，把卡片高度顶坏；
 * 同时连续空格会撑出横向溢出。统一压成单行。
 */
export function sanitizeLine(value) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')   // 换行/制表 → 空格
    .replace(/ {2,}/g, ' ')       // 连续空格压成一个
    .trim();
}

/**
 * 邮箱格式校验
 *
 * 刻意保持宽松：只要求「本地部分@域名」且域名含点、无空格。
 * 严格正则（RFC 5322）会把 user+tag@sub.domain.co 这类合法地址误杀，
 * 而邮箱在这里只是展示信息，不做投递，宽松更合适。
 */
export function isValidEmail(value) {
  const v = sanitizeLine(value);
  if (!v) return true;   // 留空 = 未填写，允许
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v);
}

/**
 * 计算字符数（按码点，与 maxlength 的语义对齐）
 */
export function charCount(value) {
  return Array.from(String(value ?? '')).length;
}

/**
 * 归一化资料：清洗 + 截断 + 兜底默认值
 * 从存储读到的旧数据、用户手输的脏数据都过这一道，组件层就不用再防御。
 * 邮箱在此处做格式校验：非法值直接清空（展示层不出现明显坏掉的地址）。
 */
export function normalizeProfile(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const nickname = sanitizeLine(src.nickname).slice(0, NICKNAME_MAX);
  const emailRaw = sanitizeLine(src.email).slice(0, EMAIL_MAX);
  return {
    nickname: nickname || DEFAULT_PROFILE.nickname,
    signature: sanitizeLine(src.signature).slice(0, SIGNATURE_MAX),
    avatar: AVATAR_PRESETS.some((p) => p.key === src.avatar) ? src.avatar : DEFAULT_PROFILE.avatar,
    email: isValidEmail(emailRaw) ? emailRaw : '',
    location: sanitizeLine(src.location).slice(0, 30)
  };
}

/** 读取资料（同步，任何时候都能拿到可用值） */
export function readProfile() {
  let raw = null;
  try {
    raw = uni.getStorageSync(PROFILE_KEY);
  } catch (e) {
    // 存储不可用（极端隐私模式）→ 静默降级到默认值，不打断页面
    raw = null;
  }
  return normalizeProfile(raw);
}

/** 写入资料（先归一化，保证存储里永远是干净的） */
export function writeProfile(profile) {
  const next = normalizeProfile(profile);
  try {
    uni.setStorageSync(PROFILE_KEY, next);
  } catch (e) {
    // 写失败时把错误抛给调用方，让界面能提示「保存失败」
    throw new Error('保存失败，请重试');
  }
  return next;
}

/**
 * 校验待保存的资料
 * @returns {{ ok: boolean, message?: string, field?: string, profile?: object }}
 */
export function validateProfile(draft) {
  const nickname = sanitizeLine(draft?.nickname);
  const signature = sanitizeLine(draft?.signature);
  const email = sanitizeLine(draft?.email);
  const location = sanitizeLine(draft?.location);

  if (!nickname) {
    return { ok: false, field: 'nickname', message: '昵称不能为空' };
  }
  if (charCount(nickname) > NICKNAME_MAX) {
    return { ok: false, field: 'nickname', message: `昵称最多 ${NICKNAME_MAX} 个字` };
  }
  if (charCount(signature) > SIGNATURE_MAX) {
    return { ok: false, field: 'signature', message: `签名最多 ${SIGNATURE_MAX} 个字` };
  }
  if (!isValidEmail(email)) {
    return { ok: false, field: 'email', message: '邮箱格式不正确' };
  }
  if (charCount(email) > EMAIL_MAX) {
    return { ok: false, field: 'email', message: `邮箱最多 ${EMAIL_MAX} 个字符` };
  }
  if (charCount(location) > 30) {
    return { ok: false, field: 'location', message: '所在地最多 30 个字' };
  }

  return {
    ok: true,
    profile: {
      nickname,
      signature,
      email,
      location,
      avatar: draft?.avatar
    }
  };
}

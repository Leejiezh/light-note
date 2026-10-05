<template>
  <view class="page" :style="pageStyle">
    <view class="content">
      <!-- ① 文字卡：标题 + 正文 -->
      <view class="card text-card">
        <input
          v-model="title"
          class="title-input"
          placeholder="标题"
          placeholder-class="ph-title"
          :maxlength="80"
          :adjust-position="false"
          aria-label="笔记标题"
          @focus="onFocus"
        />
        <view class="card-divider" />
        <scroll-view class="body-wrap" scroll-y :show-scrollbar="false">
          <textarea
            v-model="body"
            class="body-input"
            placeholder="记点什么…"
            placeholder-class="ph"
            :maxlength="-1"
            :auto-height="true"
            :focus="wantFocus"
            :show-confirm-bar="false"
            confirm-type="return"
            :adjust-position="false"
            :cursor-spacing="20"
            aria-label="笔记正文"
            @focus="onFocus"
          />
          <view class="blank" aria-label="收起键盘" @tap="hideKeyboard" />
        </scroll-view>
      </view>

      <!-- ② 图片卡：区块头 + 缩略图 + 添加格 -->
      <view class="card media-card">
        <view class="card-head">
          <view class="card-head-title">
            <Icon name="image" :size="28" color="var(--brand-500)" />
            <text class="card-label">图片</text>
          </view>
          <text class="card-count" :class="{ 'is-max': images.length >= MAX_IMAGES }">
            {{ images.length }}/{{ MAX_IMAGES }}
          </text>
        </view>
        <scroll-view class="media-scroll" scroll-x :show-scrollbar="false">
          <view class="media-inner">
            <view
              v-for="(img, i) in images"
              :key="img.key || `${img.preview}-${i}`"
              class="media-thumb"
              role="button"
              :aria-label="`预览第 ${i + 1} 张图片`"
              @tap="previewImage(i)"
            >
              <image class="media-img" :src="img.preview" mode="aspectFill" />
              <view
                class="media-x"
                role="button"
                :aria-label="`移除第 ${i + 1} 张图片`"
                @tap.stop="removeImage(i)"
              >
                <Icon name="close" :size="24" color="#ffffff" />
              </view>
            </view>

            <view
              v-if="images.length < MAX_IMAGES"
              class="media-add"
              role="button"
              aria-label="添加图片"
              @tap="pickImage"
            >
              <Icon name="plus" :size="44" color="var(--brand-500)" />
              <text class="media-add-label">添加</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- ③ 标签卡：区块头 + 彩色胶囊（选中实心填充标签自己的颜色） -->
      <view class="card tag-card">
        <view class="card-head">
          <view class="card-head-title">
            <Icon name="tag" :size="28" color="var(--brand-500)" />
            <text class="card-label">标签</text>
          </view>
          <text v-if="activeTag !== 'all'" class="card-current" :style="{ color: readTagColor(activeTag) }">
            {{ currentTagLabel }}
          </text>
        </view>
        <scroll-view class="tag-scroll" scroll-x :show-scrollbar="false">
          <view class="tag-inner">
            <view
              v-for="t in tagOptions"
              :key="t.key"
              class="chip"
              :class="{ 'is-on': activeTag === t.key }"
              :style="chipStyle(t)"
              role="button"
              :aria-label="`标签：${t.label}`"
              @tap="activeTag = t.key"
            >
              <view v-if="activeTag !== t.key" class="chip-dot" :style="{ background: dotColor(t) }" />
              <text class="chip-label">{{ t.label }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 底部操作：键盘弹出时隐藏，收起键盘后出现（与原编辑器同一套已验证行为） -->
    <view v-if="!kbHeight" class="footer">
      <view class="btn btn-ghost touch-target" role="button" aria-label="取消" @tap="onCancel">
        <text>取消</text>
      </view>
      <view
        class="btn btn-primary touch-target"
        :class="{ 'is-disabled': !canSave }"
        role="button"
        :aria-label="saving ? '正在保存' : '保存笔记'"
        @tap="onSave"
      >
        <text>{{ saving ? '保存中…' : '保存' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import Icon from '@/components/Icon.vue';
import { createRecord, getRecord, updateRecord, presignImage, uploadToMinio } from '@/api';
import type { RecordDraft, RecordVO } from '@/api';
import { errorMessage } from '@/utils/errorMessage';
import { ensureTagDict, readTagDict, readTagColor } from '@/utils/store/tags';

/** 已选图片：key 是落库用的 objectKey，preview 是本地临时路径（新图）或访问 URL（编辑加载） */
interface PickedImage {
  key: string | null;
  preview: string;
}

/** 图片数量上限（对齐常见社交 app 的九图） */
const MAX_IMAGES = 9;

const NOTE_ID = ref('');
const title = ref('');
const body = ref('');
/** 'all' = 未分类（后端 label 传 null） */
const activeTag = ref('all');
const images = ref<PickedImage[]>([]);
const saving = ref(false);

/** 编辑态的原记录：用于「有没有改动」的判断 */
let original: RecordVO | null = null;

/** 键盘高度（--kb 由 JS 写入，卡片区靠它顶到键盘上方） */
const kbHeight = ref(0);
let kbHandler: ((res: { height?: number }) => void) | null = null;

/** 新建时自动聚焦正文：省掉「先点一下」这一步 */
const wantFocus = ref(false);

const canSave = computed(() => !!(title.value.trim() || body.value.trim()));

const pageStyle = computed(() => `--kb: ${kbHeight.value}px;`);

/** 标签选项 = 未分类 + 字典标签（名称/顺序以后端字典为准） */
const tagOptions = computed(() => [
  { key: 'all', label: '未分类' },
  ...readTagDict().map((it) => ({ key: it.key, label: it.label }))
]);

/** 标签卡头部右侧：当前选中标签的展示名 */
const currentTagLabel = computed(() => tagOptions.value.find((t) => t.key === activeTag.value)?.label || '');

/** 选中态胶囊：实心填充标签自己的颜色；未分类兜底品牌紫 */
function chipStyle(t: { key: string }): Record<string, string> {
  if (t.key !== activeTag.value) return {};
  const color = t.key === 'all' ? 'var(--brand-500)' : readTagColor(t.key);
  return { background: color, color: '#ffffff' };
}

/** 未选中胶囊的小圆点：提示每个标签的身份色 */
function dotColor(t: { key: string }): string {
  return t.key === 'all' ? 'var(--text-disabled)' : readTagColor(t.key);
}

onLoad(async (query?: Record<string, string | undefined>) => {
  kbHandler = (res) => {
    kbHeight.value = res && res.height ? res.height : 0;
  };
  if (uni.onKeyboardHeightChange) uni.onKeyboardHeightChange(kbHandler);

  // 标签字典兜底：App.onLaunch 已拉过 → 直接返回；失败则本页再试一次
  ensureTagDict().catch(() => {});

  if (query?.id) {
    NOTE_ID.value = query.id;
    try {
      const r = await getRecord(query.id);
      original = r;
      title.value = r.title || '';
      body.value = r.content || '';
      activeTag.value = r.label || 'all';
      images.value = (r.images || []).map((url) => ({ key: parseObjectKey(url), preview: url }));
    } catch (e) {
      uni.showToast({ title: errorMessage(e, '加载失败'), icon: 'none' });
    }
  } else {
    // 新建：直接进编辑态
    wantFocus.value = true;
  }
});

onUnload(() => {
  if (kbHandler && uni.offKeyboardHeightChange) uni.offKeyboardHeightChange(kbHandler);
  kbHandler = null;
});

/** 聚焦：focus 事件的 detail 里带键盘高度，作为 onKeyboardHeightChange 的兜底 */
function onFocus(e: { detail?: unknown }) {
  const d = e.detail;
  const h = d && typeof d === 'object' && 'height' in d ? (d as { height?: number }).height : undefined;
  if (h) kbHeight.value = h;
}

/** 收起键盘：正文下方空白区是唯一入口 */
function hideKeyboard() {
  uni.hideKeyboard();
  kbHeight.value = 0;
}

/** 从访问 URL 反推 objectKey（后端格式 img/{userId}/{date}/{uuid}.{ext}，见 FileServiceImpl.buildObjectKey） */
function parseObjectKey(url: string): string | null {
  if (!url) return null;
  const path = url.split('?')[0];
  const i = path.indexOf('/img/');
  return i >= 0 ? path.slice(i + 1) : null;
}

/** 调起相册并返回选中图片的路径与大小 */
function chooseImage(): Promise<{ path: string; size: number }> {
  return new Promise((resolve, reject) => {
    const done = (path: string, size: number) => {
      if (path && size > 0) resolve({ path, size });
      else reject(new Error('未能读取所选图片'));
    };

    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album'],
        success: (res) => {
          // ★ uni 的 tempFiles 类型定义松散（tempFilePath 可选、无 size、甚至声明成数组并集），
          // 运行时它恒为文件数组，这里统一规整成窄形状再取值
          const files = res.tempFiles as unknown as Array<{
            tempFilePath?: string;
            path?: string;
            size?: number;
          }>;
          const f = files[0] || {};
          done(f.tempFilePath || f.path || '', f.size || 0);
        },
        fail: reject
      });
      return;
    }
    // #endif

    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const files = res.tempFiles as unknown as Array<{
          path?: string;
          size?: number;
        }>;
        const f = files[0] || {};
        const path = f.path || (res.tempFilePaths && res.tempFilePaths[0]) || '';
        done(path, f.size || 0);
      },
      fail: reject
    });
  });
}

/** 用户取消选图不算失败：chooseMedia / chooseImage 的 cancel 都走 fail 回调，按 errMsg 识别 */
function isCancel(err: unknown): boolean {
  if (typeof err === 'string') return /cancel/i.test(err);
  const errMsg = (err as { errMsg?: string } | null | undefined)?.errMsg;
  return typeof errMsg === 'string' && /cancel/i.test(errMsg);
}

/** 按扩展名推 MIME；相册图以 jpg/png 为主，webp/gif 兜底，其余一律按 jpeg */
function imageMime(path: string): string {
  const ext = (path.split('.').pop() || '').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

/**
 * 选图 → 立即上传（presign → 直传 MinIO）→ 暂存 objectKey + 本地路径预览。
 * 立即上传而不是等保存：成败马上可见；未保存的对象停在 TEMP，24h 后被后端清理，
 * 前端无需删除。上传失败不阻断编辑，只提示。
 */
async function pickImage() {
  if (images.value.length >= MAX_IMAGES) return;

  let picked: { path: string; size: number };
  try {
    picked = await chooseImage();
  } catch (err) {
    if (!isCancel(err)) {
      uni.showToast({ title: errorMessage(err, '未能选择图片'), icon: 'none' });
    }
    return;
  }

  uni.showLoading({ title: '上传中…', mask: true });
  try {
    const presign = await presignImage(imageMime(picked.path), picked.size, 'note');
    await uploadToMinio(presign, picked.path);
    images.value.push({ key: presign.objectKey, preview: picked.path });
    uni.hideLoading();
  } catch (e) {
    uni.hideLoading();
    uni.showToast({ title: errorMessage(e, '图片上传失败'), icon: 'none' });
  }
}

function removeImage(i: number) {
  images.value.splice(i, 1);
}

function previewImage(i: number) {
  const urls = images.value.map((x) => x.preview).filter(Boolean);
  if (!urls.length) return;
  uni.previewImage({
    urls,
    current: urls[i] || urls[0],
    fail: () => uni.showToast({ title: '无法预览该图片', icon: 'none' })
  });
}

/** 今天日期 yyyy-MM-dd（后端 recordDate 必填，编辑器默认当天） */
function todayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 有改动：编辑态与原记录对比，新建态看是否有内容 */
function isDirty(): boolean {
  if (!original) return !!(title.value.trim() || body.value.trim() || images.value.length);
  return (
    title.value.trim() !== (original.title || '').trim() ||
    body.value !== (original.content || '') ||
    (activeTag.value === 'all' ? null : activeTag.value) !== (original.label || null) ||
    images.value.length !== (original.images || []).length
  );
}

function onCancel() {
  if (!isDirty()) {
    uni.navigateBack();
    return;
  }
  uni.showModal({
    title: '放弃编辑？',
    content: '当前内容尚未保存，确定退出？',
    confirmText: '放弃',
    confirmColor: '#EF4444',
    success: ({ confirm }) => {
      if (confirm) uni.navigateBack();
    }
  });
}

/**
 * 保存 ★
 * 新建 → POST /record；编辑 → PUT /record。
 * images 传 objectKey 数组；若后端 URL 反推不出 key（格式异常），宁可不提交 images，
 * 让后端保留旧图，避免把无法识别的图误标 DETACHED。
 */
async function onSave() {
  if (!canSave.value || saving.value) return;
  saving.value = true;

  try {
    // 显式收集可用的 objectKey：任一图片反推不出 key 就整体不提交 images，
    // 让后端保留旧图，避免把无法识别的图误标 DETACHED。
    const keys: string[] = [];
    let allParsed = true;
    for (const img of images.value) {
      if (typeof img.key !== 'string') {
        allParsed = false;
        break;
      }
      keys.push(img.key);
    }

    const payload: RecordDraft = {
      title: title.value.trim(),
      content: body.value,
      label: activeTag.value === 'all' ? null : activeTag.value,
      images: allParsed ? keys : undefined,
      recordDate: todayStr()
    };

    if (NOTE_ID.value) {
      await updateRecord({ ...payload, id: NOTE_ID.value });
    } else {
      await createRecord(payload);
    }

    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 400);
  } catch (e) {
    uni.showToast({ title: errorMessage(e, '保存失败'), icon: 'none' });
  } finally {
    saving.value = false;
  }
}
</script>

<style lang="scss" scoped>
/*
 * ★ 三卡排版：灰底页面（与全 app 一致）+ 三张白色圆角卡片
 * 文字卡（占满剩余空间）→ 图片卡 → 标签卡，每张卡自带区块头，结构清晰。
 * 导航交给系统导航栏（pages.json default），底部是取消/保存操作条。
 */
.page {
  display: flex;
  flex-direction: column;
  /* 小程序端必须用确定高度，min-height 会让 flex:1 失效（正文只占半屏） */
  height: 100vh;
  box-sizing: border-box;
  background: var(--bg-page);
  /* 键盘高度由 JS 写入 --kb：键盘弹出时卡片区随之顶起（底部操作条此时隐藏） */
  padding-bottom: var(--kb, 0px);
}

/* ═══════════ 内容区：卡片容器 ═══════════ */
.content {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-4;
  overflow: hidden;
}

.card {
  background: var(--bg-surface);
  border-radius: $radius-lg;
  box-shadow: var(--shadow-sm);
  padding: $space-4;
  /* 卡片进场：与「我的」页一致的轻量动效（只动 transform/opacity） */
  animation: card-rise $duration-base $ease-out;
}

@keyframes card-rise {
  from {
    opacity: 0;
    transform: translateY(12rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 区块头：小图标 + 标签 + 右侧计数/当前选中 */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-3;
}

.card-head-title {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.card-label {
  font-size: $text-xs;
  font-weight: $font-medium;
  color: var(--text-tertiary);
  letter-spacing: 2rpx;
}

.card-count {
  font-size: $text-xs;
  color: var(--text-disabled);
  font-variant-numeric: tabular-nums;

  &.is-max {
    color: var(--semantic-warning);
  }
}

.card-current {
  font-size: $text-xs;
  font-weight: $font-medium;
}

/* ═══════════ ① 文字卡 ═══════════ */
.text-card {
  flex: 1 1 auto;
  min-height: 200rpx;
  display: flex;
  flex-direction: column;
}

.title-input {
  flex: none;
  width: 100%;
  box-sizing: border-box;
  /* ★ 显式高度 + 等值行高：uni input 默认高度仅 ~1.4rem，装不下大字号行盒，
     文字会从框顶溢出被裁（复现过）。等值行高同时负责文字垂直居中。 */
  height: 96rpx;
  line-height: 96rpx;
  font-size: $text-xl;
  font-weight: $font-medium;
  color: var(--text-primary);
  padding: 0;
}

/* 标题与正文之间的发丝线：给文字卡内部分层 */
.card-divider {
  flex: none;
  height: 2rpx;
  margin-top: $space-2;
  background: var(--border-default);
}

/*
 * ★ 正文区：填满文字卡剩余空间，内部滚动
 * min-height: 0 是关键 —— 覆盖 flex 项目的「自动最小尺寸」，
 * 否则内容会把容器撑开而不是出现滚动条
 */
.body-wrap {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

.body-input {
  width: 100%;
  /* 高度随文字自动增高（auto-height），滚动交给外层 .body-wrap */
  min-height: 120rpx; /* 空笔记也有一块可点可输入的区域 */
  font-size: $text-base;
  line-height: $leading-loose;
  color: var(--text-primary);
  padding: $space-3 0;
  box-sizing: border-box;
}

/* 文字下方的空白：不属于 textarea，点一下即可收起键盘 */
.blank {
  min-height: 20vh;
}

/* ═══════════ ② 图片卡 ═══════════ */
.media-card {
  flex: none;
}

.media-scroll {
  width: 100%;
  white-space: nowrap;
}

.media-inner {
  display: inline-flex;
  gap: $space-3;
}

/* 缩略图 */
.media-thumb {
  flex: none;
  position: relative;
  width: 144rpx;
  height: 144rpx;
  border-radius: $radius-md;
  overflow: hidden;
  background: var(--bg-muted);
}

.media-img {
  width: 100%;
  height: 100%;
}

/* × 移除角标：盖在任意用户图片上的半透明深色遮罩（同 mine.vue 头像高光，属内容遮罩例外） */
.media-x {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: $radius-full;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 添加格：品牌紫浅底 + 虚线描边，是图片卡里的主操作 */
.media-add {
  flex: none;
  width: 144rpx;
  height: 144rpx;
  border: 2rpx dashed $brand-300;
  border-radius: $radius-md;
  background: $brand-50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  transition: transform $duration-fast $ease-out, background-color $duration-fast ease;

  &:active {
    transform: scale(0.94);
    background: $brand-100;
  }
}

.media-add-label {
  font-size: 22rpx;
  font-weight: $font-medium;
  color: $brand-600;
}

/* ═══════════ ③ 标签卡 ═══════════ */
.tag-card {
  flex: none;
}

.tag-scroll {
  width: 100%;
  white-space: nowrap;
}

.tag-inner {
  display: inline-flex;
  gap: $space-2;
}

.chip {
  flex: none;
  height: 68rpx;
  padding: 0 $space-3;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  border-radius: $radius-full;
  background: var(--bg-muted);
  transition: transform $duration-fast $ease-out, background-color $duration-fast ease;

  &:active {
    transform: scale(0.94);
  }
}

.chip-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: $radius-full;
  flex: none;
}

.chip-label {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: var(--text-secondary);
}

/* 选中态：底色由 JS 内联成标签自己的颜色，这里只负责白字 */
.chip.is-on {
  .chip-label {
    color: #ffffff;
  }
}

/* ═══════════ 底部操作条 ═══════════ */
.footer {
  flex: none;
  display: flex;
  gap: $space-3;
  padding: $space-3 $space-4;
  padding-bottom: calc(#{$space-3} + env(safe-area-inset-bottom));
  background: var(--bg-surface);
  border-top: 2rpx solid var(--border-default);
}

.btn {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $text-base;
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.97);
  }
}

.btn-ghost {
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.btn-primary {
  background: $brand-500;
  color: #ffffff;
  font-weight: $font-medium;

  &.is-disabled {
    opacity: 0.4;
  }
}
</style>

<!--
  ⚠️ placeholder 样式必须放非 scoped 块：小程序 placeholder-class 的类名
  挂在原生 input / textarea 内部，scoped 属性选择器够不到（同 rich-text 的处理）。
-->
<style lang="scss">
.ph-title {
  color: var(--text-disabled);
  font-size: $text-sm;
}

.ph {
  color: var(--text-disabled);
  font-size: $text-sm;
}
</style>

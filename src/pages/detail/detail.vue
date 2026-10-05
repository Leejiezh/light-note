<template>
  <view class="page">
    <view v-if="loading" class="loading">加载中…</view>

    <template v-else-if="record">
      <!-- 标题 -->
      <text class="title">{{ record.title || '无标题' }}</text>

      <!-- 元信息 -->
      <view class="meta">
        <text
          v-if="record.label && record.label !== 'all'"
          class="tag"
          :style="{ color: tagColors.color, background: tagColors.background }"
        >
          {{ tagLabel }}
        </text>
        <text class="time">{{ displayTime }}</text>
      </view>

      <!-- 正文：分段渲染 ★ -->
      <view class="prose">
        <template v-for="(seg, si) in segments" :key="si">
          <!-- 普通富文本段：注意是 :nodes，不是 v-html -->
          <rich-text
            v-if="seg.type === 'richtext'"
            class="md-block"
            :nodes="seg.html"
          />

          <!--
            图片段：用原生 <image> 渲染 ★
            为什么不交给 rich-text：rich-text 内部的 <img> 对「本机路径」
            （相册选出的 wxfile://…）支持不可靠，真机上常直接加载不出来；
            原生 <image> 才是稳的。点一下可全屏预览。
          -->
          <image
            v-else-if="seg.type === 'image'"
            class="md-image"
            :src="seg.src"
            :aria-label="seg.alt || '图片'"
            mode="widthFix"
            @tap="onPreviewImage(seg.src)"
          />

          <!-- 待办段：新后端不存 checks，旧 markdown 待办只读展示（不可勾选） -->
          <TodoList v-else-if="seg.type === 'todo'" :items="seg.items" />
        </template>
      </view>

      <!--
        图片附件：后端 /record 的 images 独立于正文存储（编辑器两段式上传），
        与正文图片段一样用原生 <image> 渲染，点一下可全屏预览。
      -->
      <view v-if="record.images?.length" class="attachments">
        <image
          v-for="(src, i) in record.images"
          :key="i"
          class="md-image"
          :src="src"
          mode="widthFix"
          @tap="onPreviewImage(src)"
        />
      </view>

      <!-- 底部操作 -->
      <view class="actions">
        <view class="btn btn-ghost touch-target" role="button" aria-label="编辑笔记" @tap="goEdit">
          <text>编辑</text>
        </view>
        <view class="btn btn-danger touch-target" role="button" aria-label="删除笔记" @tap="onDelete">
          <text>删除</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import TodoList from '@/components/TodoList.vue';
import { parseToSegments } from '@/utils/markdown';
import type { Segment } from '@/utils/markdown';
import { getRecord, deleteRecord } from '@/api';
import type { RecordVO } from '@/api';
import { errorMessage } from '@/utils/errorMessage';
import { ensureTagDict, readTagLabel, readTagColors } from '@/utils/store/tags';

const NOTE_ID = ref('');
const record = ref<RecordVO | null>(null);
const segments = ref<Segment[]>([]);
const loading = ref(true);

/** 标签名与配色统一来自字典（GET /dict/note_label） */
const tagLabel = computed(() => readTagLabel(record.value?.label || ''));
const tagColors = computed(() => readTagColors(record.value?.label || ''));

/**
 * 时间展示：优先「记录日期」（后端 recordDate，支持补记），
 * 旧数据没有时退回 updatedAt 的完整时间。
 */
const displayTime = computed(() => {
  if (record.value?.recordDate) return record.value.recordDate;
  return formatTime(record.value?.updatedAt || '');
});

onLoad((query?: Record<string, string | undefined>) => {
  NOTE_ID.value = query?.id || '';
});

/**
 * ★ 每次显示都重新拉取最新数据：
 * onLoad 只在页面首次创建时触发一次，从编辑器保存返回走的是 onShow，
 * 不刷新的话详情页会一直显示编辑前的旧内容。
 */
onShow(() => {
  if (NOTE_ID.value) load();
});

async function load() {
  // 仅首屏显示全屏加载态；返回刷新时保留旧内容，静默更新，避免闪烁
  if (!record.value) loading.value = true;
  // 标签字典与正文并行加载：不阻塞正文渲染，失败静默降级
  ensureTagDict().catch(() => {});
  try {
    const res = await getRecord(NOTE_ID.value);
    record.value = res;
    // ★ 分段：新后端不存 checks，旧 markdown 待办按未勾选只读展示
    segments.value = parseToSegments(res.content, []);
  } catch (e) {
    uni.showToast({ title: errorMessage(e, '加载失败'), icon: 'none' });
  } finally {
    loading.value = false;
  }
}

function goEdit() {
  uni.navigateTo({ url: `/pages/editor/editor?id=${NOTE_ID.value}` });
}

/**
 * ★ 点图片全屏预览
 *
 * 传全部图片地址是为了让用户能在预览器里左右翻；
 * 预览器由系统渲染，相册选出的本机图片在这里一定能正常显示。
 */
function onPreviewImage(src: string) {
  // 正文图片段 + 后端附件图（record.images）合并，预览器里可连续翻
  const segImgs = segments.value
    .filter((s): s is Extract<Segment, { type: 'image' }> => s.type === 'image' && !!s.src)
    .map((s) => s.src);
  const urls = [...segImgs, ...(record.value?.images || [])];
  if (!urls.length) return;

  uni.previewImage({
    urls,
    current: src || urls[0],
    fail: () => uni.showToast({ title: '无法预览该图片', icon: 'none' })
  });
}

function onDelete() {
  uni.showModal({
    title: '删除笔记',
    content: '删除后将永久清除，无法恢复。',
    confirmText: '删除',
    confirmColor: '#EF4444',
    success: async ({ confirm }) => {
      if (!confirm) return;
      try {
        await deleteRecord(NOTE_ID.value);
        uni.showToast({ title: '已删除', icon: 'none' });
        setTimeout(() => uni.navigateBack(), 600);
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' });
      }
    }
  });
}

function formatTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: $space-4;
  padding-bottom: $space-10;
}

.loading {
  text-align: center;
  color: var(--text-secondary);
  font-size: $text-sm;
  padding: $space-10 0;
}

.title {
  display: block;
  font-size: $text-2xl;
  font-weight: $font-bold;
  color: var(--text-primary);
  line-height: $leading-tight;
  margin-bottom: $space-3;
}

.meta {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-5;
}

.tag {
  font-size: $text-xs;
  /* 文字色与底色由字典配色内联给出（见 tagColors），避免两处色值来源 */
  padding: 4rpx 14rpx;
  border-radius: $radius-full;
}

.time {
  font-size: $text-xs;
  color: var(--text-tertiary);
}

/* 正文排版 */
.prose {
  font-size: $text-base;
  line-height: $leading-loose;
  color: var(--text-primary);
}

.actions {
  display: flex;
  gap: $space-3;
  margin-top: $space-8;
}

/*
 * ★ 图片段（原生 <image>）
 * 单靠 width:100% 不够：<image> 有默认尺寸，必须配合 mode="widthFix"
 * 让高度按原图比例自适应，否则会露出灰色底。
 */
.md-image {
  display: block;
  width: 100%;
  margin: $space-3 0;
  border-radius: $radius-md;
  background: var(--bg-muted);
}

.btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: $font-medium;
  transition: transform $duration-fast $ease-out;

  &:active {
    transform: scale(0.97);
  }
}

.btn-ghost {
  background: var(--bg-muted);
  color: var(--text-primary);
}

.btn-danger {
  background: transparent;
  color: $error-500;
  border: 2rpx solid $error-500;
}
</style>

<!--
  ⚠️ rich-text 内容样式必须放在「非 scoped」的 style 里。
  原因（官方文档）：rich-text 内部的节点不在组件的 scoped 作用域内，
  scoped 样式不会应用到 rich-text 渲染出的标签上。
-->
<style lang="scss">
.prose {
  .md-block,
  rich-text {
    display: block;
  }

  /* ⚠️ 小程序端不支持标签选择器（p/h1 等不是内置组件，够不到 rich-text
     内部节点），一律用解析器输出的 md- class 选择器。 */
  .md-h1 { font-size: 48rpx; font-weight: 700; margin: 40rpx 0 16rpx; line-height: 1.3; }
  .md-h2 { font-size: 40rpx; font-weight: 700; margin: 36rpx 0 16rpx; line-height: 1.3; }
  .md-h3 { font-size: 36rpx; font-weight: 600; margin: 32rpx 0 12rpx; line-height: 1.35; }
  .md-h4, .md-h5, .md-h6 { font-size: 32rpx; font-weight: 600; margin: 28rpx 0 12rpx; }

  .md-p {
    margin: 0 0 24rpx;
    line-height: 1.75;
  }

  .md-strong { font-weight: 700; }
  .md-em { font-style: italic; }
  .md-del { text-decoration: line-through; opacity: 0.6; }

  .md-a {
    color: #6D28D9;
    text-decoration: underline;
  }

  .md-ul, .md-ol {
    margin: 0 0 24rpx;
    padding-left: 40rpx;
  }
  .md-li { margin-bottom: 8rpx; line-height: 1.7; }

  .md-blockquote {
    margin: 0 0 24rpx;
    padding: 16rpx 24rpx;
    border-left: 6rpx solid #7C3AED;
    background: #F5F3FF;
    color: #45454F;
    border-radius: 0 8rpx 8rpx 0;
  }

  /* rich-text 支持 pre / code，无需降级模拟 */
  .md-pre {
    margin: 0 0 24rpx;
    padding: 24rpx;
    background: #232329;
    color: #F4F4F7;
    border-radius: 16rpx;
    font-size: 26rpx;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* 代码块内的 code 只继承字体；行内 code 用专属 class（见下），
     避免在 rich-text 内部写后代选择器（小程序端不可靠） */
  .md-code {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 0.9em;
  }

  .md-code-inline {
    font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 0.9em;
    background: #F4F4F7;
    color: #6D28D9;
    padding: 2rpx 10rpx;
    border-radius: 8rpx;
  }

  .md-hr {
    display: block;
    margin: 40rpx 0;
    border: 0;
    border-top: 2rpx solid #E6E6EC;
    height: 0;
  }

  .md-img {
    max-width: 100%;
    border-radius: 16rpx;
    margin: 16rpx 0;
  }

  /* 搜索高亮的 span（服务端返回 highlights 时使用） */
  .hl {
    background: #FEF08A;
    color: #232329;
    border-radius: 4rpx;
    padding: 0 4rpx;
  }
}
</style>

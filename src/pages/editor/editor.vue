<template>
  <view class="page" :class="{ 'is-editing': editing }" :style="pageStyle">
    <!-- 标题输入 -->
    <input
      v-model="title"
      class="title-input"
      placeholder="标题"
      placeholder-class="ph"
      :maxlength="80"
      aria-label="笔记标题"
    />

    <!--
      ★ 正文区：始终填满标题以下的剩余空间，内部滚动
      - textarea 随内容增高（auto-height），包在 scroll-view 里：
        内容短 → 原样展示；内容长 → 在这一块里上下滑动（键盘弹出时也一样可滑）
      - 文字下方的空白不属于 textarea，编辑态点一下即可收起键盘
    -->
    <scroll-view class="body-wrap" scroll-y :show-scrollbar="false">
      <textarea
        v-model="body"
        class="body-input"
        placeholder="开始记录…支持 Markdown"
        placeholder-class="ph"
        :maxlength="-1"
        :auto-height="true"
        :focus="wantFocus"
        :cursor="caret"
        :show-confirm-bar="false"
        confirm-type="return"
        :adjust-position="false"
        :hold-keyboard="true"
        :cursor-spacing="20"
        aria-label="笔记正文"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
      />
      <view class="blank" aria-label="收起键盘" @tap="hideKeyboard" />
    </scroll-view>

    <!-- 工具栏 ★ 编辑态时固定在键盘正上方（不是页面底部的一行） -->
    <view v-if="showToolbar" class="toolbar">
      <scroll-view class="tool-scroll" scroll-x :show-scrollbar="false">
        <view class="tool-inner">
          <view
            v-for="t in tools"
            :key="t.key"
            class="tool-btn"
            :class="{ 'is-on': pendingFormat === t.key }"
            role="button"
            :aria-label="pendingFormat === t.key ? t.label + '，已开启' : t.label"
            @tap="onToolTap(t.key)"
          >
            <text class="tool-label">{{ t.label }}</text>
          </view>
        </view>
      </scroll-view>
      <!--
        ★ 收起键盘的唯一常驻入口
        键盘右下角按钮已设为「换行」（confirm-type="return"），不再是「完成」，
        所以收键盘全靠这里 + 正文下方空白区，不要再给 textarea 绑 @confirm 收键盘
      -->
      <view
        class="tool-btn tool-collapse"
        role="button"
        aria-label="收起键盘"
        @tap="hideKeyboard"
      >
        <text class="tool-label">收起</text>
      </view>
    </view>

    <!-- 底部操作：编辑态（键盘弹出）时隐藏，收起键盘后出现 -->
    <view v-if="!editing" class="footer">
      <view class="btn btn-ghost touch-target" role="button" aria-label="取消" @tap="onCancel">
        <text>取消</text>
      </view>
      <view
        class="btn btn-primary touch-target"
        :class="{ 'is-disabled': !canSave }"
        role="button"
        aria-label="保存笔记"
        @tap="onSave"
      >
        <text>{{ saving ? '保存中…' : '保存' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { onLoad, onUnload } from '@dcloudio/uni-app';
import {
  TOOLBAR_SNIPPETS,
  INLINE_FORMATS,
  wrapRange,
  insertImageBlock,
  normalizeChecks,
  resetChecks,
  extractExcerpt
} from '@/utils/markdown';
import { getNote, createNote, updateNote } from '@/api';
import type { Note, NoteDraft } from '@/api';
import { errorMessage } from '@/utils/errorMessage';

/** 行内格式 key（与 rules.ts 的 INLINE_FORMATS 同源） */
type FormatKey = keyof typeof INLINE_FORMATS;

const NOTE_ID = ref('');
const title = ref('');
const body = ref('');
const saving = ref(false);

/** 原笔记（编辑态），用于判断正文是否变更 */
let original: Note | null = null;

/** ★ 光标位置：小程序无法直接读取，靠 input 事件记录（也是选区能力失效时的降级来源） */
const cursorPos = ref(-1);

/**
 * ★ 挂起的行内格式（B / I / S / 代码）
 * null = 未开启；开启期间按钮高亮，之后输入的文字在关闭时被一次性包上标记
 */
const pendingFormat = ref<FormatKey | null>(null);

/** 挂起区间的起点（开启那一刻的光标位置），-1 表示无效 */
let pendingStart = -1;

/**
 * ★ 一次性光标定位：绑定在 textarea 的 :cursor
 * 小程序没有 setSelection 接口，只能「改 cursor 属性 + 重新 focus」让它生效；
 * 用完必须撤成 -1，否则用户下次自己点输入框时会被拽回旧位置。
 */
const caret = ref(-1);

/** 正在做光标复位（会短暂失焦）：期间忽略 blur 引起的状态变化，否则样式栏会闪一下 */
let placing = false;

/**
 * ★ 键盘高度
 * textarea 上关掉了自动上推（adjust-position=false），改为自己把页面底部让出来，
 * 否则键盘会盖住工具栏和「保存」按钮（连「收起」都点不到）。
 */
const kbHeight = ref(0);
let kbHandler: ((res: { height?: number }) => void) | null = null;

/**
 * ★ 聚焦开关
 * - 新建笔记时置 true：内容为空时可点区域小，省掉「先点一下」这步
 * - 写入标记后由 placeCaret 置 false → true：小程序只在 focus 时才读 cursor 属性
 */
const wantFocus = ref(false);

/** 是否正在编辑（textarea 聚焦）：H5 端没有键盘高度事件，靠它兜底显示工具栏 */
const focused = ref(false);

/** 工具栏只在编辑态出现 —— 键盘收起时不占页面底部 */
const showToolbar = computed(() => {
  // #ifdef H5
  // H5 没有软键盘高度事件，且点击工具栏会让 textarea 失焦，所以保持常驻
  return true;
  // #endif
  // eslint-disable-next-line no-unreachable -- 上一行的 return 只存在于 H5 条件编译分支，小程序端这里可达
  return focused.value || kbHeight.value > 0;
});

/**
 * ★ 编辑态 = 键盘弹出中
 * 决定：隐藏「取消/保存」、显示键盘上方样式栏、页面底部只给键盘+样式栏让位
 */
const editing = computed(() => {
  // #ifdef H5
  return focused.value;
  // #endif
  // eslint-disable-next-line no-unreachable -- 上一行的 return 只存在于 H5 条件编译分支，小程序端这里可达
  return focused.value || kbHeight.value > 0;
});

/**
 * 把键盘高度交给 CSS 变量，样式栏和页面留白都靠它对齐键盘
 * （用 CSS 变量而不是内联 px，是为了能和 rpx 一起参与 calc）
 */
const pageStyle = computed(() => `--kb: ${kbHeight.value}px;`);

const tools: { key: string; label: string }[] = [
  { key: 'b', label: 'B' },
  { key: 'i', label: 'I' },
  { key: 'del', label: 'S' },
  { key: 'h', label: 'H' },
  { key: 'ul', label: '列表' },
  { key: 'ol', label: '1.' },
  { key: 'todo', label: '待办' },
  { key: 'quote', label: '引用' },
  { key: 'code', label: '代码' },
  { key: 'hr', label: '分割' },
  { key: 'image', label: '图片' }
];

const canSave = computed(() => !!(title.value.trim() || body.value.trim()));

onLoad(async (query?: Record<string, string | undefined>) => {
  // ★ 监听键盘高度：配合 textarea 的 adjust-position=false，把底部工具栏顶到键盘上方
  kbHandler = (res) => {
    kbHeight.value = res && res.height ? res.height : 0;
  };
  if (uni.onKeyboardHeightChange) uni.onKeyboardHeightChange(kbHandler);

  if (query?.id) {
    NOTE_ID.value = query.id;
    try {
      const res = await getNote(query.id);
      original = res;
      title.value = res.title || '';
      body.value = res.body || '';
    } catch (e) {
      uni.showToast({ title: '加载失败', icon: 'none' });
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

/**
 * uni textarea 的 input 事件
 * 运行时 detail 一定是 { value, cursor }；类型上继承 Event 并把 detail 放宽为可选，
 * 是为了让模板 @input 绑定通过 vue-tsc（模板按 DOM Event 签名校验，Event 没有 detail）
 */
interface UniTextareaInputEvent extends Event {
  detail?: { value: string; cursor?: number };
}

/**
 * uni textarea 的 focus 事件
 * 运行时 detail 是 { height }（键盘高度）；类型上并入 DOM FocusEvent 的 detail: number，
 * 是为了让模板 @focus 绑定通过 vue-tsc。运行时只取对象形态的 height。
 */
interface UniTextareaFocusEvent {
  detail?: number | { height?: number };
}

/**
 * 记录光标位置
 * ⚠️ 部分安卓机型 e.detail.cursor 可能不准，实机需验证
 */
function onInput(e: UniTextareaInputEvent) {
  // 运行时 detail 恒存在，防御分支仅为满足类型（见上方接口注释）
  if (!e.detail) return;
  body.value = e.detail.value;
  cursorPos.value = e.detail.cursor ?? -1;
}

/** 聚焦：focus 事件的 detail 里也带键盘高度，作为 onKeyboardHeightChange 的兜底 */
function onFocus(e: UniTextareaFocusEvent) {
  focused.value = true;
  const d = e.detail;
  const h = d && typeof d === 'object' ? d.height : undefined;
  if (h) kbHeight.value = h;
}

function onBlur() {
  // ★ 光标复位造成的瞬时失焦：直接忽略，否则样式栏会闪一下
  if (placing) return;

  // 只改聚焦态：键盘高度交给 onKeyboardHeightChange，
  // 避免某些机型「失焦但键盘还在」时把样式栏误藏起来
  focused.value = false;

  // #ifndef H5
  // 真正失焦（系统收起键盘、页面切走）→ 给挂起的格式补上右标记，
  // 否则正文里会留下一个没闭合的 **
  // 传 false：不能顺手复位光标，否则会重新 focus 把键盘拉回来
  // H5 端点击工具栏本身就会让 textarea 失焦，这条在 H5 上必须关掉
  closeInlineFormat(false);
  // #endif
}

/**
 * 收起键盘 ★
 * 三个入口：正文下方空白区、工具栏「收起」、键盘「完成」。
 * textarea 设了 hold-keyboard（否则点工具栏会把键盘顶掉），所以必须显式调 hideKeyboard。
 */
function hideKeyboard() {
  // ★ 先给挂起的行内格式收尾，否则标记永远补不上
  //   传 false：这里是「要收键盘」，不能顺手复位光标把键盘拉回来
  closeInlineFormat(false);
  uni.hideKeyboard();
  // 不等 blur / 键盘高度回调（有时延），先复位，避免样式栏停在屏幕底部
  focused.value = false;
  kbHeight.value = 0;
}

/**
 * 工具栏入口
 * - 行内格式（B / I / S / 代码）→ 开关式「挂起格式」
 * - 图片 → ★ 调起本机相册，插入用户真正选中的那张图
 * - 其余（标题 / 列表 / 引用 …）→ 直接把模板插到光标处
 */
function onToolTap(key: string) {
  if (key in INLINE_FORMATS) {
    toggleInlineFormat(key as FormatKey);
    return;
  }
  if (key === 'image') {
    pickImage();
    return;
  }
  insert(key);
}

/**
 * 在光标处插入语法片段（块级 / 插入类）
 * 若光标位置不可靠，降级为追加到末尾
 * （图片不在这里 —— 见 pickImage）
 */
function insert(key: string) {
  const snippet = TOOLBAR_SNIPPETS[key];
  if (!snippet) return;

  const pos = cursorPos.value < 0 ? body.value.length : cursorPos.value;
  body.value = body.value.slice(0, pos) + snippet + body.value.slice(pos);
  cursorPos.value = pos + snippet.length;
}

/**
 * ★ 图片按钮：调起本机相册 → 落盘持久化 → 把真实路径插进正文
 *
 * 不再往正文里塞 `![图片描述](图片链接)` 这种占位模板 —— 那是假的，
 * 用户还得自己把描述和链接改掉。现在直接拿用户选中的那张图。
 *
 * 三个必须处理的平台差异：
 *   1. 相册接口要求用户手势触发（点击按钮天然满足）
 *   2. 返回的临时路径只在「当前小程序生命周期」有效，直接写进笔记
 *      会导致下次冷启动图片丢失 → 必须先落盘（见 persistImage）
 *   3. 相册权限被拒时系统不会再弹授权框，必须引导去设置页，
 *      否则用户只会看到「点了没反应」
 */
async function pickImage() {
  // 先给挂起的行内格式收尾：选图过程中 textarea 会失焦，
  // 不收尾正文里会留下一个没闭合的 **
  // 传 false：这是被动失焦，不要复位光标把键盘先弹回来
  closeInlineFormat(false);

  let temp: string;
  try {
    temp = await chooseOneImage();
  } catch (err) {
    onPickFail(err);
    return;
  }
  if (!temp) return;

  uni.showLoading({ title: '处理中…', mask: true });
  let path: string;
  try {
    path = await persistImage(temp);
  } catch (e) {
    path = temp; // 兜底：落盘失败也先插临时路径，本次会话仍能看
  }
  // ★ 先关 loading 再插：showToast 与 showLoading 共用同一个容器，
  //   顺序反了会把「已插入图片」的提示一起关掉
  uni.hideLoading();

  insertImage(path);
}

/**
 * 调起相册并返回选中的图片路径
 *
 * 优先用新接口：chooseImage 自基础库 2.21.0 起官方已「不再维护」，
 * 建议改用 chooseMedia。但 chooseMedia 不能保证小程序以外的平台
 * （H5 预览）有实现，所以只在微信小程序里用它，其余平台继续用 chooseImage。
 */
function chooseOneImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    const done = (p: string) => (p ? resolve(p) : reject(new Error('未取到图片')));

    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && typeof wx.chooseMedia === 'function') {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album'],
        success: (res) => {
          const f = (res.tempFiles && res.tempFiles[0]) || {};
          done(f.tempFilePath || f.path || '');
        },
        fail: reject
      });
      return;
    }
    // #endif

    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'], // 压过的图：别把几 MB 原图写进笔记正文
      sourceType: ['album'],    // 按要求只开相册，不弹「拍照 / 相册」选择
      success: (res) => done((res.tempFilePaths && res.tempFilePaths[0]) || ''),
      fail: reject
    });
  });
}

/**
 * ★ 把临时文件落到「本地缓存 / 用户文件」目录，拿到跨会话可用的路径
 *
 * 官方说明：tempFilePath 只在当前生命周期保证有效，重启后不一定可用
 * （真机上还常有 wxfile:// 路径渲染不出来的问题）；
 * saveFile 之后的 savedFilePath 才是长期路径，清理时机同代码包。
 *
 * H5 没有这个接口（chooseImage 给的是 blob: 地址，当前页面会话内可用），直接返回。
 */
function persistImage(tempFilePath: string): Promise<string> {
  // #ifdef H5
  return Promise.resolve(tempFilePath);
  // #endif

  // #ifndef H5
  // eslint-disable-next-line no-unreachable -- 上一行的 return 只存在于 H5 条件编译分支，小程序端这里可达
  return new Promise((resolve) => {
    const fs = typeof wx !== 'undefined' && wx.getFileSystemManager
      ? wx.getFileSystemManager()
      : null;

    if (!fs || typeof fs.saveFile !== 'function') {
      resolve(tempFilePath); // 拿不到文件系统就先用临时路径
      return;
    }

    fs.saveFile({
      tempFilePath,
      success: (res) => resolve(res.savedFilePath || tempFilePath),
      fail: () => {
        // 落盘失败（空间不足等）不该让整个功能挂掉：退回临时路径并如实告知
        uni.showToast({ title: '图片仅本次有效', icon: 'none' });
        resolve(tempFilePath);
      }
    });
  });
  // #endif
}

/** 把图片 Markdown 插到光标处（独占一行，详见 insertImageBlock） */
function insertImage(src: string) {
  const pos = cursorPos.value < 0 ? body.value.length : cursorPos.value;
  const res = insertImageBlock(body.value, pos, src);
  if (!res) return;

  body.value = res.text;
  cursorPos.value = res.caret;
  uni.showToast({ title: '已插入图片', icon: 'none' });
}

/** 相册出错：区分「用户主动取消」和「权限被拒」，其余归为普通失败 */
function onPickFail(err: unknown) {
  const msg = errorMessage(err, '');

  // 取消是正常操作，不要弹任何东西
  if (/cancel/i.test(msg)) return;

  // 真机首次授权被拒后系统不再弹授权框，只能引导去设置页
  if (/auth|permission|deny/i.test(msg)) {
    uni.showModal({
      title: '无法打开相册',
      content: '请在小程序设置里允许「使用我的相册」，然后再试一次。',
      confirmText: '去设置',
      success: ({ confirm }) => {
        if (confirm && typeof uni.openSetting === 'function') {
          try {
            uni.openSetting({});
          } catch (e) {
            /* 部分平台没有该接口，忽略 */
          }
        }
      }
    });
    return;
  }

  uni.showToast({ title: '没能取到图片', icon: 'none' });
}

/**
 * ★ 开关行内格式
 *
 * 两种情形：
 * ① 有选中文字 → 立刻把这段文字包起来，然后继续挂起（后面输入的也算加粗）
 * ② 只有光标   → 不写任何标记，只记住起点；等关闭时再一次性补上左右标记
 *
 * 重点在 ②：全程不出现 `**加粗文字**` 这类模板文字，
 * 用户看到的反馈就是「按钮亮着」，关掉时标记才落进正文。
 */
async function toggleInlineFormat(key: FormatKey) {
  // 再点同一个 = 关闭
  if (pendingFormat.value === key) {
    closeInlineFormat();
    return;
  }

  // 点了别的格式：先把上一个收尾，避免留下未闭合的标记
  if (pendingFormat.value) closeInlineFormat();

  // ★ 先亮灯再取位置：按钮反馈不等异步结果
  pendingFormat.value = key;
  pendingStart = -1;

  const mark = INLINE_FORMATS[key];
  const sel = await readSelection();

  // 等待期间用户又点了别的按钮 → 本次作废
  if (pendingFormat.value !== key) return;

  if (sel.end > sel.start) {
    const after = applyMark(sel.start, sel.end, mark);
    if (after != null) {
      pendingStart = after;
      placeCaret(after);
      return;
    }
  }

  pendingStart = sel.start;
}

/**
 * ★ 关闭挂起的行内格式：把「开启到现在」输入的文字一次性包上标记
 *
 * 这里用同步的 cursorPos（每次 input 都会更新），不再问一次系统 ——
 * onSave / hideKeyboard 需要在同一帧内拿到结果。
 *
 * @param reposition 是否把光标移回标记之后（默认 true）。
 *   ★ 只有「用户主动关掉格式、要继续输入」时才为 true。
 *   「收起键盘 / 失焦 / 保存」必须传 false —— 否则光标复位会重新 focus，
 *   键盘会自己弹回来，把「收起」这个动作直接抵掉。
 */
function closeInlineFormat(reposition = true) {
  const key = pendingFormat.value;
  if (!key) return;

  const mark = INLINE_FORMATS[key];
  const start = pendingStart;

  pendingFormat.value = null;
  pendingStart = -1;

  if (!mark || start < 0) return;

  const end = cursorPos.value < 0 ? body.value.length : cursorPos.value;
  if (end <= start) return; // 开启后没输入内容 → 什么都不做

  const after = applyMark(start, end, mark);
  if (after != null && reposition) placeCaret(after);
}

/**
 * 给 [start, end) 包上标记，返回「右标记之后」的光标位置
 * 区间为空时返回 null，由调用方决定怎么降级（当前是「什么都不做」）
 * 具体区间数学在 utils/markdown/format.ts，有单测覆盖
 */
function applyMark(start: number, end: number, mark: string): number | null {
  const res = wrapRange(body.value, start, end, mark);
  if (!res) return null;

  body.value = res.text;
  cursorPos.value = res.caret;
  return res.caret;
}

/**
 * ★ 读取光标 / 选中区域
 *
 * 小程序没有「选中文字」事件，唯一的办法是主动调 wx.getSelectedTextRange
 * （基础库 2.7.0+），且只在输入框 focus 时有效 —— 这正是 textarea 要加
 * hold-keyboard 的原因：点工具栏不会失焦，接口才拿得到选区。
 *
 * 取不到时（低版本 / 部分机型已知会 fail）降级为「已知光标位置」：
 * 此时「选中文字加粗」失效，但「后续输入加粗」仍然可用。
 */
function readSelection(): Promise<{ start: number; end: number }> {
  return new Promise((resolve) => {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && typeof wx.getSelectedTextRange === 'function') {
      wx.getSelectedTextRange({
        success: (res) => resolve({ start: res.start, end: res.end }),
        fail: () => resolve(fallbackSelection())
      });
      return;
    }
    // #endif

    // #ifdef H5
    // H5 直接用 DOM 的选区，浏览器里能完整验证这套交互
    const el = typeof document !== 'undefined' ? document.querySelector('textarea') : null;
    if (el && typeof el.selectionStart === 'number') {
      resolve({ start: el.selectionStart, end: el.selectionEnd });
      return;
    }
    // #endif

    resolve(fallbackSelection());
  });
}

/** 降级：只有「光标点」，没有选区 */
function fallbackSelection() {
  const p = cursorPos.value < 0 ? body.value.length : cursorPos.value;
  return { start: p, end: p };
}

/**
 * ★ 把光标放到指定位置
 *
 * 小程序没有 setSelection 接口，只能「改 cursor 属性 + 重新 focus」
 * （cursor 只在 focus 时生效）。代价是键盘会重弹一次，所以只在写入标记之后调用，
 * 不在输入过程中调用。真机表现需验证（见 RUNNING.md）。
 */
function placeCaret(pos: number) {
  caret.value = pos;
  placing = true;
  wantFocus.value = false;
  nextTick(() => {
    wantFocus.value = true;
    // 用完即撤：否则用户下次自己点输入框时，光标会被拽回这个旧位置
    setTimeout(() => {
      caret.value = -1;
      placing = false;
    }, 320);
  });
}

/**
 * 保存 ★
 *
 * 关键逻辑：正文变更时重置 checks
 * 对应 data-api-contract.md §2.1 不变式 3
 */
async function onSave() {
  if (!canSave.value || saving.value) return;

  // ★ 先把挂起的行内格式收尾，否则标记不会写进正文
  //   传 false：马上要 navigateBack，没必要再复位光标
  closeInlineFormat(false);
  saving.value = true;

  try {
    const bodyChanged = original ? original.body !== body.value : true;

    let checks: boolean[];
    if (bodyChanged) {
      // ★ 正文变了 → 重置（否则旧勾选按位置错位到新待办项上）
      checks = resetChecks(body.value);
    } else {
      // 正文没变 → 沿用已有勾选，仅对齐长度
      checks = normalizeChecks(body.value, original?.checks || []);
    }

    const payload: NoteDraft = {
      title: title.value.trim(),
      body: body.value,
      tag: original?.tag || 'all',
      checks,
      // 摘要客户端生成（与渲染共用同一套语法规则）
      excerpt: extractExcerpt(body.value, 60)
    };

    if (NOTE_ID.value) {
      await updateNote(NOTE_ID.value, payload);
    } else {
      await createNote(payload);
    }

    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 500);
  } catch (e) {
    uni.showToast({ title: errorMessage(e, '保存失败'), icon: 'none' });
  } finally {
    saving.value = false;
  }
}

function onCancel() {
  const dirty = original
    ? (original.title !== title.value || original.body !== body.value)
    : (title.value.trim() || body.value.trim());

  if (!dirty) {
    uni.navigateBack();
    return;
  }

  uni.showModal({
    title: '放弃修改？',
    content: '当前修改尚未保存，确定退出？',
    confirmText: '放弃',
    confirmColor: '#EF4444',
    success: ({ confirm }) => {
      if (confirm) uni.navigateBack();
    }
  });
}
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  /* ★ 小程序端必须用确定高度，min-height 会让 flex:1 失效（编辑区只占半屏） */
  height: 100vh;
  box-sizing: border-box;
  background: var(--bg-surface);
  padding: $space-4;
  /* 非编辑态：给固定在屏幕底部的「取消/保存」让位 */
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

/* ★ 编辑态：底部只留 键盘 + 样式栏（--kb 由 JS 写入，能和 rpx 一起参与 calc） */
.page.is-editing {
  padding-bottom: calc(var(--kb, 0px) + 112rpx);
}

.title-input {
  width: 100%;
  font-size: $text-xl;
  font-weight: $font-medium;
  color: var(--text-primary);
  padding: $space-2 0;
  margin-bottom: $space-2;
  border-bottom: 2rpx solid var(--border-default);
}

/*
 * ★ 正文区：填满标题以下的剩余空间，内容超出时在这块内部上下滑动
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

/* 文字下方的空白：不属于 textarea，编辑态点一下即可收起键盘 */
.blank {
  min-height: 40vh;
}

.ph {
  color: var(--text-disabled);
  font-size: $text-sm;
}

/* ★ 工具栏：编辑态时贴在键盘正上方（固定层，不占页面底部） */
.toolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--kb, 0px);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: $space-2;
  background: var(--bg-surface);
  border-top: 2rpx solid var(--border-default);
  padding: $space-2 $space-4;
}

.tool-scroll {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

/* 收起键盘：与插入类按钮用品牌色区分，避免误认为也是插入按钮 */
.tool-collapse {
  background: var(--brand-100);

  .tool-label {
    color: var(--brand-600);
  }
}

.tool-inner {
  display: inline-flex;
  gap: $space-2;
}

.tool-btn {
  flex: none;
  min-width: 88rpx;
  height: 72rpx;
  padding: 0 $space-2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-muted);
  border-radius: $radius-md;
  transition: transform $duration-fast $ease-out, background-color $duration-fast ease;

  &:active {
    transform: scale(0.94);
    background: $brand-100;
  }
}

/*
 * ★ 行内格式的「开启态」：实心品牌色
 * 语义 = 这个格式开着，之后输入的内容都会带上它。
 * 与「收起」的浅色调刻意区分：浅色是动作按钮，实心是状态。
 */
.tool-btn.is-on {
  background: $brand-500;

  .tool-label {
    color: #fff;
    font-weight: $font-bold;
  }

  &:active {
    background: $brand-600;
  }
}

.tool-label {
  font-size: $text-sm;
  color: var(--text-primary);
}

/*
 * 底部操作 ★ 固定在屏幕底部（非编辑态）
 * 页面是 100vh 定高 + 正文区填满的布局，footer 放文档流会被挤出屏幕，
 * 所以必须 fixed；编辑态由 v-if 隐藏，底部让位给键盘 + 样式栏
 */
.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: flex;
  gap: $space-3;
  background: var(--bg-surface);
  border-top: 2rpx solid var(--border-default);
  padding: $space-3 $space-4;
  padding-bottom: calc(#{$space-3} + env(safe-area-inset-bottom));
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

.btn-primary {
  background: $brand-500;
  color: #fff;
}

.btn-primary.is-disabled {
  opacity: 0.4;
}
</style>

# 轻记 · 运行文档

> uni-app + Vue 3 + Vite 项目骨架
> 配套设计文档见同级目录 `notes-design/`
>
> **✅ 本骨架已通过实际验证**：双端构建成功（mp-weixin / h5）、89 个单元测试全通过、
> 浏览器实测列表 / 详情 / 编辑 / 搜索全链路零报错，关键截图见 `docs/screenshots/`。

---

## 一、环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | **≥ 18**（推荐 20 LTS） | uni-app Vite 版要求 |
| npm | ≥ 10（随 Node.js 一起装好） | 本项目的包管理器，锁文件为 `package-lock.json` |
| 微信开发者工具 | 最新稳定版 | 预览小程序必需 |
| 微信小程序 AppID | 测试号即可 | 见 §四 第 2 步 |

验证环境：

```bash
node -v    # 应输出 v18.x 以上
npm -v     # 应输出 10.x 以上
```

> npm 随 Node.js 一起装好，不用额外安装。**也可以用 pnpm**，把下面所有 `npm run xxx` 换成 `pnpm xxx`、`npm test` 换成 `pnpm test` 即可。

---

## 二、快速开始

```bash
# 1. 进入项目
cd light-note

# 2. 安装依赖
npm install

# 3. 启动（二选一）
npm run dev:h5          # 浏览器预览，最快看到效果
npm run dev:mp-weixin   # 编译到微信小程序
```

---

## 三、两种运行方式

### 方式 A：H5 浏览器预览（推荐先跑这个）

```bash
npm run dev:h5
```

启动后终端会输出本地地址（通常是 `http://localhost:5173`），浏览器打开即可。

**优点**：零配置、秒级热更新，适合调交互和样式。
**注意**：H5 端**没有**小程序的原生组件限制（`rich-text` 事件屏蔽、`textarea` 层级），所以**在 H5 上跑通不代表小程序上没问题**。最终必须回到方式 B 验证。

### 方式 B：微信小程序（最终目标端）

```bash
npm run dev:mp-weixin
```

这个命令会**持续监听并编译**，产物输出到：

```
dist/dev/mp-weixin/
```

**然后用微信开发者工具打开这个目录**：

1. 打开**微信开发者工具** → 「导入项目」
2. **项目目录**：选择上面的 `dist/dev/mp-weixin`（**注意不是项目根目录**）
3. **AppID**：填你自己的，或点「测试号」
4. 导入后即可在模拟器预览，也可点「预览」用真机扫码

> **⚠️ 最常见的坑：目录选错。** 必须选 `dist/dev/mp-weixin`，选成项目根目录会报「找不到 app.json」。

---

## 四、生产构建

```bash
npm run build:h5           # H5 产物 → dist/build/h5
npm run build:mp-weixin    # 小程序产物 → dist/build/mp-weixin
```

小程序发布流程：用微信开发者工具打开 `dist/build/mp-weixin` → 「上传」 → 在微信公众平台提交审核。

---

## 五、项目结构

```
light-note/
├── src/
│   ├── pages/
│   │   ├── list/list.vue        笔记列表（含骨架屏、标签筛选、FAB）
│   │   ├── detail/detail.vue    ★ 详情页（待办分段渲染）
│   │   ├── editor/editor.vue    编辑器（工具栏、光标插入）
│   │   ├── tags/tags.vue        标签页
│   │   ├── search/search.vue    搜索（服务端搜索 + 高亮渲染）
│   │   └── mine/mine.vue        我的
│   ├── components/
│   │   ├── TodoList.vue         ★ 待办组件（挂事件，必须用原生组件）
│   │   ├── NoteCard.vue         笔记卡片
│   │   └── EmptyState.vue       空状态
│   ├── utils/
│   │   ├── markdown/            ★ Markdown 解析器（纯 TS，可跨端复用）
│   │   │   ├── rules.ts         语法规则常量（渲染与摘要共用）
│   │   │   ├── inline.ts        行内解析 + XSS 防护
│   │   │   ├── block.ts         块级解析 → rich-text HTML
│   │   │   ├── segment.ts       ★ 分段解析 + checks 契约工具
│   │   │   ├── excerpt.ts       摘要生成 extractExcerpt
│   │   │   ├── format.ts        ★ 行内格式包裹 + 图片插入（纯函数，有单测）
│   │   │   └── index.ts         统一出口
│   │   └── store/
│   │       └── profile.ts       我的页个人资料存储（有单测）
│   ├── api/                     ★ 请求层（分层结构）
│   │   ├── config.ts            BASE_URL / 超时 / USE_MOCK 开关
│   │   ├── client.ts            传输层：uni.request + 统一包装剥壳
│   │   ├── auth.ts              鉴权层：token 存取、静默登录
│   │   ├── request.ts            编排层：带 Authorization、401 自动重登重放
│   │   ├── modules/             领域接口：note / tag / search
│   │   └── mock/                Mock 数据与路由（内存 stub）
│   ├── styles/
│   │   ├── tokens.scss          SCSS 设计令牌
│   │   └── global.scss          CSS 变量 + 语义令牌（含暗色模式）
│   ├── pages.json               ★ 页面路由 + tabBar（不是 Vue Router）
│   ├── manifest.json            ★ appid 等配置
│   ├── App.vue
│   └── main.js
├── tests/
│   ├── parser.test.ts           解析器 + 行内格式 + 图片插入单元测试（89 个用例）
│   └── profile.test.ts          个人资料存储单元测试（42 个用例）
├── tsconfig.json
├── vitest.config.ts
├── vite.config.js
└── package.json
```

---

## 六、跑测试

**两个纯 TS 模块都有独立单元测试，不依赖 uni-app 环境，用 vitest 跑**：

```bash
npm test                            # 全部：解析器 + 个人资料存储
npx vitest run tests/parser.test.ts # 只跑解析器
npx vitest run tests/profile.test.ts# 只跑个人资料存储
npm run type-check                  # vue-tsc 全量类型检查
npm run lint                        # ESLint（flat config，含类型感知规则）
```

预期输出：

```
通过 89 / 89
全部通过 ✓

profile 测试：42 通过，0 失败
```

测试覆盖的关键用例：

| 分类 | 覆盖点 |
|---|---|
| 行内语法 | 加粗 / 斜体 / 删除线 / 行内代码 / 混合嵌套 |
| **XSS 防护** | 标签转义、`javascript:` 协议拦截、`data:text` 拦截 |
| **URL 括号** | `https://a.com/x(y)` 不被截断 |
| 块级语法 | 标题 / 列表 / 引用 / 代码块 / 分割线 |
| **checks 不变式** | 长度对齐、截断、重置 |
| **分段跨段累加** ★ | 两段待办时，第二段正确取 `checks[2]`、`checks[3]` |
| 摘要一致性 | 剔除全部标记、与渲染共用规则 |
| **profile 清洗** ★ | 单行清洗（换行/制表/连续空格）、码点计数（emoji 不切半） |
| **profile 校验** ★ | 昵称必填与长度、邮箱宽松格式、临界长度通过 |
| **profile 读写闭环** ★ | 归一化兜底（脏数据回落默认值）、非法邮箱清空、写入读回一致 |

> **改解析器后务必跑一遍测试。** 尤其是 `segment.ts`，跨段累加写错会导致勾选整体错位，而这种 bug 在页面上很难肉眼发现。

---

## 七、Mock 数据与接口切换

**默认使用 Mock 数据**，无需后端即可完整跑通所有交互。

切换开关在 `src/api/config.ts`：

```javascript
const USE_MOCK = true;                        // ← 改为 false 走真实后端
const BASE_URL = 'https://api.example.com';   // ← 改成你的后端地址
```

**Mock 层实现的行为**（与 `data-api-contract.md` 契约一致）：

| 行为 | 是否符合契约 |
|---|---|
| `GET /notes` **不返回 body**，只返回 `excerpt` | ✅ |
| `PUT /notes/:id/checks` **不更新 `updatedAt`** | ✅ |
| `PUT /notes/:id` 正文变更时**重置 checks** | ✅ |
| 搜索返回 `highlights`（含 `<span class="hl">`） | ✅ |
| 删除为**软删除**（`deletedAt`），列表自动过滤 | ✅ |

> Mock 数据存在内存里，**刷新即重置**。要体验「正文变更重置 checks」，编辑一篇有勾选的笔记（如「设计系统评审要点」），删掉一个待办项再保存，观察勾选状态是否被正确重置。

---

## 八、必须知道的技术点

### ① 待办为什么不能放在 `rich-text` 里

微信小程序的 `<rich-text>` **内部屏蔽所有节点的事件**，待办项放进去就点不动。所以正文必须**分段**：

```
正文 → parseToSegments() → [
  { type: 'richtext', html: '<h2>…</h2>' },   ← 交给 rich-text
  { type: 'todo', items: [...] },              ← 交给 TodoList 组件
  { type: 'richtext', html: '…' }
]
```

**核心是 `globalTodoIdx` 必须跨段累加**（`utils/markdown/segment.ts`）。写错的话，第二段待办会去取第一段的 `checks`，导致勾选整体错位。测试用例已覆盖这一点。

### ② `rich-text` 的样式要放在非 scoped 里

`detail.vue` 里有两个 `<style>` 块，**第二个故意不带 `scoped`**。因为 `rich-text` 渲染出的节点不在组件的 scoped 作用域内，scoped 样式对它无效。搜索页的 `.hl` 高亮同理。

### ③ 编辑器光标位置不可靠

`textarea` 是小程序**纯文本控件**，无法直接读取光标位置。当前实现靠 `@input` 的 `e.detail.cursor` 记录。

**实机验证时重点测**：输入中文、点击文本中间、粘贴后，光标位置是否准确。若不可靠，把 `editor.vue` 的 `insert()` 降级为「追加到末尾」——体验差但绝不会错。

### ④ 编辑区的结构：scroll-view 包 auto-height textarea

wx 的 `textarea` 是**原生组件**，在它内部任何点击都算「点输入框」——只会移动光标，**不会失焦、不会收键盘**（这是原生行为，不是 bug）。所以「点空白收键盘」「正文内部滚动」都靠把 textarea 包进 `scroll-view` 实现：

```
title-input
scroll-view.body-wrap  flex: 1 1 auto; min-height: 0   ← 填满剩余空间，内部滚动
  ├─ textarea  auto-height                             ← 高度随文字，完整渲染
  └─ .blank      min-height: 40vh                      ← 不属于 textarea，@tap 收键盘
footer（fixed 屏幕底部，非编辑态） / toolbar（fixed 键盘上方，编辑态）
```

- `min-height: 0` 是关键：覆盖 flex 项目的「自动最小尺寸」，内容超出时容器出现滚动而不是被撑开
- textarea 始终 `auto-height`（完整高度），**滚动统一交给外层 scroll-view** —— 键盘弹出/收起都一样可滑
- `.blank` 放在 scroll-view 内、textarea 之后，`min-height: 40vh` 保证短笔记时文字下方也有足够大的可点区域
- 新建笔记自动 `focus`，省掉「先点一下编辑区」这步
- `textarea` 上还有 `adjust-position=false` + `onKeyboardHeightChange` 动态让出底部空间
- **编辑态（`editing = focused || kbHeight > 0`）**：隐藏「取消/保存」（footer 是 fixed，被 v-if 摘掉）、去掉键盘「完成」栏（`show-confirm-bar=false`，收起入口在样式栏右侧）
- **键盘右下角按钮 =「换行」**：`confirm-type="return"`。`confirm-type` 的默认值是 `done`（按钮显示「完成」，按下不换行、反而收键盘），写 `return` 才是换行键。相应地 **不能给 textarea 绑 `@confirm` 收键盘**——否则按换行时会触发 confirm 把键盘收掉，等于又变回「完成」
- 已知取舍：在长笔记末尾继续输入时，外层 scroll-view **不会自动滚到光标处**，需要手动滑；要自动跟光标得按行高估算 scrollTop，暂未做

> 别把 textarea 挪出 scroll-view 单独用 `flex: 1` 铺满——那样文字下方重新变成 textarea 的一部分，点空白就又不收键盘了。

### ⑤ 工具栏为什么是「键盘上方固定层」

样式栏（B / I / S / 列表 / 待办 …）不是页面底部的一行，而是 **`position: fixed` + `bottom: var(--kb)`** 的固定层，键盘弹起时贴在键盘正上方，收起时不出现：

```
.page { --kb: <键盘高度>px }        ← JS 写入 CSS 变量（能直接和 rpx 一起 calc）
.toolbar { position: fixed; bottom: var(--kb, 0px) }
.page.is-editing { padding-bottom: calc(var(--kb, 0px) + 112rpx) }  ← 给固定层让位
```

- 显示条件：`focused || kbHeight > 0`（H5 无键盘高度事件，那边常驻）
- `textarea` 必须加 **`hold-keyboard`**，否则点工具栏按钮会先把键盘顶掉，栏跟着消失
- 微信原生的 `<keyboard-accessory>` 组件也能做「键盘上方工具栏」，但它只能用 `cover-view`、不支持横向滚动、**模拟器不渲染（只有真机可见）**，所以没用它
- 键盘高度有两个来源互为兜底：`uni.onKeyboardHeightChange` 和 `@focus` 事件里的 `e.detail.height`

### ⑥ 工具栏的「挂起格式」：为什么不再插模板文字

**旧行为**：点 B 直接往正文里插 `**加粗文字**`，用户得先删掉「加粗文字」再写自己的 —— 很烦。

**现行为**：B / I / S / 代码 是**开关式**（`editor.vue` 的 `toggleInlineFormat`）：

```
点 B              → 按钮变实心品牌色（= 开启），正文一个字都不动
  有选中文字时    → 立刻把这段文字包起来，然后继续挂起
  只有光标时      → 只记住起点（pendingStart），不写任何标记
后面输入的字      → 正常输入，正文里看不到 **
再点 B / 收起 / 保存 → 把「开启到现在」输入的这段一次性包上左右标记，然后光标落到右标记之后
```

- **不写模板文字**是关键收益：中间过程正文始终干净，反馈全靠按钮的实心态
- 取消入口只有一个：再点一次同一个格式按钮（点别的格式会把上一个自动收尾，不会留下未闭合的 `**`）
- `closeInlineFormat(reposition)` 的 `reposition` 只在**用户主动关格式**时为 `true`；「收起键盘 / 失焦 / 保存」必须传 `false`，否则光标复位会重新 focus 把键盘拉回来，把「收起」抵掉

**选中文字是怎么读到的**（小程序没有「选中」事件）：

| 环境 | 手段 |
|---|---|
| mp-weixin | `wx.getSelectedTextRange`（基础库 2.7.0+），**只在输入框 focus 时有效** —— 这正是 textarea 要加 `hold-keyboard` 的原因：点工具栏不失焦，接口才拿得到选区 |
| H5 | 直接读 DOM 的 `textarea.selectionStart / selectionEnd`（浏览器里能完整验证这套交互） |
| 都失败时 | 降级为「已知光标位置」：选中文字加粗失效，但**后续输入加粗仍然可用** |

**光标怎么被放到指定位置**：小程序没有 `setSelection` 接口，只能「改 `cursor` 属性 + 重新 focus」（`cursor` 只在 focus 时生效）。代价是键盘可能重弹一次，所以只在**写入标记之后**调用，不在输入过程中调用；用完必须把 `cursor` 撤成 `-1`，否则用户下次自己点输入框会被拽回旧位置。复位期间用 `placing` 标志忽略 blur，避免样式栏闪一下。

> ⚠️ `wx.getSelectedTextRange` 在社区里有「skyline 下无效 / 部分 iOS 安卓机型失败」的报告；本项目用的是默认 WebView 渲染器（`manifest.json` 未开 skyline），但**仍须真机验证**。若真机上取不到选区，选中加粗会静默降级为「从光标处开始加粗」。

> 区间数学（包裹结果 + 光标落点）抽在 `src/utils/markdown/format.ts`，有 15 个单测用例锁住 —— 改这块先跑 `npm test`。

### ⑦ 图片：点「图片」为什么是调起相册，图片又存在哪

**旧行为**：点图片往正文里插 `![图片描述](图片链接)` —— 一个假模板，用户还得自己把描述和链接改掉。

**现行为**：调起本机相册 → 用户选图 → 落盘 → 把**真实路径**插进正文。

```
点「图片」    → wx.chooseMedia（小程序）/ uni.chooseImage（H5 等其他平台）
用户选一张    → tempFilePath   ⚠️ 只在当前小程序生命周期内有效
              → fs.saveFile()  落盘成本地缓存文件
              → savedFilePath  跨会话可用 ← 这个才写进笔记
              → 插入 ![图片](savedFilePath)，且保证独占一行
```

三个要点：

1. **必须落盘**：临时路径（`wxfile://tmp_xxx` 这种）重启后不一定可用，真机上还常有渲染不出来的问题；`saveFile` 之后的路径才是长期路径（清理时机同代码包，与用户文件合计上限 200MB）。落盘失败会退回临时路径并提示「图片仅本次有效」，不让整个功能挂掉。
2. **图片必须独占一行**：详情页把「整行就是一张图」的行切成 `image` 段，交给原生 `<image>` 渲染。跟文字混在一行的图仍留在富文本段里 —— 原生 `<image>` 是块级组件，塞进行内会把整行排版打散。
3. **图片的白名单比链接松一点**：`isSafeUrl(url, { media: true })` 额外放行 `wxfile:`（本机文件）与 `blob:`（H5 选图地址），链接那边仍然只认 http/https/mailto。`data:` 一律不放行 —— 所以**不走 base64 存图**（还有个更实际的原因：base64 会把几十 KB 的字符串塞进那个纯文本编辑框，编辑体验直接崩）。

**为什么详情页不交给 rich-text 渲染图片**：rich-text 内部的 `<img>` 对「本机路径」支持不可靠，真机上常加载不出来。原生 `<image>`（配 `mode="widthFix"`）才稳，点一下还能调 `uni.previewImage` 全屏看。

> ⚠️ 已知边界：笔记里存的是**本机路径**，所以换设备 / 清了缓存就看不到了 —— 这是当前没有后端上传接口的必然结果。接后端时只需把 `editor.vue` 的 `persistImage` 换成 `uni.uploadFile` 并返回网络地址，正文格式和渲染层都不用动。见 §十三 第 5 条。

> 图片 Markdown 的生成与插入位置（`imageMarkdown` / `insertImageBlock`）同样抽在 `format.ts` 里，有单测覆盖 —— 改这块记得跑 `npm test`。

### ⑧ 图标体系：lnicon 字体 + tabBar PNG

项目图标走**自建子集字体**（2026-09 引入），来源 Remixicon v4.5.0（Apache-2.0 可商用），用 fontTools 只保留用到的图标，字体仅 **3.2KB**。全部资产：

| 文件 | 作用 |
|---|---|
| `src/static/fonts/lnicon.ttf` | 子集字体本体（重新生成时用） |
| `src/styles/iconfont.scss` | `@font-face`（**base64 内嵌**）+ `.ln-icon-*` 工具类 + 码点表注释 |
| `src/components/Icon.vue` | 页面内图标组件：`<Icon name="search" :size="34" color="var(--text-tertiary)" />` |
| `src/static/tabbar/*.png` | tabBar 图标 8 张（81×81，从未选中灰 `#5A5A66` / 选中紫 `#7C3AED` 渲染） |

几个容易踩的坑：

1. **为什么 `@font-face` 用 base64**：小程序端 `@font-face` 的 `src` 只认 https 与 base64，本地相对路径静默失败；base64 两端通用且离线可用。
2. **为什么 Icon.vue 直接渲染字形字符（`String.fromCodePoint`）而不用 `::before` + class**：小程序自定义组件默认样式隔离（compiled `Icon.json` 无 `styleIsolation` 字段 → isolated），`app.wxss` 里的 content 类进不到组件内部，图标会变方块；H5 没有隔离概念，只看 H5 发现不了。内联 `font-family` + 字符渲染不受隔离影响。
3. **颜色传递靠 `color` prop 或父级继承**：页面 scoped 样式里的类选择器同样穿不进组件（隔离），不要给 Icon 挂 class 改颜色；CSS 变量以内联样式写入是可靠的。
4. **tabBar 图标必须是 PNG**：`pages.json` 的 tabBar 不支持字体图标 / SVG / 网络图。本项目用同一套字形光栅化生成（扫描线填充 + 4× 超采样抗锯齿），保证 tabBar 与页面内图标设计语言一致。81×81 官方建议尺寸，每张 0.5~1.4KB。

**如何新增图标**：① 从 **remixicon.css 查目标图标码点（不要凭记忆猜！0xEC4A 这类近似码点其实是另一个图标）** → ② fontTools 子集重新生成 `lnicon.ttf`（保留原 ttf 备用）→ ③ base64 更新 `iconfont.scss` 的 `@font-face` 与码点注释 → ④ `Icon.vue` 的 `ICONS` 映射加码点 → ⑤ 若用于 tabBar，用同一字形渲染 PNG 放 `static/tabbar/`。

> 生成脚本已固化在 `gen-tmp/build-iconfont.py`：改脚本顶部的 ICONS 码点表，然后 `python gen-tmp/build-iconfont.py` 一次完成 ②③（含码点完整性自检）。配套 `gen-tmp/preview-glyphs.py` 可把字形渲染成 PNG 人工核对形状（Pillow 实现，无需 cairo）。子集来源字体放 `gen-tmp/remixicon-full.ttf`。

### ⑨ 个人资料：存哪、为什么头像不能上传

「我的」页的个人资料（昵称/签名/邮箱/所在地/头像底色）全部走**本地存储**，逻辑集中在 `src/utils/store/profile.js`：

| 决策 | 理由 |
|---|---|
| 存储键 `profile`，`uni.setStorageSync` | 无后端阶段的最稳方案；接后端时只需把 read/write 换成 request，组件层不动 |
| **头像只能选 6 个预设底色（渐变 + 昵称首字符），不支持上传图片** | 编辑器图片存的是本机路径（`wxfile://`），换设备/清缓存必失效；头像比笔记图片更显眼，用一个必然失效的地址反而更糟。预设底色任何设备都稳定，且保留个人辨识度 |
| 读写都过 `normalizeProfile` | 脏数据（旧版本残留/手输异常）在存储层就清洗干净：空昵称回落「轻记用户」、非法邮箱清空、未知底色回落、超长截断 |
| 清洗（`sanitizeLine`）与校验（`validateProfile`）分离 | 清洗是「存储层防御」（read 路径也要过），校验是「保存时反馈」（带字段错误信息给 UI 显示行内红字） |
| 昵称 12 字 / 签名 40 字上限，按**码点**计数 | `charCount` 用 `Array.from` 切分，emoji 算 1 个字；`initialOf` 同理不能 `s[0]`（会切出半个代理对） |
| 邮箱校验刻意宽松（`a@b.c` 结构即可） | 只做展示不做投递，严格 RFC 正则会误杀 `user+tag@sub.domain.co` |

页面交互：卡片**原地展开编辑**（不跳页）——点「编辑资料」切到编辑态（草稿拷贝，取消即丢弃），色块选中态带同色外圈 + 白色对勾，字段聚焦用品牌色内环（mp 端 input 无 `:focus` 样式，靠 `@focus/@blur` 切类实现），字数计数到上限变警示色，校验失败显示行内红字 + 顶部 toast，不跳字段焦点。

> 编辑态的 4 个 `input` 是**原生组件**（AGENTS.md 约束 1）：`placeholder-class="ph"` 的样式必须写在**非 scoped** 的 `<style>` 块里（同 rich-text 的处理）。保存成功后 `writeProfile` 返回归一化结果再赋回页面状态，保证界面显示与存储严格一致。

---

## 十、已验证项与已知问题

### ✅ 已实际验证（沙箱环境实测）

| 验证项 | 方式 | 结果 |
|---|---|---|
| 微信小程序构建 | `npx uni build -p mp-weixin` | ✅ `DONE Build complete.`，产物结构完整 |
| H5 构建 | `npx uni build` | ✅ 成功 |
| H5 dev server | 实际启动 + 浏览器访问 | ✅ HTTP 200，零控制台错误 |
| 列表页渲染 | 浏览器实测 | ✅ 4 张卡片、5 个筛选 chip、FAB、tabBar 均正常 |
| **待办分段渲染** | 浏览器实测 | ✅ 5 个待办跨 2 段正确渲染，`checks` 跨段累加正确 |
| **勾选交互** | 点击第 1 个待办项 | ✅ 已勾选 1 → 2，状态实时更新 |
| 编辑器工具栏 | 点击「待办」按钮 | ✅ 在光标处插入 `\n- [ ] 待办事项\n` |
| 新建→保存→列表 | 完整流程 | ✅ 卡片 4 → 5，新笔记详情待办 1 项 |
| 搜索 + 高亮 | 搜「配色」 | ✅ 命中 1 条，仅关键词带黄色高亮 |
| 单元测试 | `npm test` | ✅ 解析器 89 / 89 + profile 42 / 42 |
| 图片插入（纯函数） | 单测：`imageMarkdown` / `insertImageBlock` | ✅ 描述方括号剔除、行首行中行尾插入的换行与光标落点、空地址返回 `null` |
| 图片分段渲染 | 单测：`parseToSegments` 含图片行 | ✅ 独占一行的图切成 `image` 段；行内图与危险协议仍留富文本；checks 索引不被图片打乱 |
| 条件编译（图片逻辑） | 检查两端产物 | ✅ 小程序包只含 `chooseMedia` / `saveFile`，H5 包只含 `chooseImage`（无 `saveFile`） |
| 个人资料（我的页改版） | 双端构建 + 产物检查 | ✅ `build:mp-weixin` / `build:h5` 均通过；mine 产物含编辑态全部节点；profile 存储层 42 用例全绿（清洗/校验/读写闭环/脏数据兜底） |

验证截图：`docs/screenshots/`（列表页、详情页、搜索高亮修复后）。

### 🐛 骨架开发过程中发现并修复的 bug（供参考）

| Bug | 现象 | 修复 |
|---|---|---|
| `"type": "module"` 与 CJS 插件冲突 | 构建报 `uni is not a function` | 去掉根 `type: module`，在 `src/utils/markdown/` 内单独放 `package.json` 声明 ESM |
| 小程序不支持 `hr` 标签选择器 | 分割线无样式 | 解析器输出 `<hr class="md-hr">`，样式用 class 选择器 |
| **H5 构建缺入口** | `Could not resolve entry module "index.html"` | 补根目录 `index.html`（小程序端不需要，H5 端必需） |
| mock 高亮转义错变量 | 整个标题/摘要全被高亮 | `highlight()` 改为转义关键词的正则特殊字符 + 先转义原文再替换 |

### ⚠️ 待真机验证（H5 无法覆盖）

1. **`e.detail.cursor` 光标位置**：部分安卓机型可能不准，编辑器里输入中文、点中间、粘贴后各测一次。不可靠就降级为「追加到末尾」。
2. **`textarea` 层级**：工具栏 / 弹窗是否被 textarea 盖住（H5 端无此限制）。
3. ~~**键盘顶起页面**：聚焦后编辑区是否被顶出可视区。~~ 已处理，见 §十二 对应条目（`adjust-position=false` + `onKeyboardHeightChange` 让出底部空间）。
4. **`rich-text` 内联样式**：小程序端 rich-text 对 class 的支持与 H5 不同，`detail.vue` 的非 scoped 样式在真机上的表现需确认。
5. **工具栏「挂起格式」的选中加粗**：`wx.getSelectedTextRange` 社区里报过「skyline 无效 / 部分 iOS 安卓失败」，真机上要确认「选中文字 → 点 B」能否正确包住选区。取不到时会静默降级为「从光标处开始加粗」，功能不崩但行为不同。
6. **光标复位（`cursor` 属性）**：写标记后要把光标放回右标记之后，靠的是「改 `cursor` + 重新 focus」。真机上看两点：① 光标是否真的落在右标记之后（而不是跳到正文末尾）；② 键盘重弹是否可接受。若②太扰，可去掉 `placeCaret`，接受光标跳到末尾。
7. **挂起格式与英文输入法的交互**：部分输入法在拼音候选阶段会连续触发 input，去真机上确认「开 B → 打一段英文 → 关 B」包裹范围是否准确。
8. **相册选图**：真机上点「图片」→ 相册选一张，确认：① 只开相册（不弹「拍照 / 相册」选择）；② 相册权限被拒时有没有弹出「去设置」引导；③ 选完图后正文里出现的是 `![图片](wxfile://…)` 这种真实路径，而不是模板占位文字。
9. **图片能不能真的显示出来（最关键）**：详情页用原生 `<image>` 渲染本机路径的图，**开发者工具显示正常不代表真机正常**（历史上 `wxfile://` 路径在真机渲染失败的报告很多）。重点看：① 详情页图片是否显示；② 宽度撑满、高度按比例（`mode="widthFix"`），没露出灰底；③ 点一下能否全屏预览。**若真机不显示**，第一顺位是接后端上传换网络地址（见 §十三 第 5 条），而不是继续调样式。
10. **图片插入后的光标**：选完图回到页面，确认光标/后续输入落在图片下方那一行（插入位置来自选图前的光标，靠 `cursorPos` 记录）。
11. **我的页 · 资料编辑的原生 input**：`input` 在小程序端是原生组件，需在开发者工具里点一遍：① 各字段聚焦时是否出现品牌色内环、失焦是否退出；② placeholder（`placeholder-class` 非 scoped 写法）颜色是否生效；③ 昵称输满 12 字后计数变警示色、保存时行内红字 + toast；④ 换底色后头像渐变与同色外圈是否正确；⑤ 保存 → 杀掉小程序重进，资料是否还在（存储持久化）；⑥ 键盘弹起时保存/取消按钮是否被顶出可视区（页面本身可滚动，预期无碍）。

---

## 十一、与设计文档的对应关系

| 代码位置 | 对应文档 |
|---|---|
| `styles/tokens.scss`、`global.scss` | `notes-design/design-spec.md` |
| `utils/markdown/*` | `notes-design/syntax-render-mapping.md` |
| `utils/markdown/segment.ts` | `notes-design/uniapp-adaptation.md` §三 |
| `src/api/`（请求层） | `notes-design/data-api-contract.md` §五 |
| `pages/editor/editor.vue` | `notes-design/editor-boundary-spec.md` |

---

## 十二、常见问题

| 现象 | 原因 | 解决 |
|---|---|---|
| 启动即报 `Cannot read properties of undefined (reading 'setPageTypeById')`（WAServiceMainContext） | 装了**两份 Vue**：`vue-router` 4.6+ 的 peer 要求 `vue: ^3.5.0`，npm 为满足它在 `node_modules/@dcloudio/uni-h5/node_modules/` 下又装了一套 vue 3.5.x；而小程序运行链是按 3.4.21 打包的，运行时不匹配 | 见下方「依赖版本不变式」——本项目已用 `package.json` 的 `overrides` 锁死，**不要提升 vue / vue-router 版本** |
| 微信开发者工具报「找不到 app.json」 | 项目目录选错了 | 选 `dist/dev/mp-weixin`，不是项目根目录 |
| 样式全部失效 | `vite.config.js` 的 scss 注入路径不对 | 确认 `additionalData` 指向 `@/styles/tokens.scss` |
| 待办项点不动 | 待办被渲染进了 `rich-text` | 检查 `parseToSegments` 是否被正确调用 |
| 勾选状态错位到别的项 | `globalTodoIdx` 没跨段累加 | 跑 `npm test`，看分段用例是否通过 |
| 高亮不显示 | `.hl` 样式被 scoped 隔离了 | 确认它在非 scoped 的 `<style>` 里 |
| `npm install` 卡住 / 很慢 | 网络或镜像问题 | `npm install --registry=https://registry.npmmirror.com`，或一次性 `npm config set registry https://registry.npmmirror.com` |
| 修改代码不生效 | 编译进程没在跑 | 确认 `npm run dev:mp-weixin` 终端没有报错 |
| 编辑页键盘弹起后工具栏 / 保存按钮被盖住，且没法收键盘 | `textarea` 默认上推整页，底部工具区被键盘遮住 | 见 `editor.vue`：`adjust-position=false` + `onKeyboardHeightChange` 动态让出底部空间，工具栏右侧常驻「收起」按钮 |
| 点空白处不收键盘，只是光标移动 | 点到了 `textarea` 内部（原生组件内部点击不失焦） | 编辑区用 `flex: 0 1 auto` 随内容增高，文字下方留出 `.blank` 空白区承接点击，见 §八 ④ |
| 点工具栏按钮后键盘/样式栏消失 | `textarea` 默认「点击页面即收键盘」 | `textarea` 加 `hold-keyboard`；样式栏本身是 `bottom: var(--kb)` 的固定层，见 §八 ⑤ |
| 键盘右下角是「完成」，打不出换行 | `confirm-type` 默认 `done`；绑了 `@confirm` 收键盘 | 改成 `confirm-type="return"`，并去掉 textarea 上的 `@confirm`（收键盘只留样式栏「收起」+ 正文下方空白区） |
| 点 B 直接出现 `**加粗文字**` 模板 | 旧实现是把 `TOOLBAR_SNIPPETS.b` 整段插进正文 | 行内格式改为开关式「挂起格式」，见 §八 ⑥；模板只剩块级工具在用 |
| 开了格式但一个字没输入，正文里多了 `****` | 空区间也被包裹 | `wrapRange` 对空区间返回 `null`，调用方「什么都不做」，见 `format.ts` |
| 点「收起」后键盘又自己弹回来 | 收尾挂起格式时复位了光标，重新 focus 把键盘拉回来 | `closeInlineFormat(false)`：收起 / 失焦 / 保存三处都不复位光标 |
| 点「图片」后正文里出现 `![图片描述](图片链接)` | 有人把 `TOOLBAR_SNIPPETS.image` 加回来了 | 图片已改成走相册（见 §八 ⑦），模板里不该再有 `image` 项 |
| 点「图片」什么都没发生 | 用户点了取消，或相册权限被拒 | 取消静默处理（正常操作）；权限被拒会弹「去设置」引导。真机首次被拒后系统不再弹授权框 |
| 详情页图片显示不出来 | 笔记里存的是**本机路径**：换设备 / 清缓存后失效；或环境对 `wxfile://` 渲染不稳定 | 图片段用原生 `<image>`（`parseToSegments` 的 `image` 段）而非 rich-text，见 §八 ⑦；彻底解决要接后端上传 |
| 图片把整行排版挤乱了 | 图片没独占一行，被当成行内内容 | 插入用 `insertImageBlock`（自动补前后换行）；`segment.ts` 只把「整行就是一张图」切成图片段 |

### 依赖版本不变式（★ 动依赖前必读）

**结论：`vue` 必须钉死 `3.4.21`，`vue-router` 必须钉死 `4.5.1`。** 两者都由 `package.json` 的 `overrides` 强制：

```json
"dependencies": { "vue": "3.4.21" },          // ← 不带 ^
"overrides": { "vue-router": "4.5.1", "vue": "3.4.21" }
```

**为什么**（2026-09-30 实际踩到并修复）：

```
@dcloudio/uni-h5@3.0.0-4030620241128001  声明 vue-router: ^4.3.0
        └── npm 解析到 vue-router@4.6.4
                 └── peerDependencies: vue: ^3.5.0    ← 与顶层 vue 3.4.21 冲突
                          └── npm 退让：在 @dcloudio/uni-h5/node_modules/ 下
                              再装一整套 vue@3.5.43（编译器 + runtime-dom + shared 全来一遍）
```

uni-app 的小程序运行链（`vite-plugin-uni` / `uni-cli-shared` / `uni-mp-vue`）的依赖全部钉在 **3.4.21**，而构建时解析到的 `vue` 成了 3.5.43 → 产物里混入两份运行时 → 启动即崩：`TypeError: Cannot read properties of undefined (reading 'setPageTypeById')`。

**分水岭版本**：`vue-router` 在 **4.6.0** 把 peer 从 `vue: ^3.2.0` 提到 `^3.5.0`。**4.5.1 是最后一个兼容 vue 3.4.21 的版本**，所以钉 4.5.1。

**如何验证依赖树仍收敛**（改了依赖后跑一次，输出应与此完全一致）：

```bash
node -e "const p=require('./package-lock.json').packages;['node_modules/vue','node_modules/vue-router','node_modules/@vue/runtime-core','node_modules/@dcloudio/uni-h5/node_modules/vue'].forEach(k=>console.log(k, p[k]?p[k].version:'(不存在)'))"
# 期望输出：
#   node_modules/vue                             3.4.21
#   node_modules/vue-router                      4.5.1
#   node_modules/@vue/runtime-core               (不存在)
#   node_modules/@dcloudio/uni-h5/node_modules/vue  (不存在)
```

最后两行出现任何版本号就说明**又裂了**。

> ⚠️ **npm 的坑**：`overrides` 只在生成锁文件时生效。本次修复中 `npm install` 一直判定「up to date」直接跳过重算，`--force` 也无效 —— 最后是手工把 `package-lock.json` 里 `@dcloudio/uni-h5` 的 `vue-router` 区间改成 `4.5.1` 并删掉嵌套条目，再 `npm install` 才收敛（`removed 19 packages`）。**如果你看到 `npm install` 说 up to date 但上表验证不过，就是要手工改锁文件。**

---

## 十三、下一步

骨架已跑通的核心链路：

- ✅ 列表 → 详情 → 编辑 的完整导航
- ✅ Markdown 解析（含 XSS 防护、URL 括号处理）
- ✅ **待办分段渲染 + 勾选 + 防抖保存**
- ✅ `checks` 三条不变式（含正文变更重置）
- ✅ 搜索（服务端模式 + 高亮渲染）
- ✅ 设计令牌体系（含暗色模式变量）

**接入真实后端时还需处理**：

1. 把 `USE_MOCK` 改为 `false`，配置 `BASE_URL`
2. 补鉴权头（登录态 / `openid`）
3. 处理接口错误码与全局 Toast
4. 长列表分页（已按后端契约实现：请求 `pageNum` / `pageSize`，上拉看 `hasNext`，见 `docs/api/pagination.md`）
5. 图片上传：现在图片存的是**本机路径**（见 §八 ⑦），跨设备就失效。接后端后把 `editor.vue` 的 `persistImage` 换成 `uni.uploadFile`、返回网络地址即可 —— 正文格式、`isSafeUrl` 白名单、详情页渲染都不用改
6. 回收站页面（`mine.vue` 里的入口目前是占位）

---

*项目骨架 v1.0 · 对应设计文档 `data-api-contract.md` v1.5*

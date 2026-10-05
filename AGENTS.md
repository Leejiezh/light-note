# AGENTS.md

轻记（light-note）：uni-app + Vue 3 + Vite 的笔记小程序。**目标端是微信小程序**，H5 只用于快速预览交互和样式。

- 本文件只放「每次动手前都要遵守」的规则，**不重复文档内容**
- 运行/构建/环境的完整说明、已验证项与坑的来龙去脉见 **`RUNNING.md`**（需要细节时去读，不要凭印象推测）
- 依赖装完后再动手；改完代码按本文件末尾的自检清单走一遍

## 常用命令

**包管理器用 npm**（锁文件是 `package-lock.json`），不要执行 `pnpm install` / `yarn`，避免生成第二份锁文件。

```bash
npm install             # 装依赖
npm run dev:h5          # 浏览器预览，秒级热更新，调交互/样式用
npm run dev:mp-weixin   # 编译到小程序并持续监听 → dist/dev/mp-weixin
npm run build:mp-weixin # 生产构建 → dist/build/mp-weixin
npm test                # 单测（vitest）：markdown 解析器 + 个人资料存储，不依赖 uni-app 环境
npm run type-check      # vue-tsc 全量类型检查
npm run lint            # ESLint（flat config，`eslint.config.mjs`；含类型感知规则）
```

微信开发者工具**必须打开 `dist/dev/mp-weixin`**，不是项目根目录——选错会报「找不到 app.json」。这是本项目最高频的坑。

**Vue 版本必须钉死 3.4.21，不要改回 `^3.4.21`。** `vue-router` 从 4.6.0 起把 peer 要求提到 `vue: ^3.5.0`，而 `@dcloudio/uni-h5` 声明的是 `vue-router: ^4.3.0`。一旦顶层 vue 用 `^`（npm 可能装到 3.5.x）或 `vue-router` 被解析到 4.6+，npm 就会在 `@dcloudio/uni-h5/node_modules/` 下**再装一整套 vue 3.5.x**，与 uni 按 3.4.21 打包的小程序运行链冲突，启动直接崩（详见 `RUNNING.md` §十二 首条）。`package.json` 的 `overrides.vue-router = "4.5.1"` 是这条不变式的保障，**不要删**；改动依赖后按 `RUNNING.md` §十二 的方法验证依赖树是否仍收敛。

## 关键约束（改代码前必读）

### 1. H5 通过 ≠ 小程序通过

`rich-text`、`textarea`、`input` 在小程序端是**原生组件**，行为与浏览器不同（层级更高、事件屏蔽、不受普通 CSS 完全控制）。任何涉及这几个组件的改动，**必须在小程序端复核**，不能只看 H5。

### 2. `flex: 1` 需要父容器有「确定高度」

小程序里 `page` 默认无高度，父容器只写 `min-height` 时子元素的 `flex: 1` **会失效**（表现为内容只占半屏）。要撑满请用 `height: 100vh` + `box-sizing: border-box`。

### 3. 编辑器（`src/pages/editor/editor.vue`）的约定（2026-10-05 起为社交式排版，已去 Markdown）

编辑器是「一张白纸」排版：顶栏（取消/标题/保存胶囊）+ 大标题 + 彩色标签胶囊行 + 正文 + 底部图盘。**不再支持 Markdown**——正文是纯文本，无格式工具栏 / 光标魔法 / 待办勾选（`checks` 只存在于旧数据，新编辑器不再产生）。

- **正文不要直接 `flex: 1` 铺满**。外层 `.body-wrap` 才是 `flex: 1; min-height: 0` 的 scroll-view，里面放 auto-height `textarea` + 下方的 `.blank` 空白区，否则「点空白收键盘」永久失效——原生组件内部点击只会移动光标，不会失焦
- **不要给 `textarea` 绑 `@confirm` 收键盘**。`confirm-type="return"` 保证「换行」；收键盘靠正文下方空白区（点图盘 / 保存 / 取消时也会自然收起）
- 页面 `height: 100vh` flex 纵向排布；键盘高度由 JS 写入 CSS 变量 `--kb`（`onKeyboardHeightChange` + focus 兜底），`.page` 的 `padding-bottom: calc(var(--kb) + safe-area + …)` 让底部图盘随键盘顶起
- **保存走后端 RecordController，不走 /notes**：新建 `POST /record`、编辑加载 `GET /record/{id}`、编辑保存 `PUT /record`。载荷 `RecordDraft = { title, label, content, images(objectKey[]), recordDate }`（`src/api/modules/record.ts`）
- **标题是后端独立 `title` 字段**（空串 = 无标题）；标签未分类传 `label: null`
- **图片上传两段式**：`chooseMedia`/`chooseImage` → `presignImage` → `uploadToMinio` 直传 → 存 objectKey，本地路径只做预览。编辑加载时 `images` 是访问 URL，用 `parseObjectKey` 反推回 objectKey 再提交；反推不出就整体不提交 `images`，让后端保留旧图
- 标签选项与配色统一来自字典（`readTagDict` / `readTagColor`）；选中胶囊实心填充标签自己的颜色

### 4. 待办必须用原生组件

`rich-text` 会屏蔽子元素事件，勾选待办**不能**渲染在 `rich-text` 里，走 `components/TodoList.vue`。同时：
- `rich-text` 的样式必须写在**非 scoped** 的 `<style>` 块里
- 小程序端不支持标签选择器（p/h1 等不是内置组件，够不到 rich-text 内部节点），解析器（`block.ts` / `inline.ts`）输出的标签**必须带 `md-` class 前缀**，详情页样式按 `.md-*` 写。新增语法标签时三处同步：解析器输出 class → 详情页 `.md-*` 样式 → 单测断言

### 5. 样式统一走令牌

颜色/间距/字号取自 `src/styles/tokens.scss` 与 `global.scss` 的 CSS 变量，**不要硬编码颜色值**（项目带暗色模式）。`vite.config.js` 会把这些令牌注入每个 SCSS 文件。

### 6. 路由在 `src/pages.json`

不是 Vue Router。新增页面要同时注册到 `pages.json`，tabBar 也在那里配。

### 7. 改 Markdown 解析器必须跑测试

`src/utils/markdown/` 是纯 TS、可跨端复用，配套 `tests/parser.test.ts`（89 个用例）；`src/utils/store/profile.ts`（我的页资料存储）配套 `tests/profile.test.ts`（42 个用例）；`src/utils/store/tags.ts`（标签字典）配套 `tests/tags.test.ts`。**任何改动都要 `npm test` 全绿**（vitest，四条套件一起跑）。分段解析的 `checks` 契约（`segment.ts`）被列表页和详情页共用，改动前先看清调用方。

### 8. 图标只用两条通道，不要混入 emoji / 文字符号

- 页面内图标一律用 `components/Icon.vue`（`<Icon name="search" :size="34" />`），码点在 `Icon.vue` 的 `ICONS` 与 `styles/iconfont.scss` 注释里，两边必须同步；**不要再写 🔍 / ✕ / › 这类字符**（EmojiState 的空态 emoji 除外，那是刻意的风格）
- 给 Icon 上色用 `color` prop（建议传 CSS 变量）或父级文字色继承；**不要用页面 class 给 Icon 改颜色**——小程序自定义组件样式隔离，类选择器穿不进去（H5 正常、小程序失效，别只看 H5）
- tabBar 图标**必须是 PNG**（`static/tabbar/`，81×81），字体图标 / SVG 都不行；新增图标先查 `RUNNING.md` §八⑧ 的流程

### 9. 分页统一走后端契约（`docs/api/pagination.md`）

- 请求只有 `pageNum` / `pageSize`（**GET 查询串，不是 JSON body**），默认 1 / 10，上限 100；响应 `data` 恒为 `{ list, total, pageNum, pageSize, hasNext }`
- 上拉加载是 `if (hasNext) pageNum++` 再请求，**不要自己算总页数，也不要引入 cursor / offset**
- 默认值与上限的归一化只在 `src/api/pagination.ts`（`normalizePageQuery`），真实接口与 mock 共用；**不要在各页面里手写分页参数**
- "共 N 条"这类总数文案用响应里的 `total`，**不要用当前页的 `list.length`**
- 后端的业务 VO（`RecordVO` / `ReportVO`）字段未冻结，本项目当前的 `Note` / `NoteListItem` 是过渡形态，对齐前先确认。**编辑器已对齐后端 `/record`**（`RecordDraft`/`RecordVO`，含 `title` 字段，见 `src/api/modules/record.ts`）；列表 / 详情 / 搜索仍走过渡的 `/notes`，迁 `/record` 前先确认分页筛选（后端 `RecordController.page` 暂不支持按标签过滤）与字段映射

### 10. 标签字典只在冷启动拉一次

- 字典（`GET /dict/note_label`）的唯一入口是 `src/utils/store/tags.ts` 的 `ensureTagDict()`，**只在 `App.vue` 的 `onLaunch` 调用**；页面里再调只是兜底（已加载会直接返回）
- **不要把它挂回「每次切换筛选 / 每次进页面都请求」的行为**：`loaded` 标记保证一次冷启动只打一次接口，缓存在 `tag_dict`；失败不置位（允许重试），这是 `tests/tags.test.ts` 锁住的不变式
- 页面里**不要自己请求字典**，一律用 `readTagDict` / `readTagLabel` / `readTagColor(s)`

## 目录导航

| 路径 | 说明 |
|---|---|
| `src/pages/` | 六个页面：list / detail / editor / tags / search / mine |
| `src/components/` | `TodoList.vue`（★ 原生事件）、`NoteCard.vue`、`EmptyState.vue`、`Icon.vue`（★ 图标） |
| `src/api/` | 请求层（分层）：`client.ts` 传输 / `auth.ts` 鉴权 / `request.ts` 编排（401 重登重放）/ `pagination.ts` 分页契约 / `modules/` 领域接口 / `mock/` stub；`config.ts` 的 `USE_MOCK` 是 mock 开关 |
| `src/utils/markdown/` | 解析器：rules / inline / block / segment / excerpt；行内格式包裹与图片插入在 `format.ts` |
| `src/utils/store/` | 本地存储层：`profile.ts`（我的页个人资料，配套 42 个单测）、`theme.ts`（主题）、`tags.ts`（★ 标签字典：冷启动拉一次 `GET /dict/note_label` 后落缓存，会话内只读缓存，配套 `tests/tags.test.ts`） |
| `src/styles/` | `tokens.scss`（SCSS 令牌）、`global.scss`（CSS 变量）、`iconfont.scss`（图标字体） |
| `src/static/` | `fonts/lnicon.ttf`（图标字体子集）、`tabbar/`（tabBar PNG 图标） |
| `tests/parser.test.ts` | 解析器 + 行内格式 + 图片插入单测（89 个用例；`tests/profile.test.ts` 另有 42 个） |
| `RUNNING.md` | 运行文档：环境、两种运行方式、技术点、常见问题 |

## 交付前自检

1. `npm test` 全绿（改了 markdown 相关的话，这是硬门槛）
2. `npm run dev:mp-weixin` 编译无报错，产物 `dist/dev/mp-weixin` 已更新
3. 涉及原生组件（textarea / rich-text / input）的改动，在微信开发者工具里实际点一遍
4. 真机相关行为（键盘、光标位置、原生组件层级）标注清楚「未在真机验证」，不要写成已通过

## 文档分工

- **`AGENTS.md`**（本文件）：给 AI 的规则与约束
- **`RUNNING.md`**：给人的运行文档，含完整命令、技术点详解、已验证/待验证清单
- **`.workbuddy/memory/`**：按日追加的工作记录（改了什么、为什么这么改）

修改编辑器布局、键盘行为、原生组件相关代码前，先读 `RUNNING.md` 的 **§八 必须知道的技术点** 与 **§十二 常见问题**。

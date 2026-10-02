# TS 化收尾与工程化优化设计

- 日期：2026-10-02
- 状态：待评审
- 背景：项目已完成 JS→TS 迁移（`vue-tsc` strict 模式零错误，源码无残留 JS）。本次是对迁移质量的收尾优化，补齐初始化时未明确的技术框架规范。

## 目标

1. 补齐工程化空白：静态检查能拦截真实的运行时风险
2. 消除可避免的类型断言与重复代码
3. 不改变任何运行时行为（重构性质，用户无感知）

## 范围

### 本次做

#### 1. 引入 ESLint（typescript-eslint）

**动机**：项目 async 逻辑密集（`requestOnce` 的 401 重登重放、`ensureLogin`），`no-floating-promises` 能拦截「忘记 await」这类真实风险；目前无任何 lint 手段。

- 依赖：`eslint`、`typescript-eslint`、`eslint-plugin-vue`（flat config）
- 新增 `eslint.config.js`（flat config），配置要点：
  - `eslint-plugin-vue` 的 flat/recommended 预设（`.vue` 单文件组件）
  - `typescript-eslint` recommended + **`no-floating-promises`**（需 type-checked 模式）
  - 忽略 `dist/`、`node_modules/`
- `package.json` 增加 `"lint": "eslint ."` 脚本
- 不引入 Prettier / editorconfig / git hooks（保持最小改动，后续需要再加）

**验收**：`npm run lint` 对现有代码零 error（允许用少量合理的规则豁免，需注释原因）。

#### 2. 抽取 `src/utils/errorMessage.ts` 错误信息工具

**动机**：`(e as Error).message || 'xxx失败'` 模式在 6 个页面重复；`editor.vue:449` 还有一份更复杂的 `errMsg` 提取逻辑，两套并存。

- 新函数：`errorMessage(e: unknown, fallback: string): string`
  - 提取顺序：`Error.message` → `err.errMsg`（uni 回调错误）→ fallback
  - 返回空串时用 fallback
- 替换以下调用点（行为不变，同时消灭 6 处 `as Error` / `as { errMsg?: string }` 断言）：
  - `detail.vue:92`、`list.vue:86`、`mine.vue:327`、`mine.vue:422`、`search.vue:116`、`editor.vue:669`
  - `editor.vue:449` 的 `String((err && ...))` 逻辑并入该函数
- 配套 `tests/errorMessage.test.ts`（vitest）：覆盖 Error 对象 / 带 errMsg 的普通对象 / 字符串 / null / 空串 fallback 五类输入

**验收**：`npm test` 全绿（新增用例 + 原有 131 个用例不受影响）。

#### 3. 消除 `editor.vue` 的两处 `any`

- 新类型（放在 `editor.vue` 内或 `src/types/uni-events.d.ts`）：

  ```ts
  interface UniTextareaInputEvent {
    detail: { value: string; cursor?: number }
  }
  interface UniTextareaFocusEvent {
    detail?: { height?: number }
  }
  ```

- `onInput(e: any)` → `onInput(e: UniTextareaInputEvent)`；`onFocus(e: any)` → `onFocus(e: UniTextareaFocusEvent)`（原注释保留，说明为何不用 DOM 事件类型）
- ⚠️ 此文件约束密集（见 AGENTS.md §3），只改参数类型，不动任何逻辑

#### 4. `vite.config.js` → `vite.config.ts`

- 重命名并检查 `tsconfig.json` 是否需要把根目录配置文件纳入 include（建议单独的 `tsconfig.node.json` 或直接加入 include，以 lint/类型检查通过为准）

#### 5. `request.ts` 消除 `mockApi(options) as T` 断言

- `mock/handler.ts` 的 `mockApi` 改为泛型：`function mockApi<T>(options: RequestOptions): Promise<T>`
- `request.ts:21` 变为 `return mockApi<T>(options)`
- mock 内部现有的数据构造断言（`as NoteDraft & MockData` 等）本次不动

### 本次不做（明确排除）

| 项 | 原因 |
|---|---|
| editor.vue 拆分 composable | 收益与风险并存，该文件不变式最密集，需单独评估、单独一轮做 |
| 引入 Pinia / Vue Router | 现有手写 store + pages.json 路由对当前体量是合理 YAGNI |
| `client.ts` 响应体运行时校验（zod 等） | 单人小项目，类型断言集中在边界一处，收益不抵依赖成本 |
| Prettier / husky / CI | 等团队协作或需求出现再加 |
| mock 内部数据构造断言清理 | 纯 mock 代码，不影响线上 |

## 验收总清单

1. `npm run lint` 零 error
2. `npm test` 全绿（131 原有用例 + 新增 errorMessage 用例）
3. `npm run type-check` 零错误
4. `npm run build:mp-weixin` 编译通过，产物正常
5. 运行时行为无变化（重构性质）；不涉及原生组件行为改动

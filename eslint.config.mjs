// ============================================================
// 轻记 · ESLint flat config
// 设计：docs/superpowers/specs/2026-10-02-ts-optimization-design.md §1
//   - Vue SFC：eslint-plugin-vue flat/recommended
//   - TS：typescript-eslint recommendedTypeChecked（含 no-floating-promises，
//     项目 async 密集：401 重登重放 / ensureLogin，拦「忘记 await」）
//   - src/tests 归 tsconfig.json；根目录 vite.config.ts 归 tsconfig.node.json
// 注：文件名用 .mjs——package.json 未声明 "type": "module"，
//     .js 会被按 CommonJS 解析，import 语法直接报错
// ============================================================
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },

  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...pluginVue.configs['flat/recommended'],

  // JS/MJS 文件（本配置自身）：不在任何 tsconfig 工程内，关闭类型感知规则
  {
    files: ['**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { globals: { ...globals.node } }
  },

  // TS / Vue SFC：类型感知检查挂到两个 tsconfig 工程
  {
    files: ['**/*.ts', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue']
      }
    },
    rules: {
      // 未定义变量检查交给 TS 编译器（uni 等全局由 @dcloudio/types 声明）
      'no-undef': 'off'
    }
  },

  // Vue SFC 的 <script lang="ts"> 交给 @typescript-eslint/parser
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
      globals: { ...globals.browser }
    }
  },

  // ---------- 规则豁免（逐条给出原因） ----------
  {
    rules: {
      // uni-app 页面/组件按文件名注册（pages.json、easycom），单词名是既定风格
      'vue/multi-word-component-names': 'off',
      // 纯排版规则一律不强制：项目刻意不引入 Prettier（见设计文档「本次不做」），
      // 模板换行/属性换行交给手写排版，避免 --fix 产生大范围无意义 diff
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      // 空 catch 是刻意的（忽略可选 API 失败）；下划线前缀表示有意未使用的参数/变量
      '@typescript-eslint/no-unused-vars': [
        'error',
        { caughtErrors: 'none', argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    }
  },

  // 页面层不强制处理 uni.* 返回的 Promise：
  // uni 的回调式 API 在未传 success/fail 时按官方契约返回 Promise（类型上确实如此），
  // 页面里 uni.showToast / uni.navigateTo / load() 属既定的 fire-and-forget 模式。
  // Promise 相关规则保留在 api / utils / tests —— 401 重登重放等真正的 async 逻辑都在那里。
  {
    files: ['src/pages/**/*.vue'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off'
    }
  },

  // 解析器 / 存储 / mock 的 unknown→string 转换：
  // 这些入口的运行时输入只可能是字符串（textarea 正文、正则捕获、storage 读回），
  // String(x || '') 是边界兜底，不是面向用户的排版输出
  {
    files: ['src/utils/markdown/**/*.ts', 'src/utils/store/**/*.ts', 'src/api/mock/**/*.ts'],
    rules: { '@typescript-eslint/no-base-to-string': 'off' }
  }
);

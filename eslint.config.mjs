import js from '@eslint/js';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import promisePlugin from 'eslint-plugin-promise';
import sonarPlugin from 'eslint-plugin-sonarjs';
import sortKeysFixPlugin from 'eslint-plugin-sort-keys-fix';
import unicornPlugin from 'eslint-plugin-unicorn';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default [
  // Base JS rules for JS files only
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // For webview scripts, add browser globals so eslint recognize their definitions (e.g. window, document)
  {
    files: ['**/scripts/**/*.{js,ts}', '**/webview/**/*.{js,ts}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        acquireVsCodeApi: 'readonly',
        monaco: 'readonly',
        require: 'readonly',
      },
    },
  },

  // Extension host code: Node.js + TypeScript
  {
    files: ['src/extension/**/*.{ts,tsx}', '**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      import: importPlugin,
      promise: promisePlugin,
      sonarjs: sonarPlugin,
      unicorn: unicornPlugin,
      'unused-imports': unusedImportsPlugin,
      'sort-keys-fix': sortKeysFixPlugin,
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Import ordering and cleanliness
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
        },
      ],
      'import/no-useless-path-segments': 'error',
      'unused-imports/no-unused-imports': 'error',

      // Code quality & style
      'no-console': ['warn'],
      'no-throw-literal': 'error',
      'object-shorthand': ['warn', 'always'],

      'promise/always-return': 'off',

      // SonarJS & Unicorn
      'unicorn/filename-case': ['error', { cases: { camelCase: true, pascalCase: true } }],
      'unicorn/no-null': 'off',
      'unicorn/no-useless-undefined': 'off',
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },

  // Ignore non-JS/TS files (e.g., Python)
  {
    ignores: ['**/*.py'],
  },
  eslintPluginPrettierRecommended,
];

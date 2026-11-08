import { defineConfig } from 'oxlint';
import antiSlop from 'ultracite/oxlint/anti-slop';
import core from 'ultracite/oxlint/core';
import react from 'ultracite/oxlint/react';
import vitest from 'ultracite/oxlint/vitest';

const effectHooks = {
  importNames: ['useEffect', 'useLayoutEffect', 'useInsertionEffect'],
  message:
    'Derive in render, act in the event handler, or subscribe with useSyncExternalStore.',
  name: 'react',
};

export default defineConfig({
  extends: [core, react, vitest, antiSlop],
  ignorePatterns: [...(core.ignorePatterns ?? []), '**/dist/**'],
  jsPlugins: [
    { name: 'no-comments', specifier: './tools/oxlint/no-comments.ts' },
  ],
  options: { reportUnusedDisableDirectives: 'error', typeAware: true },
  rules: {
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'eslint/func-style': 'off',
    'eslint/no-eq-null': 'off',
    'eslint/no-plusplus': 'off',
    'eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    'eslint/require-await': 'off',
    'eslint/sort-keys': 'off',
    'import/no-cycle': 'error',
    'no-comments/no-comments': 'error',
    'no-restricted-imports': ['error', { paths: [effectHooks] }],
    'oxc/no-accumulating-spread': 'error',
    'react/function-component-definition': 'off',
    'typescript/prefer-nullish-coalescing': [
      'error',
      { ignorePrimitives: { boolean: true, string: true } },
    ],
    'typescript/strict-boolean-expressions': [
      'error',
      {
        allowNullableBoolean: true,
        allowNullableNumber: true,
        allowNullableString: true,
      },
    ],
  },
  overrides: [
    {
      files: ['packages/react-shiki/src/**'],
      rules: {
        'anti-slop/no-runtime-typeof': 'off',
        'no-comments/no-comments': 'off',
      },
    },
    {
      files: [
        'packages/react-shiki/src/lib/hook.ts',
        'packages/react-shiki/src/lib/styles.ts',
        'packages/react-shiki/src/lib/utils.ts',
      ],
      rules: { 'no-restricted-imports': 'off', 'react/refs': 'off' },
    },
    {
      files: ['packages/react-shiki/tests/**'],
      plugins: ['vitest'],
      rules: {
        'vitest/max-expects': 'off',
        'vitest/prefer-strict-equal': 'off',
        'vitest/prefer-to-be-falsy': 'off',
        'vitest/prefer-to-be-truthy': 'off',
        'vitest/require-top-level-describe': 'off',
      },
    },
  ],
});

import { describe, expect, test } from 'vitest';
import type { ShikiTransformer } from 'shiki';

import { buildShikiOptions } from '../src/lib/options';
import { resolveTheme } from '../src/lib/theme';

describe('buildShikiOptions', () => {
  test('builds single-theme options with language passthrough', () => {
    const options = buildShikiOptions({
      languageId: 'typescript',
      resolvedTheme: resolveTheme('github-dark'),
      options: { structure: 'inline' },
    });

    expect(options).toEqual({
      lang: 'typescript',
      theme: 'github-dark',
      structure: 'inline',
      transformers: [],
    });
  });

  test('builds multi-theme options and keeps theme-specific fields', () => {
    const options = buildShikiOptions({
      languageId: 'typescript',
      resolvedTheme: resolveTheme({
        light: 'github-light',
        dark: 'github-dark',
      }),
      options: {
        defaultColor: false,
        cssVariablePrefix: '--syntax-',
      },
    });

    expect(options).toEqual({
      lang: 'typescript',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      cssVariablePrefix: '--syntax-',
      transformers: [],
    });
  });

  test('uses default themes for invalid multi-theme input', () => {
    const options = buildShikiOptions({
      languageId: 'typescript',
      resolvedTheme: resolveTheme({ light: '', dark: 123 } as any),
      options: {},
    });

    expect(options).toEqual({
      lang: 'typescript',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: undefined,
      cssVariablePrefix: undefined,
      transformers: [],
    });
  });

  test('adds line number transformer without mutating caller array', () => {
    const callerTransformer: ShikiTransformer = {
      name: 'custom-transformer',
    };
    const inputTransformers = [callerTransformer];

    const options = buildShikiOptions({
      languageId: 'typescript',
      resolvedTheme: resolveTheme('github-dark'),
      options: {
        transformers: inputTransformers,
        showLineNumbers: true,
        startingLineNumber: 10,
      },
    });

    expect(inputTransformers).toEqual([callerTransformer]);
    expect(options.transformers).toHaveLength(2);
    expect(options.transformers?.[0]).toBe(callerTransformer);
    expect(options.transformers?.[1]).toMatchObject({
      name: 'react-shiki:line-numbers',
    });
  });
});

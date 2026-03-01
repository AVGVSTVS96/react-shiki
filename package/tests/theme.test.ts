import { describe, expect, test } from 'vitest';
import { resolveTheme } from '../src/lib/theme';

const customTheme = {
  name: 'custom-theme',
  tokenColors: [
    {
      scope: 'keyword',
      settings: {
        foreground: '#ff0000',
      },
    },
  ],
};

describe('resolveTheme', () => {
  test('resolves a single bundled theme', () => {
    const result = resolveTheme('github-dark');

    expect(result).toEqual({
      isMultiTheme: false,
      themeId: 'github-dark',
      singleTheme: 'github-dark',
      themesToLoad: ['github-dark'],
    });
  });

  test('resolves textmate theme objects as single-theme configs', () => {
    const result = resolveTheme(customTheme);

    expect(result).toEqual({
      isMultiTheme: false,
      themeId: 'custom-theme',
      singleTheme: customTheme,
      themesToLoad: [customTheme],
    });
  });

  test('resolves valid multi-theme configs and collects all themes', () => {
    const result = resolveTheme({
      light: 'github-light',
      dark: customTheme,
    });

    expect(result.isMultiTheme).toBe(true);
    expect(result.themeId).toEqual(expect.stringMatching(/^multi-/));
    expect(result.themeId).not.toBe('multi-default');
    expect(result.multiTheme).toEqual({
      light: 'github-light',
      dark: customTheme,
    });
    expect(result.themesToLoad).toEqual(['github-light', customTheme]);
  });

  test('returns fallback multi-theme metadata for invalid config shape', () => {
    const result = resolveTheme({
      light: '',
      dark: 123,
    } as any);

    expect(result).toEqual({
      isMultiTheme: true,
      themeId: 'multi-default',
      multiTheme: null,
      themesToLoad: [],
    });
  });
});

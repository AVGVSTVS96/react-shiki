import { describe, expect, test, vi } from 'vitest';
import { resolveTheme, DEFAULT_THEMES } from '../src/lib/theme';

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
      isMulti: false,
      theme: 'github-dark',
      themesToLoad: ['github-dark'],
    });
  });

  test('resolves textmate theme objects as single-theme configs', () => {
    const result = resolveTheme(customTheme);

    expect(result).toEqual({
      isMulti: false,
      theme: customTheme,
      themesToLoad: [customTheme],
    });
  });

  test('resolves valid multi-theme configs and collects all themes', () => {
    const result = resolveTheme({
      light: 'github-light',
      dark: customTheme,
    });

    expect(result).toEqual({
      isMulti: true,
      themes: { light: 'github-light', dark: customTheme },
      themesToLoad: ['github-light', customTheme],
    });
  });

  test('warns and falls back to defaults for invalid config shape', () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    const result = resolveTheme({
      light: '',
      dark: 123,
    } as any);

    expect(result).toEqual({
      isMulti: true,
      themes: DEFAULT_THEMES,
      themesToLoad: Object.values(DEFAULT_THEMES),
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid multi-theme config')
    );

    warnSpy.mockRestore();
  });
});

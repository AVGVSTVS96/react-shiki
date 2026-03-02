import { describe, expect, test } from 'vitest';
import {
  FALLBACK_LANGUAGE,
  isLoadableLanguage,
  resolveLanguage,
  resolveLoadedLanguage,
} from '../src/lib/language';

const bundledLanguages = {
  javascript: {},
  typescript: {},
} as const;

describe('isLoadableLanguage', () => {
  test('returns true for bundled language strings', () => {
    expect(isLoadableLanguage('javascript', bundledLanguages)).toBe(true);
    expect(isLoadableLanguage('typescript', bundledLanguages)).toBe(true);
  });

  test('returns false for unknown language strings', () => {
    expect(isLoadableLanguage('unknownlang', bundledLanguages)).toBe(
      false
    );
  });

  test('returns true for language registrations with required fields', () => {
    expect(
      isLoadableLanguage(
        {
          name: 'my-language',
          scopeName: 'source.my-language',
        },
        bundledLanguages
      )
    ).toBe(true);
  });

  test('returns false for incomplete language registration objects', () => {
    expect(
      isLoadableLanguage(
        {
          name: 'my-language',
        },
        bundledLanguages
      )
    ).toBe(false);
    expect(
      isLoadableLanguage(
        {
          scopeName: 'source.my-language',
        },
        bundledLanguages
      )
    ).toBe(false);
  });
});

describe('resolveLoadedLanguage', () => {
  test('returns loaded language when available', () => {
    expect(
      resolveLoadedLanguage('javascript', ['javascript', 'typescript'])
    ).toBe('javascript');
  });

  test('falls back to plaintext when language is not loaded', () => {
    expect(resolveLoadedLanguage('python', ['javascript'])).toBe(
      FALLBACK_LANGUAGE
    );
  });

  test('keeps special languages even when not explicitly loaded', () => {
    expect(resolveLoadedLanguage('text', [])).toBe('text');
  });
});

describe('resolveLanguage', () => {
  const customLanguage = {
    name: 'my-language',
    scopeName: 'source.my-language',
    aliases: ['my-lang'],
    fileTypes: ['ml'],
  };

  test('returns plaintext for nullish and empty languages', () => {
    expect(resolveLanguage(undefined)).toEqual({
      languageId: FALLBACK_LANGUAGE,
      langsToLoad: [],
    });
    expect(resolveLanguage('')).toEqual({
      languageId: FALLBACK_LANGUAGE,
      langsToLoad: [],
    });
    expect(resolveLanguage('   ')).toEqual({
      languageId: FALLBACK_LANGUAGE,
      langsToLoad: [],
    });
  });

  test('uses custom language object directly', () => {
    expect(resolveLanguage(customLanguage)).toEqual({
      languageId: 'my-language',
      langsToLoad: [customLanguage],
    });
  });

  test('resolves custom language by name', () => {
    expect(resolveLanguage('my-language', customLanguage)).toEqual({
      languageId: 'my-language',
      langsToLoad: [customLanguage],
    });
  });

  test('resolves custom language by scopeName tail', () => {
    const scopeNameLanguage = {
      name: 'scope-based-language',
      scopeName: 'source.my-language',
    };

    expect(resolveLanguage('my-language', [scopeNameLanguage])).toEqual({
      languageId: 'scope-based-language',
      langsToLoad: [scopeNameLanguage],
    });
  });

  test('resolves custom language by alias and file type', () => {
    const aliasedLang = { ...customLanguage, aliases: ['My-Lang'] };
    expect(resolveLanguage('my-lang', aliasedLang)).toEqual({
      languageId: 'my-language',
      langsToLoad: [aliasedLang],
    });

    const fileTypeLang = { ...customLanguage, fileTypes: ['ML'] };
    expect(resolveLanguage('ml', fileTypeLang)).toEqual({
      languageId: 'my-language',
      langsToLoad: [fileTypeLang],
    });
  });

  test('resolves alias map before passing through', () => {
    expect(
      resolveLanguage('mylang', undefined, {
        mylang: 'javascript',
      })
    ).toEqual({
      languageId: 'javascript',
      langsToLoad: ['javascript'],
    });
  });

  test('falls back to passthrough when no resolver match exists', () => {
    expect(resolveLanguage('plain-old-lang', customLanguage)).toEqual({
      languageId: 'plain-old-lang',
      langsToLoad: ['plain-old-lang', customLanguage],
    });
  });

  test('gives custom language precedence over alias map', () => {
    expect(
      resolveLanguage('my-language', customLanguage, {
        'my-language': 'typescript',
      })
    ).toEqual({
      languageId: 'my-language',
      langsToLoad: [customLanguage],
    });
  });

  test('matches custom language from preloadLanguages', () => {
    expect(
      resolveLanguage('my-language', undefined, undefined, customLanguage)
    ).toEqual({
      languageId: 'my-language',
      langsToLoad: [customLanguage],
    });
  });

  test('merges preloadLanguages and customLanguages without duplicates', () => {
    expect(
      resolveLanguage('typescript', customLanguage, undefined, [
        'javascript',
        customLanguage,
      ])
    ).toEqual({
      languageId: 'typescript',
      langsToLoad: ['typescript', 'javascript', customLanguage],
    });
  });

  test('dedupes repeated preload string ids while preserving order', () => {
    expect(
      resolveLanguage('typescript', undefined, undefined, [
        'javascript',
        'javascript',
        'typescript',
      ])
    ).toEqual({
      languageId: 'typescript',
      langsToLoad: ['typescript', 'javascript'],
    });
  });
});

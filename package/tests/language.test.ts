import { describe, expect, test } from 'vitest';
import { FALLBACK_LANGUAGE, isLoadableLanguage, resolveLanguage, resolveLoadedLanguage } from '../src/lib/language';

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
    expect(isLoadableLanguage('unknownlang', bundledLanguages)).toBe(false);
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
    expect(resolveLoadedLanguage('javascript', ['javascript', 'typescript'])).toBe(
      'javascript'
    );
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
      langsToLoad: undefined,
    });
    expect(resolveLanguage('')).toEqual({
      languageId: FALLBACK_LANGUAGE,
      langsToLoad: undefined,
    });
    expect(resolveLanguage('   ')).toEqual({
      languageId: FALLBACK_LANGUAGE,
      langsToLoad: undefined,
    });
  });

  test('uses custom language object directly', () => {
    expect(resolveLanguage(customLanguage)).toEqual({
      languageId: 'my-language',
      langsToLoad: customLanguage,
    });
  });

  test('resolves custom language by name', () => {
    expect(
      resolveLanguage('my-language', customLanguage)
    ).toEqual({
      languageId: 'my-language',
      langsToLoad: customLanguage,
    });
  });

  test('resolves custom language by scopeName tail', () => {
    const scopeNameLanguage = {
      name: 'scope-based-language',
      scopeName: 'source.my-language',
    };

    expect(resolveLanguage('my-language', [scopeNameLanguage])).toEqual({
      languageId: 'scope-based-language',
      langsToLoad: scopeNameLanguage,
    });
  });

  test('resolves custom language by alias and file type', () => {
    expect(resolveLanguage('my-lang', { ...customLanguage, aliases: ['My-Lang'] })).toEqual(
      {
        languageId: 'my-language',
        langsToLoad: {
          ...customLanguage,
          aliases: ['My-Lang'],
        },
      }
    );

    expect(resolveLanguage('ml', { ...customLanguage, fileTypes: ['ML'] })).toEqual(
      {
        languageId: 'my-language',
        langsToLoad: {
          ...customLanguage,
          fileTypes: ['ML'],
        },
      }
    );
  });

  test('resolves alias map before passing through', () => {
    expect(
      resolveLanguage('mylang', undefined, {
        mylang: 'javascript',
      })
    ).toEqual({
      languageId: 'javascript',
      langsToLoad: 'javascript',
    });
  });

  test('falls back to passthrough when no resolver match exists', () => {
    expect(resolveLanguage('plain-old-lang', customLanguage)).toEqual({
      languageId: 'plain-old-lang',
      langsToLoad: 'plain-old-lang',
    });
  });

  test('gives custom language precedence over alias map', () => {
    expect(
      resolveLanguage(
        'my-language',
        customLanguage,
        {
          'my-language': 'typescript',
        }
      )
    ).toEqual({
      languageId: 'my-language',
      langsToLoad: customLanguage,
    });
  });
});

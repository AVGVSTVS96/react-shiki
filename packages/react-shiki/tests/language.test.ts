import { describe, expect, it } from 'vitest';
import type {
  DynamicImportLanguageRegistration,
  LanguageRegistration,
} from 'shiki';
import {
  FALLBACK_LANGUAGE,
  isLoadableLanguage,
  resolveLanguage,
  resolveLoadedLanguage,
} from '../src/lib/language';
import type { PreloadLanguage } from '../src/lib/types';
import { outOfType } from './fakes';

const emptyGrammarImport: DynamicImportLanguageRegistration =
  async () => ({
    default: [],
  });

const bundledLanguages = {
  javascript: emptyGrammarImport,
  typescript: emptyGrammarImport,
};

const registration: LanguageRegistration = {
  name: 'my-language',
  scopeName: 'source.my-language',
  patterns: [],
  repository: {},
};

describe(isLoadableLanguage, () => {
  it('returns true for bundled language strings', () => {
    expect(isLoadableLanguage('javascript', bundledLanguages)).toBe(true);
    expect(isLoadableLanguage('typescript', bundledLanguages)).toBe(true);
  });

  it('returns false for unknown language strings', () => {
    expect(isLoadableLanguage('unknownlang', bundledLanguages)).toBe(
      false
    );
  });

  it('returns true for language registrations with required fields', () => {
    expect(isLoadableLanguage(registration, bundledLanguages)).toBe(true);
  });

  it('returns true for dynamic language inputs', () => {
    expect(
      isLoadableLanguage(async () => registration, bundledLanguages)
    ).toBe(true);
    expect(
      isLoadableLanguage(
        Promise.resolve({ default: registration }),
        bundledLanguages
      )
    ).toBe(true);
  });

  it('returns false for incomplete language registration objects', () => {
    expect(
      isLoadableLanguage(
        outOfType<PreloadLanguage>({ name: 'my-language' }),
        bundledLanguages
      )
    ).toBe(false);
    expect(
      isLoadableLanguage(
        outOfType<PreloadLanguage>({ scopeName: 'source.my-language' }),
        bundledLanguages
      )
    ).toBe(false);
  });
});

describe(resolveLoadedLanguage, () => {
  it('returns loaded language when available', () => {
    expect(
      resolveLoadedLanguage('javascript', ['javascript', 'typescript'])
    ).toBe('javascript');
  });

  it('falls back to plaintext when language is not loaded', () => {
    expect(resolveLoadedLanguage('python', ['javascript'])).toBe(
      FALLBACK_LANGUAGE
    );
  });

  it('keeps special languages even when not explicitly loaded', () => {
    expect(resolveLoadedLanguage('text', [])).toBe('text');
  });
});

describe(resolveLanguage, () => {
  const customLanguage: LanguageRegistration = {
    ...registration,
    aliases: ['my-lang'],
    fileTypes: ['ml'],
  };

  const grammarImport = async () => customLanguage;
  const otherImport = async () => customLanguage;

  it('returns plaintext for nullish and empty languages', () => {
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

  it('uses custom language object directly', () => {
    expect(resolveLanguage(customLanguage)).toEqual({
      languageId: 'my-language',
      langsToLoad: [customLanguage],
    });
  });

  it('resolves custom language by name', () => {
    expect(resolveLanguage('my-language', customLanguage)).toEqual({
      languageId: 'my-language',
      langsToLoad: [customLanguage],
    });
  });

  it('trims language strings before custom language lookup', () => {
    expect(resolveLanguage('  my-language  ', customLanguage)).toEqual({
      languageId: 'my-language',
      langsToLoad: [customLanguage],
    });
  });

  it('resolves custom language by scopeName tail', () => {
    const scopeNameLanguage: LanguageRegistration = {
      ...registration,
      name: 'scope-based-language',
    };

    expect(resolveLanguage('my-language', [scopeNameLanguage])).toEqual({
      languageId: 'scope-based-language',
      langsToLoad: [scopeNameLanguage],
    });
  });

  it('resolves custom language by alias and file type', () => {
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

  it('resolves alias map before passing through', () => {
    expect(
      resolveLanguage('mylang', undefined, {
        mylang: 'javascript',
      })
    ).toEqual({
      languageId: 'javascript',
      langsToLoad: ['javascript'],
    });
  });

  it('trims language strings before alias lookup', () => {
    expect(
      resolveLanguage('  mylang  ', undefined, {
        mylang: 'javascript',
      })
    ).toEqual({
      languageId: 'javascript',
      langsToLoad: ['javascript'],
    });
  });

  it('matches alias map keys case-insensitively', () => {
    expect(
      resolveLanguage('MyLang', undefined, {
        mylang: 'javascript',
      })
    ).toEqual({
      languageId: 'javascript',
      langsToLoad: ['javascript'],
    });
  });

  it('falls back to passthrough when no resolver match exists', () => {
    expect(resolveLanguage('plain-old-lang', customLanguage)).toEqual({
      languageId: 'plain-old-lang',
      langsToLoad: ['plain-old-lang', customLanguage],
    });
  });

  it('trims passthrough language ids', () => {
    expect(resolveLanguage('  plain-old-lang  ', customLanguage)).toEqual(
      {
        languageId: 'plain-old-lang',
        langsToLoad: ['plain-old-lang', customLanguage],
      }
    );
  });

  it('gives custom language precedence over alias map', () => {
    expect(
      resolveLanguage('my-language', customLanguage, {
        'my-language': 'typescript',
      })
    ).toEqual({
      languageId: 'my-language',
      langsToLoad: [customLanguage],
    });
  });

  it('matches custom language from preloadLanguages', () => {
    expect(
      resolveLanguage('my-language', undefined, undefined, customLanguage)
    ).toEqual({
      languageId: 'my-language',
      langsToLoad: [customLanguage],
    });
  });

  it('merges preloadLanguages and customLanguages without duplicates', () => {
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

  it('passes dynamic imports through to the factory', () => {
    expect(
      resolveLanguage('my-language', undefined, undefined, [
        grammarImport,
      ])
    ).toEqual({
      languageId: 'my-language',
      langsToLoad: ['my-language', grammarImport],
    });
  });

  it('dedupes dynamic imports by reference', () => {
    expect(
      resolveLanguage('typescript', undefined, undefined, [
        grammarImport,
        grammarImport,
        otherImport,
      ])
    ).toEqual({
      languageId: 'typescript',
      langsToLoad: ['typescript', grammarImport, otherImport],
    });
  });

  it('dedupes repeated preload string ids while preserving order', () => {
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

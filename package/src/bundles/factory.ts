import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import type {
  Awaitable,
  DynamicImportLanguageRegistration,
  HighlighterCore,
  RegexEngine,
} from 'shiki/core';
import type { HighlighterFactory, Language, Theme } from '../lib/types';
import { isLoadableLanguage } from '../lib/language';

type GetSingletonHighlighter = (options: {
  langs: NonNullable<Language>[];
  themes: Theme[];
  engine: Awaitable<RegexEngine>;
}) => Promise<HighlighterCore>;

/**
 * Builds a highlighter factory for a Shiki bundle (full or web).
 * Unloadable languages are filtered out so unknown ids fall back to
 * plaintext instead of throwing.
 */
export const bundledHighlighterFactory =
  (
    getSingletonHighlighter: GetSingletonHighlighter,
    bundledLanguages: Record<string, DynamicImportLanguageRegistration>
  ): HighlighterFactory =>
  (langsToLoad, themesToLoad, engine) =>
    getSingletonHighlighter({
      langs: langsToLoad.filter((lang) =>
        isLoadableLanguage(lang, bundledLanguages)
      ),
      themes: themesToLoad,
      engine: engine ?? createOnigurumaEngine(import('shiki/wasm')),
    });

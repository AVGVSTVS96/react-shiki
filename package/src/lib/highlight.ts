import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { ReactElement } from 'react';

import type {
  Highlighter,
  HighlighterCore,
  Awaitable,
  LanguageInput,
  RegexEngine,
} from 'shiki';

import { guessEmbeddedLanguages } from 'shiki/core';

import type {
  HighlighterOptions,
  Language,
  Theme,
  Themes,
} from './types';

import { resolveLanguage, resolveLoadedLanguage } from './language';
import { buildShikiOptions } from './options';
import { resolveTheme } from './theme';

export type HighlighterFactory = (
  langsToLoad: Language[],
  themesToLoad: Theme[],
  engine?: Awaitable<RegexEngine>
) => Promise<Highlighter | HighlighterCore>;

export type NormalizedHighlightInput = {
  code: string;
  delay: number | undefined;
  languageId: string;
  outputFormat: HighlighterOptions['outputFormat'];
  highlighter?: Highlighter | HighlighterCore;
  langsToLoad: Language[];
  themesToLoad: Theme[];
  engine?: Awaitable<RegexEngine>;
  shikiOptions: ReturnType<typeof buildShikiOptions>;
};

export type ResolvedHighlight = string | ReactElement;

const getEmbeddedLanguages = (
  code: string,
  languageId: string,
  highlighter: Highlighter | HighlighterCore
): LanguageInput[] => {
  const bundled: Record<string, LanguageInput> =
    highlighter.getBundledLanguages();
  return guessEmbeddedLanguages(code, languageId).flatMap(
    (language) => bundled[language] ?? []
  );
};

export const normalizeHighlightInput = (
  code: string,
  language: Language,
  theme: Theme | Themes,
  options: HighlighterOptions
): NormalizedHighlightInput => {
  const { languageId, langsToLoad } = resolveLanguage(
    language,
    options.customLanguages,
    options.langAlias,
    options.preloadLanguages
  );
  const resolvedTheme = resolveTheme(theme);

  return {
    code,
    delay: options.delay,
    engine: options.engine,
    highlighter: options.highlighter,
    languageId,
    langsToLoad,
    outputFormat: options.outputFormat,
    themesToLoad: resolvedTheme.themesToLoad,
    shikiOptions: buildShikiOptions({
      languageId,
      options,
      resolvedTheme,
    }),
  };
};

export const resolveHighlight = async (
  input: NormalizedHighlightInput,
  highlighterFactory: HighlighterFactory
): Promise<ResolvedHighlight> => {
  const highlighter = input.highlighter
    ? input.highlighter
    : await highlighterFactory(
        input.langsToLoad,
        input.themesToLoad,
        input.engine
      );

  if (!input.highlighter) {
    const embedded = getEmbeddedLanguages(
      input.code,
      input.languageId,
      highlighter
    );

    if (embedded.length > 0) {
      await highlighter.loadLanguage(...embedded);
    }
  }

  const lang = resolveLoadedLanguage(
    input.languageId,
    highlighter.getLoadedLanguages()
  );
  const options = { ...input.shikiOptions, lang };

  return input.outputFormat === 'html'
    ? highlighter.codeToHtml(input.code, options)
    : toJsxRuntime(highlighter.codeToHast(input.code, options), {
        jsx,
        jsxs,
        Fragment,
      });
};

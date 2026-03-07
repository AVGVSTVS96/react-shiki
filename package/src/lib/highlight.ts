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
} from './types';

import { resolveLoadedLanguage } from './language';
import { buildShikiOptions } from './options';

export type HighlighterFactory = (
  langsToLoad: Language[],
  themesToLoad: Theme[],
  engine?: Awaitable<RegexEngine>
) => Promise<Highlighter | HighlighterCore>;

export type ResolvedHighlight = string | ReactElement;

export const getEmbeddedLanguages = (
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

export const resolveHighlight = (
  code: string,
  languageId: string,
  outputFormat: HighlighterOptions['outputFormat'],
  shikiOptions: ReturnType<typeof buildShikiOptions>,
  highlighter: Highlighter | HighlighterCore
): ResolvedHighlight => {
  const lang = resolveLoadedLanguage(
    languageId,
    highlighter.getLoadedLanguages()
  );
  const options = { ...shikiOptions, lang };

  return outputFormat === 'html'
    ? highlighter.codeToHtml(code, options)
    : toJsxRuntime(highlighter.codeToHast(code, options), {
        jsx,
        jsxs,
        Fragment,
      });
};

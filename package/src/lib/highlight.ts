import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { ReactElement } from 'react';

import type {
  Highlighter,
  HighlighterCore,
  CodeToHastOptions,
  LanguageInput,
} from 'shiki';

import { guessEmbeddedLanguages } from 'shiki/core';

import { resolveLoadedLanguage } from './language';

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
  outputFormat: 'react' | 'html' | undefined,
  shikiOptions: CodeToHastOptions,
  highlighter: Highlighter | HighlighterCore
): string | ReactElement => {
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

import type { CodeToHastOptions } from 'shiki';

import type { HighlighterOptions, OutputFormat } from './types';
import type { ThemeResolution } from './theme';
import { toShikiOptions, getMultiThemeOptions } from './theme';
import { lineNumbersTransformer } from './transformers';

export const buildShikiOptions = <F extends OutputFormat>(
  languageId: string,
  themeResolution: ThemeResolution,
  options: HighlighterOptions<F>
): CodeToHastOptions => {
  const {
    defaultColor,
    cssVariablePrefix,
    showLineNumbers,
    startingLineNumber = 1,
    outputFormat,
    delay: _delay,
    customLanguages: _customLanguages,
    highlighter: _highlighter,
    langAlias: _langAlias,
    engine: _engine,
    ...restOptions
  } = options;

  const transformers = [...(restOptions.transformers || [])];
  if (showLineNumbers && outputFormat !== 'tokens') {
    transformers.push(lineNumbersTransformer(startingLineNumber));
  }

  return {
    lang: languageId,
    ...toShikiOptions(themeResolution),
    ...getMultiThemeOptions(
      themeResolution,
      defaultColor,
      cssVariablePrefix
    ),
    ...restOptions,
    transformers,
  };
};

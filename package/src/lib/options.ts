import type {
  CodeToHastOptions,
  CodeOptionsSingleTheme,
  CodeOptionsMultipleThemes,
  BundledTheme,
} from 'shiki';

import type { HighlighterOptions, OutputFormat, Themes } from './types';
import type { ThemeResult } from './resolvers';
import { lineNumbersTransformer } from './transformers';

const DEFAULT_THEMES: Themes = {
  light: 'github-light',
  dark: 'github-dark',
};

const buildThemeOptions = (
  themeResult: ThemeResult
):
  | CodeOptionsSingleTheme<BundledTheme>
  | CodeOptionsMultipleThemes<BundledTheme> => {
  const { isMultiTheme, multiTheme, singleTheme } = themeResult;

  if (isMultiTheme) {
    return {
      themes: multiTheme || DEFAULT_THEMES,
    } as CodeOptionsMultipleThemes<BundledTheme>;
  }

  return {
    theme: singleTheme || DEFAULT_THEMES.dark,
  } as CodeOptionsSingleTheme<BundledTheme>;
};

export const buildShikiOptions = <F extends OutputFormat>(
  languageId: string,
  themeResult: ThemeResult,
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

  const themeOptions = buildThemeOptions(themeResult);
  const multiThemeOptions = themeResult.isMultiTheme
    ? { defaultColor, cssVariablePrefix }
    : {};

  const transformers = [...(restOptions.transformers || [])];
  if (showLineNumbers && outputFormat !== 'tokens') {
    transformers.push(lineNumbersTransformer(startingLineNumber));
  }

  return {
    lang: languageId,
    ...themeOptions,
    ...multiThemeOptions,
    ...restOptions,
    transformers,
  };
};

export { DEFAULT_THEMES };

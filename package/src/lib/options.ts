import type {
  BundledTheme,
  CodeOptionsMultipleThemes,
  CodeOptionsSingleTheme,
  CodeToHastOptions,
} from 'shiki';

import type { HighlighterOptions, Themes } from './types';
import type { ThemeResult } from './theme';
import { lineNumbersTransformer } from './transformers';

const DEFAULT_THEMES: Themes = {
  light: 'github-light',
  dark: 'github-dark',
};

interface BuildShikiOptionsInput {
  languageId: string;
  resolvedTheme: ThemeResult;
  options: HighlighterOptions;
}

const buildThemeOptions = (
  resolvedTheme: ThemeResult,
  options: HighlighterOptions
):
  | CodeOptionsMultipleThemes<BundledTheme>
  | CodeOptionsSingleTheme<BundledTheme> => {
  if (resolvedTheme.isMultiTheme) {
    return {
      themes: resolvedTheme.multiTheme ?? DEFAULT_THEMES,
      defaultColor: options.defaultColor,
      cssVariablePrefix: options.cssVariablePrefix,
    } as CodeOptionsMultipleThemes<BundledTheme>;
  }

  return {
    theme: resolvedTheme.singleTheme ?? DEFAULT_THEMES.dark,
  } as CodeOptionsSingleTheme<BundledTheme>;
};

const buildTransformers = (
  options: HighlighterOptions
): CodeToHastOptions['transformers'] => {
  const transformers = [...(options.transformers || [])];

  if (options.showLineNumbers) {
    transformers.push(lineNumbersTransformer(options.startingLineNumber));
  }

  return transformers;
};

export const buildShikiOptions = ({
  languageId,
  resolvedTheme,
  options,
}: BuildShikiOptionsInput): CodeToHastOptions => {
  const {
    defaultColor: _defaultColor,
    cssVariablePrefix: _cssVariablePrefix,
    showLineNumbers: _showLineNumbers,
    startingLineNumber: _startingLineNumber,
    transformers: _transformers,
    ...restOptions
  } = options;

  return {
    lang: languageId,
    ...buildThemeOptions(resolvedTheme, options),
    ...restOptions,
    transformers: buildTransformers(options),
  };
};

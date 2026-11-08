import type {
  BundledTheme,
  CodeOptionsMultipleThemes,
  CodeOptionsSingleTheme,
  CodeToHastOptions,
} from 'shiki';

import type {
  HighlighterOptions,
  HighlighterOptionsFor,
  OutputFormat,
} from './types';
import type { ResolvedTheme } from './theme';
import {
  highlightedLinesTransformer,
  lineNumbersTransformer,
} from './transformers';

const buildThemeOptions = (
  resolvedTheme: ResolvedTheme,
  defaultColor: HighlighterOptions['defaultColor'],
  cssVariablePrefix: HighlighterOptions['cssVariablePrefix']
):
  | CodeOptionsMultipleThemes<BundledTheme>
  | CodeOptionsSingleTheme<BundledTheme> => {
  if (resolvedTheme.isMulti) {
    return {
      themes: resolvedTheme.themes,
      defaultColor,
      cssVariablePrefix,
    };
  }

  return {
    theme: resolvedTheme.theme,
  };
};

export const buildShikiOptions = (
  languageId: string,
  resolvedTheme: ResolvedTheme,
  options: HighlighterOptionsFor<OutputFormat>
): CodeToHastOptions => {
  const {
    delay,
    customLanguages,
    preloadLanguages,
    outputFormat,
    highlighter,
    langAlias,
    engine,
    defaultColor,
    cssVariablePrefix,
    showLineNumbers,
    startingLineNumber,
    highlightLineNumbers,
    transformers: userTransformers,
    ...shikiPassthrough
  } = options;

  const transformers = [...(userTransformers || [])];
  if (showLineNumbers) {
    transformers.push(lineNumbersTransformer(startingLineNumber));
  }
  if (highlightLineNumbers?.length) {
    transformers.push(
      highlightedLinesTransformer(
        highlightLineNumbers,
        startingLineNumber
      )
    );
  }

  return {
    lang: languageId,
    ...buildThemeOptions(resolvedTheme, defaultColor, cssVariablePrefix),
    ...shikiPassthrough,
    transformers,
  };
};

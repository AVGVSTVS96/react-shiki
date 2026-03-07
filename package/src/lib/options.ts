import type {
  BundledTheme,
  CodeOptionsMultipleThemes,
  CodeOptionsSingleTheme,
  CodeToHastOptions,
} from 'shiki';

import type { ShikiInputOptions } from './types';
import type { ResolvedTheme } from './theme';
import { lineNumbersTransformer } from './transformers';

const buildThemeOptions = (
  resolvedTheme: ResolvedTheme,
  options: ShikiInputOptions
):
  | CodeOptionsMultipleThemes<BundledTheme>
  | CodeOptionsSingleTheme<BundledTheme> => {
  if (resolvedTheme.isMulti) {
    return {
      themes: resolvedTheme.themes,
      defaultColor: options.defaultColor,
      cssVariablePrefix: options.cssVariablePrefix,
    } as CodeOptionsMultipleThemes<BundledTheme>;
  }

  return {
    theme: resolvedTheme.theme,
  } as CodeOptionsSingleTheme<BundledTheme>;
};

export const buildShikiOptions = (
  languageId: string,
  resolvedTheme: ResolvedTheme,
  options: ShikiInputOptions
): CodeToHastOptions => {
  const {
    defaultColor,
    cssVariablePrefix,
    showLineNumbers,
    startingLineNumber,
    transformers: userTransformers,
    ...shikiPassthrough
  } = options;

  const transformers = [...(userTransformers || [])];
  if (showLineNumbers) {
    transformers.push(lineNumbersTransformer(startingLineNumber));
  }

  return {
    lang: languageId,
    ...buildThemeOptions(resolvedTheme, options),
    ...shikiPassthrough,
    transformers,
  };
};

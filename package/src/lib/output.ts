import type { ReactNode } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';

import type {
  Highlighter,
  HighlighterCore,
  CodeToHastOptions,
  CodeToTokensOptions,
  CodeToTokensBaseOptions,
  TokensResult,
  ThemedToken,
} from 'shiki';

import type { OutputFormat, OutputFormatMap } from './types';

// Widens Shiki's method signatures to accept dynamic string values for lang/theme
type LooseHighlighter = (Highlighter | HighlighterCore) & {
  codeToTokens(code: string, options: CodeToTokensOptions): TokensResult;
  codeToTokensBase(
    code: string,
    options: CodeToTokensBaseOptions
  ): ThemedToken[][];
};

type TransformContext = {
  highlighter: LooseHighlighter;
  code: string;
  options: CodeToHastOptions;
  isMultiTheme: boolean;
};

const transformToReact = ({
  highlighter,
  code,
  options,
}: TransformContext): ReactNode =>
  toJsxRuntime(highlighter.codeToHast(code, options), {
    jsx,
    jsxs,
    Fragment,
  });

const transformToHtml = ({
  highlighter,
  code,
  options,
}: TransformContext): string => highlighter.codeToHtml(code, options);

const transformToTokens = ({
  highlighter,
  code,
  options,
  isMultiTheme,
}: TransformContext): TokensResult => {
  // Multi-theme: codeToTokens returns full TokensResult with all theme variants
  // Single-theme: codeToTokensBase returns just tokens, we construct the rest
  if (isMultiTheme) {
    return highlighter.codeToTokens(code, options as CodeToTokensOptions);
  }

  const tokens = highlighter.codeToTokensBase(
    code,
    options as CodeToTokensBaseOptions
  );

  const themeId = (options as CodeToTokensBaseOptions).theme;
  const theme = themeId ? highlighter.getTheme(themeId) : undefined;

  return {
    tokens,
    fg: theme?.fg ?? '',
    bg: theme?.bg ?? '',
    themeName: theme?.name ?? '',
    rootStyle: theme?.fg
      ? `color:${theme.fg};background-color:${theme.bg}`
      : '',
  };
};

const outputTransformers = {
  react: transformToReact,
  html: transformToHtml,
  tokens: transformToTokens,
} as const;

export const transformOutput = <F extends OutputFormat>(
  format: F,
  highlighter: Highlighter | HighlighterCore,
  code: string,
  options: CodeToHastOptions,
  isMultiTheme: boolean
): OutputFormatMap[F] => {
  const context: TransformContext = {
    highlighter: highlighter as LooseHighlighter,
    code,
    options,
    isMultiTheme,
  };
  // Cast okay: registry keys match OutputFormat and each transformer returns its corresponding type
  return outputTransformers[format](context) as OutputFormatMap[F];
};

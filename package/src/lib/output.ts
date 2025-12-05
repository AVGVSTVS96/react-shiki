/**
 * Output transformers for converting Shiki highlighter output to different formats.
 * Each transformer is a pure function that takes highlighter output and returns the desired format.
 */

import type { ReactNode } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';

import type {
  Highlighter,
  HighlighterCore,
  CodeToHastOptions,
  TokensResult,
  ThemedToken,
} from 'shiki';

import type { OutputFormat, OutputFormatMap } from './types';

type TransformContext = {
  highlighter: Highlighter | HighlighterCore;
  code: string;
  options: CodeToHastOptions;
  isMultiTheme: boolean;
};

/**
 * Transform highlighted code to React nodes via HAST
 */
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

/**
 * Transform highlighted code to HTML string
 */
const transformToHtml = ({
  highlighter,
  code,
  options,
}: TransformContext): string => highlighter.codeToHtml(code, options);

/**
 * Transform highlighted code to themed tokens with metadata.
 */
const transformToTokens = ({
  highlighter,
  code,
  options,
  isMultiTheme,
}: TransformContext): TokensResult => {
  if (isMultiTheme) {
    return (highlighter as any).codeToTokens(
      code,
      options
    ) as TokensResult;
  }

  const tokens = (highlighter as any).codeToTokensBase(
    code,
    options
  ) as ThemedToken[][];

  const themeId = (options as { theme?: string }).theme;
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

/**
 * Registry of output transformers keyed by format
 */
const outputTransformers = {
  react: transformToReact,
  html: transformToHtml,
  tokens: transformToTokens,
} as const;

/**
 * Transform highlighter output to the specified format.
 * Uses the transformer registry for clean dispatch without conditionals.
 */
export const transformOutput = <F extends OutputFormat>(
  format: F,
  highlighter: Highlighter | HighlighterCore,
  code: string,
  options: CodeToHastOptions,
  isMultiTheme: boolean
): OutputFormatMap[F] => {
  const context: TransformContext = {
    highlighter,
    code,
    options,
    isMultiTheme,
  };
  return outputTransformers[format](context) as OutputFormatMap[F];
};

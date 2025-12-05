/**
 * Output transformers for converting Shiki highlighter output to different formats.
 */

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

/**
 * Shiki's Highlighter methods are parameterized by BundledLanguage/BundledTheme,
 * but we accept dynamic string values. This type widens the method signatures.
 */
type LooseHighlighter = (Highlighter | HighlighterCore) & {
  codeToTokens(code: string, options: CodeToTokensOptions): TokensResult;
  codeToTokensBase(code: string, options: CodeToTokensBaseOptions): ThemedToken[][];
};

type TransformContext = {
  highlighter: LooseHighlighter;
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
 */
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
  return outputTransformers[format](context) as OutputFormatMap[F];
};

import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { TokensResult, ThemedToken } from 'shiki';
import type { OutputFormat, OutputFormatMap } from './types';

/**
 * Creates unstyled tokens from plain code.
 * Used as fallback while highlighting is in progress.
 */
export const createFallbackTokens = (code: string): TokensResult => {
  const lines = code.split('\n');
  const tokens: ThemedToken[][] = lines.map((line) => [
    {
      content: line,
      offset: 0,
      color: 'inherit',
    },
  ]);

  return {
    tokens,
    fg: 'inherit',
    bg: 'transparent',
    themeName: '',
    rootStyle: '',
  };
};

/**
 * Creates plain React nodes from code.
 * Preserves whitespace and line breaks.
 */
export const createFallbackReact = (code: string): ReactNode => {
  const lines = code.split('\n');
  return createElement(
    'pre',
    { className: 'shiki' },
    createElement(
      'code',
      null,
      lines.map((line, i) =>
        createElement(
          'span',
          { key: i, className: 'line' },
          createElement('span', null, line),
          i < lines.length - 1 ? '\n' : null
        )
      )
    )
  );
};

/**
 * Escapes HTML special characters for safe rendering.
 */
const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Creates HTML string from plain code.
 * Matches Shiki's output structure for consistency.
 */
export const createFallbackHtml = (code: string): string => {
  const lines = code.split('\n');
  const lineHtml = lines
    .map(
      (line) =>
        `<span class="line"><span>${escapeHtml(line)}</span></span>`
    )
    .join('\n');

  return `<pre class="shiki"><code>${lineHtml}</code></pre>`;
};

/**
 * Creates a fallback result for the specified output format.
 * Used to provide immediate content while highlighting is in progress.
 */
export const createFallback = <F extends OutputFormat>(
  format: F,
  code: string
): OutputFormatMap[F] => {
  switch (format) {
    case 'tokens':
      return createFallbackTokens(code) as OutputFormatMap[F];
    case 'html':
      return createFallbackHtml(code) as OutputFormatMap[F];
    default:
      return createFallbackReact(code) as OutputFormatMap[F];
  }
};

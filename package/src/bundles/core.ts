import type { Highlighter, HighlighterCore } from 'shiki';

/**
 * Validates that a highlighter is provided for the core bundle.
 * The core bundle requires users to provide their own highlighter instance.
 */
export function validateCoreHighlighter(
  highlighter: Highlighter | HighlighterCore | undefined
): Highlighter | HighlighterCore {
  if (!highlighter) {
    throw new Error(
      'react-shiki/core requires a custom highlighter. ' +
      'Use createHighlighterCore() from react-shiki or switch to react-shiki for plug-and-play usage.'
    );
  }
  return highlighter;
}
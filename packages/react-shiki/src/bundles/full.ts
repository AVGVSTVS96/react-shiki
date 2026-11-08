import { getSingletonHighlighter, bundledLanguages } from 'shiki';
import { bundledHighlighterFactory } from './factory';

/**
 * Highlighter factory for the full Shiki bundle: every language and
 * theme, largest size, maximum compatibility.
 */
export const createFullHighlighter = bundledHighlighterFactory(
  getSingletonHighlighter,
  bundledLanguages
);

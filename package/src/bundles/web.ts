import {
  getSingletonHighlighter,
  bundledLanguages,
} from 'shiki/bundle/web';
import { bundledHighlighterFactory } from './factory';

/**
 * Highlighter factory for the web Shiki bundle: web-focused languages
 * (HTML, CSS, JS, TS, JSON, Markdown, Vue, JSX, Svelte, etc.) at a
 * fraction of the full bundle's size.
 */
export const createWebHighlighter = bundledHighlighterFactory(
  getSingletonHighlighter,
  bundledLanguages
);

import { useEffect, useRef, useState, type ReactNode } from 'react';
import parse from 'html-react-parser';

import {
  createHighlighter,
  createSingletonShorthands,
} from 'shiki';

import type {
  Language,
  Theme,
  HighlighterOptions,
  TimeoutState
} from './types';

import { 
  removeTabIndexFromPre,
  throttleHighlighting,
  resolvedLang
} from './utils';


/**
 * Create singleton shorthands which handle automatic loading
 * of the languages and themes, with support for custom themes.
 */
const highlighter = createSingletonShorthands(createHighlighter);


/**
 * A React hook that provides syntax highlighting using Shiki.
 * Supports optional throttled highlights and custom themes.
 *
 * @example
 * const highlightedCode = useShikiHighlighter(code, language, theme, {
 *   transformers: [removeTabIndexFromPre],
 *   delay: 150
 * });
 */
export const useShikiHighlighter = (
  code: string,
  lang: Language,
  theme: Theme,
  options: HighlighterOptions = {}
) => {
  const [highlightedCode, setHighlightedCode] = useState<ReactNode | null>(null);
  const language = resolvedLang(lang);

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined
  });

  useEffect(() => {
    let isMounted = true;

    const transformers = [removeTabIndexFromPre, ...(options.transformers || [])];

    const highlightCode = async () => {
      // If provided, load custom language after highlighter is initialized
      if (typeof lang === 'object' && lang !== null && 'id' in lang) {
        const shikiInstance = await highlighter.getSingletonHighlighter({
          langs: [language],
          themes: [theme],
        });
        await shikiInstance.loadLanguage(lang);
      }

      const html = await highlighter.codeToHtml(code, {
        lang: language,
        theme,
        transformers
      });

      if (isMounted) {
        setHighlightedCode(parse(html));
      }
    };

    const { delay } = options;

    if (delay) {
      throttleHighlighting(highlightCode, timeoutControl, delay);
    } else {
      highlightCode().catch(console.error);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutControl.current.timeoutId);
    };
  }, [code, lang]);

  return highlightedCode;
};


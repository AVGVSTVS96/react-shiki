import { useEffect, useRef, useState, type ReactNode } from 'react';
import parse from 'html-react-parser';

import {
  createHighlighter,
  ShikiError,
  type BundledLanguage,
  type Highlighter
} from 'shiki';

import type {
  Language,
  Theme,
  HighlighterOptions,
  TimeoutState
} from './types';

import { removeTabIndexFromPre } from '@/utils';


/************************************
 ** Singleton highlighter instance **
 ************************************/
let highlighterPromise: Promise<Highlighter> | null = null;


/***********************************************************
 ** Creates or returns the singleton highlighter instance **
 ***********************************************************/
const makeHighlighter = async (theme: Theme): Promise<Highlighter> => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [],
      langs: []
    });
  }

  const highlighter = await highlighterPromise;
  await loadTheme(highlighter, theme);
  return highlighter;
};


/************************************************************
 ** Loads a theme dynamically if it hasn't been loaded yet **
 ************************************************************/
const loadTheme = async (
  highlighter: Highlighter,
  theme: Theme
): Promise<void> => {
  try {
    await highlighter.loadTheme(theme);
  } catch (error) {
    if (error instanceof ShikiError) {
      console.warn('Error loading theme:', error.message);
    }
    throw error;
  }
};


/******************************************************************************
 ** Loads a language dynamically, falling back to plaintext if not available **                                             **
 ******************************************************************************/
const loadLanguage = async (
  highlighter: Highlighter,
  lang: Language
): Promise<string> => {
  const resolvedLanguage = lang ?? 'plaintext';

  try {
    await highlighter.loadLanguage(resolvedLanguage as BundledLanguage);
    return resolvedLanguage;
  } catch (error) {
    if (error instanceof ShikiError && error.message.includes('not included in this bundle')) {
      console.warn(`Language '${resolvedLanguage}' not supported, falling back to plaintext`);
    }
    return 'plaintext';
  }
};


/*******************************************************************************
 ** Throttles highlighting operations to prevent overwhelming the highlighter **                                               **
 *******************************************************************************/
const throttleHighlighting = (
  performHighlight: () => Promise<void>,
  timeoutControl: React.MutableRefObject<TimeoutState>,
  throttleMs: number
) => {
  const now = Date.now();
  clearTimeout(timeoutControl.current.timeoutId);

  const delay = Math.max(0, timeoutControl.current.nextAllowedTime - now);
  timeoutControl.current.timeoutId = setTimeout(() => {
    performHighlight().catch(console.error);
    timeoutControl.current.nextAllowedTime = now + throttleMs;
  }, delay);
};


/************************************************************************
 ** A React hook that provides syntax highlighting using Shiki. Uses a **
 ** singleton highlighter instance and supports throttled updates.     **
*************************************************************************/
export const useShikiHighlighter = (
  code: string,
  lang: Language,
  theme: Theme,
  options: HighlighterOptions = {}
): ReactNode | null => {
  const [highlightedCode, setHighlightedCode] = useState<ReactNode | null>(null);
  const delayRef = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined
  });

  useEffect(() => {
    let isMounted = true;

    const highlightCode = async () => {
      const highlighter = await makeHighlighter(theme);
      const language = await loadLanguage(highlighter, lang);

      const html = highlighter.codeToHtml(code, {
        lang: language,
        theme,
        transformers: [removeTabIndexFromPre],
      });

      if (isMounted) {
        setHighlightedCode(parse(html));
      }
    };

    if (options.delay) {
      throttleHighlighting(highlightCode, delayRef, options.delay);
    } else {
      highlightCode().catch(console.error);
    }

    return () => {
      isMounted = false;
      clearTimeout(delayRef.current.timeoutId);
    };
  }, [code, lang]);

  return highlightedCode;
};

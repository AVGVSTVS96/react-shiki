import {
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';

import parse from 'html-react-parser';

import {
  createHighlighter,
  createSingletonShorthands,
  type Highlighter,
  type LanguageRegistration
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

// We use a singleton for bundled languages, but for custom languages we'll create a fresh instance.
const highlighter = createSingletonShorthands(createHighlighter);
const customHighlighterCache = new Map<string, Promise<Highlighter>>();

/**
 * A React hook that provides syntax highlighting using Shiki.
 * Supports optional throttled highlights and custom themes.
 *
 * @example
 * const highlightedCode = useShikiHighlighter(code, language, theme, {
 *   transformers: [removeTabIndexFromPre],
 *   delay: 150
 *   customLanguages: ['bosque', 'mcfunction']
 * });
 */
export const useShikiHighlighter = (
  code: string,
  lang: Language,
  theme: Theme,
  options: HighlighterOptions = {}
) => {
  const [highlightedCode, setHighlightedCode] = useState<ReactNode | null>(null);

  const preloadedCustomLang = options.customLanguage as LanguageRegistration | undefined;

  // Use the preloaded custom language if:
  // - lang is an object (already custom) OR
  // - lang is a string and matches one of preloadedCustomLang.fileTypes
  const useCustomPreloadedLang = Boolean(
    preloadedCustomLang != null 
      && ( typeof lang === 'object' 
        || ( typeof lang === 'string'
          && Array.isArray(preloadedCustomLang.fileTypes)
          && preloadedCustomLang.fileTypes.includes(lang)
      )
    )
  );
  // Otherwise, if lang is an object and no customLanguage was passed, treat it as a custom language.
  const useCustomLang = !useCustomPreloadedLang && lang && typeof lang === 'object';

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  // Retrieve or create a cached highlighter with customLang
  const getCachedCustomHighlighter = async (cacheKey: string, customLang: LanguageRegistration | typeof lang) => {
    let instance = customHighlighterCache.get(cacheKey);
    if (!instance) {
      instance = createHighlighter({
        langs: [customLang as LanguageRegistration],
        themes: [theme],
      });
      customHighlighterCache.set(cacheKey, instance);
    }
    return instance;
  };

  useEffect(() => {
    let isMounted = true;
    const transformers = [removeTabIndexFromPre, ...(options.transformers || [])];

    const highlightCode = async () => {
      let html: string;

      if (useCustomPreloadedLang && preloadedCustomLang) {
        const cacheKey = `${preloadedCustomLang.name}-${theme}`;
        const instance = await getCachedCustomHighlighter(cacheKey, preloadedCustomLang);
        html = instance.codeToHtml(code, {
          lang: preloadedCustomLang.name,
          theme,
          transformers,
        });
      } else if (useCustomLang) {
        const cacheKey = `${lang.name}-${theme}`;
        const instance = await getCachedCustomHighlighter(cacheKey, lang);
        html = instance.codeToHtml(code, {
          lang: lang.name,
          theme,
          transformers,
        });
      } else {
        // Bundled languages: use the singleton instance.
        html = await highlighter.codeToHtml(code, {
          lang: resolvedLang(lang),
          theme,
          transformers,
        });
      }

      if (isMounted) {
        setHighlightedCode(parse(html));
      }
    };
    if (options.delay) {
      throttleHighlighting(highlightCode, timeoutControl, options.delay);
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

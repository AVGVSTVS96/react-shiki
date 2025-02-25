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
} from 'shiki';

import type {
  LanguageRegistration,
  ShikiLanguageRegistration
} from './customTypes';

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

// Use Shiki managed singleton for bundled languages, create a fresh instance for custom languages
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
  console.log('useShikiHighlighter hook initialized');

  // const preloadedCustomLang = options.customLanguage as LanguageRegistration | undefined;

  // Use the preloaded custom language if
  // = lang is preloaded AND
  // - lang is an object (already custom) OR
  // - lang is a string and matches one of preloadedCustomLang.fileTypes
  // const useCustomPreloadedLang = Boolean(
  //   preloadedCustomLang != null
  //   && (typeof lang === 'object'
  //     || (typeof lang === 'string'
  //       && Array.isArray(preloadedCustomLang.fileTypes)
  //       && preloadedCustomLang.fileTypes.includes(lang)
  //     )
  //   )
  // );

  // Otherwise, use the custom language directly from the lang prop
  // const useCustomLang = !useCustomPreloadedLang && lang && typeof lang === 'object';
  //
  // const customLang = useCustomPreloadedLang
  //   ? preloadedCustomLang
  //   : useCustomLang
  //     ? lang
  //     : undefined;

  // Normalize customLanguage to always be an array.
  const customLangArray: LanguageRegistration[] = options.customLanguage
    ? Array.isArray(options.customLanguage)
      ? options.customLanguage
      : [options.customLanguage]
    : [];

  // Choose the matching custom language:
  const customLang: LanguageRegistration | undefined =
    typeof lang === 'string'
      ? customLangArray.find(cl =>
        (cl.fileTypes && cl.fileTypes.includes(lang)) ||
        (cl.scopeName && cl.scopeName.split('.')[1] === lang) ||
        // and if the lang.name === lang
        (cl.name && cl.name === lang)
      )
      : (lang && typeof lang === 'object' ? lang as LanguageRegistration : undefined);

  console.log('Resolved customLang:', customLang, lang);
  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  // Retrieve or create a cached highlighter with customLang
  const getCachedCustomHighlighter = async (cacheKey: string, customLang: LanguageRegistration | typeof lang) => {
    let instance = customHighlighterCache.get(cacheKey);
    if (!instance) {
      instance = createHighlighter({
        langs: [customLang as ShikiLanguageRegistration],
        themes: [theme],
      });
      customHighlighterCache.set(cacheKey, instance);
    }
    return instance;
  };

  useEffect(() => {
    let isMounted = true;
    // TODO: Consider retaining tabindex for WCAG 2.1 compliance
    // https://github.com/shikijs/shiki/issues/428
    // https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/proposed/
    const transformers = [removeTabIndexFromPre, ...(options.transformers || [])];

    const highlightCode = async () => {
      let html: string;

      if (customLang) {
        const cacheKey = `${customLang.name}-${theme}`;
        const customLangHighlighter = await getCachedCustomHighlighter(cacheKey, customLang);

        html = customLangHighlighter.codeToHtml(code, {
          lang: customLang.name,
          theme,
          transformers,
        });

      } else {

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

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import parse from 'html-react-parser';

import {
  createHighlighter,
  createSingletonShorthands,
  type CodeToHastOptions,
  type Highlighter,
  type ThemeRegistration,
} from 'shiki';

import type {
  LanguageRegistration,
  ShikiLanguageRegistration,
} from './customTypes';

import type {
  Language,
  Theme,
  HighlighterOptions,
  TimeoutState,
  Themes,
} from './types';

import {
  removeTabIndexFromPre,
  throttleHighlighting,
  resolveLanguage,
  resolveTheme,
} from './utils';

// Use Shiki managed singleton for bundled languages, create and cache a fresh instance for custom languages
const bundledHighlighter = createSingletonShorthands(createHighlighter);
const customLangHighlighter = new Map<string, Promise<Highlighter>>();

const getCachedCustomHighlighter = async (
  cacheKey: string,
  customLang: LanguageRegistration,
  themesToLoad: Theme[]
) => {
  let instance = customLangHighlighter.get(cacheKey);

  if (!instance) {
    instance = createHighlighter({
      langs: [customLang as ShikiLanguageRegistration],
      themes: themesToLoad as ThemeRegistration[],
    });
    customLangHighlighter.set(cacheKey, instance);
  }
  return instance;
};

/**
 * A React hook that provides syntax highlighting using Shiki.
 * Supports single theme and multi-theme highlighting, custom themes
 * and languages, custom transformers, and optional throttling.
 *
 * ```ts
 * // Basic Usage
 * const highlightedCode = useShikiHighlighter( code, 'typescript', 'github-dark');
 * ```
 *
 * ```ts
 * // Custom Languages, Transformers, and Delay
 * const highlightedCode = useShikiHighlighter(code, language, theme, {
 *   transformers: [customTransformer],
 *   delay: 150
 *   customLanguages: ['bosque', 'mcfunction']
 * });
 * ```
 *
 * ```ts
 * // Multiple Themes, Custom Languages, Delay, and Custom Transformers
 * const highlightedCode = useShikiHighlighter(
 *   code,
 *   language,
 *   {
 *     light: 'github-light',
 *     dark: 'github-dark',
 *     dim: 'github-dark-dimmed'
 *   },
 *   {
 *     delay: 150,
 *     defaultColor: 'dim',
 *     transformers: [customTransformer],
 *     customLanguages: ['bosque', 'mcfunction']
 *   }
 * );
 * ```
 */
export const useShikiHighlighter = (
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions = {}
) => {
  const [highlightedCode, setHighlightedCode] =
    useState<ReactNode | null>(null);

  const normalizedCustomLanguages: LanguageRegistration[] =
    options.customLanguages
      ? Array.isArray(options.customLanguages)
        ? options.customLanguages
        : [options.customLanguages]
      : [];

  const customLangKey = normalizedCustomLanguages
    .map((lang) => lang.name || '')
    .join('-');

  const transformers = useMemo(() => {
    return [removeTabIndexFromPre, ...(options.transformers || [])];
  }, [options.transformers]);

  const {
    isMultiTheme,
    themeKey,
    multiTheme,
    singleTheme,
    themesToLoad,
  } = useMemo(() => resolveTheme(themeInput), [themeInput]);

  const { isCustom, languageId, resolvedLanguage } = useMemo(
    () => resolveLanguage(lang, normalizedCustomLanguages),
    [lang, customLangKey]
  );

  const cacheKey = `${languageId}-${themeKey}`;

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  useEffect(() => {
    let isMounted = true;

    const highlightCode = async () => {
      const codeHighlighter =
        isCustom && resolvedLanguage
          ? await getCachedCustomHighlighter(
              cacheKey,
              resolvedLanguage,
              themesToLoad
            )
          : bundledHighlighter;

      const highlightOptions: CodeToHastOptions = isMultiTheme
        ? {
            themes: multiTheme,
            defaultColor: options.defaultColor,
            cssVariablePrefix: options.cssVariablePrefix,
            lang: languageId,
            transformers,
          }
        : {
            theme: singleTheme || 'github-dark',
            lang: languageId,
            transformers,
          };

      const html = await codeHighlighter.codeToHtml(
        code,
        highlightOptions
      );
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
      if (timeoutControl.current.timeoutId) {
        clearTimeout(timeoutControl.current.timeoutId);
      }
    };
  }, [
    code,
    languageId,
    themeKey,
    customLangKey,
    transformers,
    options.delay,
    options.defaultColor,
    options.cssVariablePrefix,
  ]);

  return highlightedCode;
};

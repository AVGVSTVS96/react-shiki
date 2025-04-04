import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import parse from 'html-react-parser';

import {
  getSingletonHighlighter,
  type Highlighter,
  type CodeToHastOptions,
  type CodeOptionsSingleTheme,
  type CodeOptionsMultipleThemes,
} from 'shiki';

import type {
  LanguageRegistration,
  ShikiLanguageRegistration,
} from './extended-types';

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

const DEFAULT_THEMES = {
  light: 'github-light',
  dark: 'github-dark',
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

  const customLangId = normalizedCustomLanguages
    .map((lang) => lang.name || '')
    .sort()
    .join('-');

  const transformers = useMemo(() => {
    return [removeTabIndexFromPre, ...(options.transformers || [])];
  }, [options.transformers]);

  const { isMultiTheme, themeId, multiTheme, singleTheme, themesToLoad } =
    useMemo(() => resolveTheme(themeInput), [themeInput]);

  const { languageId, langsToLoad } = useMemo(
    () => resolveLanguage(lang, normalizedCustomLanguages),
    [lang, customLangId]
  );

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  const buildShikiOptions = (): CodeToHastOptions => {
    const { defaultColor, cssVariablePrefix } = options;
    const commonOptions = { lang: languageId, transformers };

    const themeOptions = isMultiTheme
      ? ({
          themes: multiTheme || DEFAULT_THEMES,
          defaultColor,
          cssVariablePrefix,
        } as CodeOptionsMultipleThemes)
      : ({
          theme: singleTheme || DEFAULT_THEMES.dark,
        } as CodeOptionsSingleTheme);

    return { ...commonOptions, ...themeOptions };
  };

  useEffect(() => {
    let isMounted = true;

    const highlightCode = async () => {
      if (!languageId) return;
      const highlighter = await getSingletonHighlighter({
        langs: [langsToLoad as ShikiLanguageRegistration],
        themes: themesToLoad,
      });

      const highlighterOptions: CodeToHastOptions = buildShikiOptions();

      const html = highlighter.codeToHtml(code, highlighterOptions);

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
  }, [
    code,
    languageId,
    themeId,
    customLangId,
    transformers,
    options.delay,
    options.defaultColor,
    options.cssVariablePrefix,
  ]);

  return highlightedCode;
};

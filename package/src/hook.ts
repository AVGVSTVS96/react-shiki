import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { dequal } from 'dequal/lite';

import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';

import {
  getSingletonHighlighter,
  type CodeToHastOptions,
  type CodeOptionsSingleTheme,
  type CodeOptionsMultipleThemes,
} from 'shiki';

import type { ShikiLanguageRegistration } from './extended-types';
import { createFineGrainedBundle } from './bundle';

import type { Root } from 'hast';
import type {
  Language,
  Theme,
  HighlighterOptions,
  TimeoutState,
  Themes,
} from './types';

import { throttleHighlighting } from './utils';
import { resolveLanguage, resolveTheme } from './resolvers';

const DEFAULT_THEMES: Themes = {
  light: 'github-light',
  dark: 'github-dark',
};

/**
 * Returns a deep-stable reference and a version counter that only changes when content changes.
 * Includes optimizations for primitive values and reference equality.
 */
const useStableOptions = <T>(value: T) => {
  const ref = useRef(value);
  const revision = useRef(0);

  // Fast-path for primitive values
  if (typeof value !== 'object' || value === null) {
    if (value !== ref.current) {
      ref.current = value;
      revision.current += 1;
    }
    return [value, revision.current] as const;
  }

  // Reference equality check before expensive deep comparison
  if (value !== ref.current) {
    if (!dequal(value, ref.current)) {
      ref.current = value;
      revision.current += 1;
    }
  }

  return [ref.current, revision.current] as const;
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

  // Stabilize options, language and theme inputs to prevent unnecessary
  // re-renders or recalculations when object references change
  const [stableLang, langRev] = useStableOptions(lang);
  const [stableTheme, themeRev] = useStableOptions(themeInput);
  const [stableOpts, optsRev] = useStableOptions(options);

  const { languageId, langsToLoad } = useMemo(
    () => resolveLanguage(stableLang, stableOpts.customLanguages),
    [stableLang, stableOpts.customLanguages]
  );

  const { isMultiTheme, themeId, multiTheme, singleTheme, themesToLoad } =
    useMemo(() => resolveTheme(stableTheme), [stableTheme]);

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  const useFineGrainedBundle = !!stableOpts.fineGrainedBundle;

  const bundleCache = useRef<Map<string, Promise<any>>>(new Map());

  const bundle = useMemo(() => {
    if (!useFineGrainedBundle) return null;

    const {
      langs,
      themes,
      engine = 'javascript',
      precompiled = false,
      // biome-ignore lint/style/noNonNullAssertion: will fix
    } = stableOpts.fineGrainedBundle!; // TODO: Fix types

    const cacheKey = `${[...langs].sort().join(',')}|${[...themes]
      .sort()
      .join(',')}|${engine}|${precompiled}`;

    if (bundleCache.current.has(cacheKey)) {
      return bundleCache.current.get(cacheKey);
    }

    const bundlePromise = createFineGrainedBundle({
      langs,
      themes,
      engine,
      precompiled,
    });

    bundleCache.current.set(cacheKey, bundlePromise);

    return bundlePromise;
  }, [useFineGrainedBundle, stableOpts.fineGrainedBundle]);

  const shikiOptions = useMemo<CodeToHastOptions>(() => {
    const {
      defaultColor,
      cssVariablePrefix,
      fineGrainedBundle,
      ...restOptions
    } = stableOpts;
    const languageOption = { lang: languageId };

    const themeOptions = isMultiTheme
      ? ({
          themes: multiTheme || DEFAULT_THEMES,
          defaultColor,
          cssVariablePrefix,
        } as CodeOptionsMultipleThemes)
      : ({
          theme: singleTheme || DEFAULT_THEMES.dark,
        } as CodeOptionsSingleTheme);

    return { ...languageOption, ...themeOptions, ...restOptions };
  }, [languageId, themeId, langRev, themeRev, optsRev]);

  useEffect(() => {
    let isMounted = true;

    const highlightCode = async () => {
      if (!languageId) return;
      let hast: Root;
      if (useFineGrainedBundle && bundle) {
        const resolvedBundle = await bundle;
        hast = await resolvedBundle.codeToHast(code, shikiOptions);
      } else {
        const highlighter = await getSingletonHighlighter({
          langs: [langsToLoad as ShikiLanguageRegistration],
          themes: themesToLoad,
        });
        hast = highlighter.codeToHast(code, shikiOptions);
      }

      if (isMounted) {
        setHighlightedCode(toJsxRuntime(hast, { jsx, jsxs, Fragment }));
      }
    };

    const { delay } = stableOpts;

    if (delay) {
      throttleHighlighting(highlightCode, timeoutControl, delay);
    } else {
      highlightCode().catch(console.error);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutControl.current.timeoutId);
    };
  }, [
    code,
    shikiOptions,
    stableOpts.delay,
    stableOpts.fineGrainedBundle,
    useFineGrainedBundle,
  ]);

  return highlightedCode;
};

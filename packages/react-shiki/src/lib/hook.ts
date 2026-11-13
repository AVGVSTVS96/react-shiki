import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { CodeToHastOptions } from 'shiki';

import type {
  HighlightCache,
  HighlighterFactory,
  HighlighterOptions,
  HighlighterOptionsFor,
  HighlightResult,
  HighlightResultMap,
  Language,
  OutputFormat,
  PreloadLanguage,
  Theme,
  Themes,
  TimeoutState,
} from './types';

import { throttleHighlighting, useStableValue } from './utils';
import { useFeatureStyles } from './styles';
import {
  getEmbeddedLanguages,
  resolveLanguage,
  resolveLoadedLanguage,
} from './language';
import { resolveTheme } from './theme';
import { resolveEngine } from './engine';
import { buildShikiOptions } from './options';

export async function highlight<F extends OutputFormat = 'react'>(
  code: string,
  resolved: {
    languageId: string;
    langsToLoad: PreloadLanguage[];
    themesToLoad: Theme[];
    shikiOptions: CodeToHastOptions;
  },
  opts: Pick<HighlighterOptions, 'highlighter' | 'engine'> & {
    outputFormat?: F;
  },
  factory: HighlighterFactory
): Promise<HighlightResultMap[F]> {
  const { languageId, langsToLoad, themesToLoad, shikiOptions } =
    resolved;

  const format: OutputFormat = opts.outputFormat ?? 'react';

  const highlighter =
    opts.highlighter ??
    (await (async () => {
      const hl = await factory(
        langsToLoad,
        themesToLoad,
        resolveEngine(opts.engine)
      );

      await hl.loadLanguage(
        ...getEmbeddedLanguages(code, languageId, hl)
      );

      return hl;
    })());

  const language = resolveLoadedLanguage(
    languageId,
    highlighter.getLoadedLanguages()
  );

  const options = { ...shikiOptions, lang: language };

  const outputs = {
    react: (): ReactElement =>
      // oxlint-disable-next-line typescript/no-unsafe-return -- toJsxRuntime returns the global JSX.Element, which React 19's types no longer declare
      toJsxRuntime(highlighter.codeToHast(code, options), {
        jsx,
        jsxs,
        Fragment,
      }),
    html: () => highlighter.codeToHtml(code, options),
    tokens: () => highlighter.codeToTokens(code, options),
  } satisfies { [K in OutputFormat]: () => HighlightResultMap[K] };

  // Untyped call sites can pass formats outside OutputFormat; degrade to
  // react rendering like the pre-tokens ternary did instead of throwing.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, anti-slop/require-safety-comment-for-type-assertion -- outputs[format] returns HighlightResultMap[format], and TS can't tie format to the generic F
  return (outputs[format] ?? outputs.react)() as HighlightResultMap[F];
}

const readCache = <F extends OutputFormat>(
  cache: HighlightCache | undefined,
  key: string | undefined
): HighlightResult<F> => {
  if (!key) {
    return null;
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, anti-slop/require-safety-comment-for-type-assertion -- the key includes outputFormat, so an entry under it is HighlightResultMap[F]
  const cached = cache?.get(key) as HighlightResultMap[F] | undefined;

  return cached === undefined || cached === '' ? null : cached;
};

export const useHighlight = <F extends OutputFormat = 'react'>(
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  optionsInput: HighlighterOptionsFor<F> | undefined,
  highlighterFactory: HighlighterFactory
): HighlightResult<F> => {
  const { cache, ...rest } = optionsInput ?? {};
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  // This hook owns the line-number/highlight output, so it also owns the
  // corresponding styles. The primitive boolean limits effect reruns.
  useFeatureStyles(
    Boolean(rest.showLineNumbers || rest.highlightLineNumbers?.length)
  );

  const stableLang = useStableValue(lang);
  const stableTheme = useStableValue(themeInput);
  const stableOpts = useStableValue(rest);

  const resolved = useMemo(() => {
    const { languageId, langsToLoad } = resolveLanguage(
      stableLang,
      // oxlint-disable-next-line typescript/no-deprecated -- the hook still honors its own deprecated prop
      stableOpts.customLanguages,
      stableOpts.langAlias,
      stableOpts.preloadLanguages
    );

    const theme = resolveTheme(stableTheme);

    const shikiOptions = buildShikiOptions(languageId, theme, stableOpts);

    return {
      languageId,
      langsToLoad,
      themesToLoad: theme.themesToLoad,
      shikiOptions,
    };
  }, [stableLang, stableTheme, stableOpts]);

  const hasCache = Boolean(cache);

  const cacheScope = useMemo(
    () =>
      hasCache
        ? JSON.stringify([
            stableOpts.outputFormat ?? 'react',
            resolved.shikiOptions,
            stableOpts.startingLineNumber,
            stableOpts.highlightLineNumbers,
          ])
        : undefined,
    [hasCache, resolved, stableOpts]
  );

  const cacheKey = cacheScope && `${cacheScope}\n${code}`;

  const [highlightedCode, setHighlightedCode] = useState(() =>
    readCache<F>(cache, cacheKey)
  );

  const shown = useRef({ key: cacheKey, result: highlightedCode });

  useEffect(
    () => () => {
      const { key, result } = shown.current;

      if (key && result !== null && result !== '') {
        cacheRef.current?.set(key, result);
      }
    },
    []
  );

  const requestIdRef = useRef(0);

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  // Factory is invoked imperatively; its identity is not semantic, so it must
  // not invalidate the effect on every render. See issue #161.
  const highlighterFactoryRef = useRef(highlighterFactory);
  highlighterFactoryRef.current = highlighterFactory;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const timeouts = timeoutControl.current;

    const show = (result: HighlightResult<F>) => {
      shown.current = { key: cacheKey, result };
      setHighlightedCode(result);
    };

    const run = async () => {
      try {
        const result = await highlight<F>(
          code,
          resolved,
          stableOpts,
          highlighterFactoryRef.current
        );

        if (requestId === requestIdRef.current) {
          show(result);
        }
      } catch (error) {
        console.error('[react-shiki] highlight failed', error);
      }
    };

    const cached = readCache<F>(cacheRef.current, cacheKey);

    if (!resolved.languageId) {
      return () => {
        clearTimeout(timeouts.timeoutId);
      };
    }

    if (cached !== null) {
      if (shown.current.result !== cached) {
        show(cached);
      }
    } else if (stableOpts.delay) {
      throttleHighlighting(run, timeoutControl, stableOpts.delay);
    } else {
      void run();
    }

    return () => {
      clearTimeout(timeouts.timeoutId);
    };
  }, [code, cacheKey, resolved, stableOpts]);

  return highlightedCode;
};

import type { BundledLanguage, BundledTheme, RegexEngine } from 'shiki';
import {
  bundledLanguagesInfo,
  bundledThemesInfo,
} from 'shiki/bundle/full';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import {
  createJavaScriptRegexEngine,
  createJavaScriptRawEngine,
} from 'shiki/engine/javascript';
import {
  createSingletonShorthands,
  createdBundledHighlighter,
} from 'shiki/core';

export interface CodegenBundleOptions {
  /**
   * The languages to bundle, specified by their string identifiers.
   * @example ['typescript', 'javascript', 'vue']
   */
  langs: readonly BundledLanguage[];

  /**
   * The themes to bundle, specified by their string identifiers.
   * @example ['github-dark', 'github-light']
   */
  themes: readonly BundledTheme[];

  /**
   * The engine to use for syntax highlighting.
   * @default 'oniguruma'
   */
  engine: 'oniguruma' | 'javascript' | 'javascript-raw';

  /**
   * Use precompiled grammars.
   * Only available when `engine` is set to `javascript` or `javascript-raw`.
   * @default false
   */
  precompiled?: boolean;
}

/**
 * Create a fine grained bundle based on simple string identifiers of languages, themes, and engines.
 * This is a runtime adaptation of shiki-codegen's approach.
 */
export async function createFineGrainedBundle({
  langs,
  themes,
  engine = 'oniguruma',
  precompiled = false,
}: CodegenBundleOptions) {
  if (
    precompiled &&
    engine !== 'javascript' &&
    engine !== 'javascript-raw'
  ) {
    throw new Error(
      'Precompiled grammars are only available when using the JavaScript engine'
    );
  }

  const langImports = langs.map(async (lang) => {
    const info = bundledLanguagesInfo.find(
      (i) => i.id === lang || i.aliases?.includes(lang as string)
    );
    if (!info) {
      throw new Error(`Language ${lang} not found`);
    }

    const module = await import(
      `@shikijs/${precompiled ? 'langs-precompiled' : 'langs'}/${info.id}`
    );
    return { id: lang, module: module.default || module };
  });

  const themeImports = themes.map(async (theme) => {
    const info = bundledThemesInfo.find((i) => i.id === theme);
    if (!info) {
      throw new Error(`Theme ${theme} not found`);
    }

    const module = await import(`@shikijs/themes/${info.id}`);
    return { id: theme, module: module.default || module };
  });

  const resolvedLangs = await Promise.all(langImports);
  const resolvedThemes = await Promise.all(themeImports);

  let engineInstance: RegexEngine;
  switch (engine) {
    case 'javascript':
      engineInstance = createJavaScriptRegexEngine();
      break;
    case 'javascript-raw':
      engineInstance = createJavaScriptRawEngine();
      break;
    case 'oniguruma':
      engineInstance = await createOnigurumaEngine(import('shiki/wasm'));
      break;
  }

  const createHighlighter = createdBundledHighlighter({
    langs: Object.fromEntries(
      resolvedLangs.map(({ id, module }) => [
        id,
        () => Promise.resolve(module),
      ])
    ),
    themes: Object.fromEntries(
      resolvedThemes.map(({ id, module }) => [
        id,
        () => Promise.resolve(module),
      ])
    ),
    engine: () => engineInstance,
  });

  const shorthands = createSingletonShorthands(createHighlighter);

  return {
    bundledLanguages: Object.fromEntries(
      resolvedLangs.map(({ id, module }) => [id, module])
    ),
    bundledThemes: Object.fromEntries(
      resolvedThemes.map(({ id, module }) => [id, module])
    ),
    // createHighlighter,
    // codeToHtml: shorthands.codeToHtml,
    codeToHast: shorthands.codeToHast,
    // codeToTokens: shorthands.codeToTokens,
    // codeToTokensBase: shorthands.codeToTokensBase,
    // codeToTokensWithThemes: shorthands.codeToTokensWithThemes,
    // getSingletonHighlighter: shorthands.getSingletonHighlighter,
    // getLastGrammarState: shorthands.getLastGrammarState,
  };
}

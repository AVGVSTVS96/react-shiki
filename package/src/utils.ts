import { visit } from 'unist-util-visit';
import { bundledLanguages, isSpecialLang } from 'shiki';

import type { ShikiTransformer, ThemeRegistrationAny } from 'shiki';
import type { LanguageRegistration } from './extended-types';
import type {
  Language,
  Theme,
  Themes,
  TimeoutState,
  Element,
} from './types';

/**
 * Rehype plugin to add an 'inline' property to <code> elements
 * Sets 'inline' property to true if the <code> is not within a <pre> tag
 *
 * Pass this plugin to the `rehypePlugins` prop of react-markdown
 * You can then access `inline` as a prop in components passed to react-markdown
 *
 * @example
 * <ReactMarkdown rehypePlugins={[rehypeInlineCodeProperty]} />
 */
export function rehypeInlineCodeProperty() {
  return (tree: any): undefined => {
    visit(tree, 'element', (node: Element, _index, parent: Element) => {
      if (node.tagName === 'code' && parent.tagName !== 'pre') {
        node.properties.inline = true;
      }
    });
  };
}

/**
 * Function to determine if code is inline based on the presence of line breaks
 *
 * @example
 * const isInline = node && isInlineCode(node: Element)
 */
export const isInlineCode = (node: Element): boolean => {
  const textContent = (node.children || [])
    .filter((child) => child.type === 'text')
    .map((child) => child.value)
    .join('');

  return !textContent.includes('\n');
};

/**
 * Shiki transformer to remove tabindex from <pre> elements
 *
 * Consider retaining tabindex for WCAG 3.1 compliance, scrollable code blocks should be focusable
 *   https://github.com/shikijs/shiki/issues/428
 *   https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/proposed/
 */
export const removeTabIndexFromPre: ShikiTransformer = {
  pre(node) {
    if ('properties' in node) {
      node.properties.tabindex = '-1';
    }
    return node;
  },
};

/**
 * Optionally throttles rapid sequential highlighting operations
 * Exported for testing in __tests__/throttleHighlighting.test.ts
 *
 * @example
 * const timeoutControl = useRef<TimeoutState>({
 *   nextAllowedTime: 0,
 *   timeoutId: undefined
 * });
 *
 * throttleHighlighting(highlightCode, timeoutControl, 1000);
 */
export const throttleHighlighting = (
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

/**
 * Resolved language information
 */
type LanguageResult = {
  languageId: string;
  resolvedLanguage?: LanguageRegistration;
  displayLanguageId: string | null;
};

/**
 * Resolves the language input to standardized IDs and objects for Shiki and UI display
 * @param lang The language input from props (string, object, or null/undefined)
 * @param customLanguages An array of custom textmate grammar objects
 * @returns A LanguageResult object containing:
 *   - languageId: The resolved language ID
 *   - displayLanguageId: The resolved language ID
 *   - resolvedLanguage: The resolved language object
 */
export const resolveLanguage = (
  lang: Language,
  customLanguages: LanguageRegistration[] = []
): LanguageResult => {
  const knownBundledLanguageIds = new Set(
    Object.keys(bundledLanguages).map((id) => id.toLowerCase())
  );
  if (lang == null || (typeof lang === 'string' && !lang.trim())) {
    return {
      languageId: 'plaintext',
      displayLanguageId: 'plaintext',
      resolvedLanguage: undefined,
    };
  }

  // Language is custom
  if (typeof lang === 'object') {
    return {
      languageId: lang.name,
      displayLanguageId: lang.name || null,
      resolvedLanguage: lang,
    };
  }

  // Language is string
  const matches = (str: string | undefined): boolean =>
    str?.toLowerCase() === lang.toLowerCase();

  // Check if the string identifies a provided custom language
  const customMatch = customLanguages.find(
    (cl) =>
      matches(cl.name) ||
      cl.aliases?.some(matches) ||
      matches(cl.scopeName) ||
      matches(cl.scopeName?.split('.').pop())
  );

  if (customMatch) {
    return {
      languageId: customMatch.name || lang,
      displayLanguageId: lang,
      resolvedLanguage: customMatch,
    };
  }

  // Language is Built-in/Special
  if (
    (knownBundledLanguageIds.has(lang.toLowerCase()) ||
      isSpecialLang(lang)) &&
    !customMatch
  ) {
    return {
      languageId: lang,
      displayLanguageId: lang,
      resolvedLanguage: undefined,
    };
  }

  // Language is not supported
  return {
    languageId: 'plaintext',
    displayLanguageId: lang,
    resolvedLanguage: undefined,
  };
};

/**
 * Determines theme configuration and returns the resolved theme with metadata
 * @param themeInput - The theme input, either as a string name or theme object
 * @returns Object containing:
 *   - isMultiTheme: If theme input is a multi-theme configuration
 *   - themeId: Theme reference identifier
 *   - multiTheme: The multi-theme config if it exists
 *   - singleTheme: The single theme if it exists
 *   - themesToLoad: The themes to load when creating the highlighter
 */
export function resolveTheme(themeInput: Theme | Themes): {
  isMultiTheme: boolean;
  themeId: Theme;
  multiTheme?: Themes | ThemeRegistrationAny | null;
  singleTheme?: Theme | undefined;
  themesToLoad: Theme[];
} {
  const isTextmateTheme =
    typeof themeInput === 'object' &&
    'tokenColors' in themeInput &&
    Array.isArray(themeInput.tokenColors);

  // Assume non textmate objects are multi theme configs
  const isMultiThemeConfig =
    typeof themeInput === 'object' &&
    themeInput !== null &&
    !isTextmateTheme;

  const validMultiThemeObj =
    typeof themeInput === 'object' &&
    themeInput !== null &&
    !isTextmateTheme &&
    Object.entries(themeInput).some(
      ([key, value]) =>
        key &&
        value &&
        key.trim() !== '' &&
        value !== '' &&
        (typeof value === 'string' || isTextmateTheme)
    );

  if (isMultiThemeConfig) {
    const themeId = validMultiThemeObj
      ? `multi-${Object.values(themeInput)
          .map(
            (theme) =>
              (typeof theme === 'string' ? theme : theme?.name) ||
              'custom'
          )
          .sort()
          .join('-')}`
      : 'multi-default';

    // If config is invalid, return null to handle fallback in `buildShikiOptions()`
    return {
      isMultiTheme: true,
      themeId,
      multiTheme: validMultiThemeObj ? themeInput : null,
      themesToLoad: validMultiThemeObj ? Object.values(themeInput) : [],
    };
  }

  return {
    isMultiTheme: false,
    themeId:
      typeof themeInput === 'string'
        ? themeInput
        : themeInput?.name || 'custom',
    singleTheme: themeInput,
    themesToLoad: [themeInput],
  };
}

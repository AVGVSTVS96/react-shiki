import { visit } from 'unist-util-visit';
import { bundledLanguages, isSpecialLang } from 'shiki';
import type { ShikiTransformer } from 'shiki';
import type { Element, Root } from 'hast';
import type { Language, TimeoutState } from './types';
import type { LanguageRegistration } from './customTypes';

/**
 * Type for the HAST node, use to type `node` from react-markdown
 */
export type { Element };

/**
 * Rehype plugin to add an 'inline' property to <code> elements.
 * Sets 'inline' property to true if the <code> is not within a <pre> tag.
 *
 * Pass this plugin to the `rehypePlugins` prop of ReactMarkdown.
 * You can then access `inline` as a prop from ReactMarkdown.
 *
 * @example
 * <ReactMarkdown rehypePlugins={[rehypeInlineCodeProperty]} />
 */
export function rehypeInlineCodeProperty() {
  return function (tree: Root): undefined {
    visit(
      tree as any,
      'element',
      function (node: Element, _index, parent: Element) {
        if (node.tagName === 'code' && parent.tagName !== 'pre') {
          node.properties.inline = true;
        }
      }
    );
  };
}

/**
 * Function to determine if code is inline based on the presence of line breaks.
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
 * Shiki transformer to remove tabindex from <pre> elements.
 *
 * This will be removed in the future to comply with
 * WCAG 2.1 guidelines - .
 * Consider retaining tabindex for WCAG 2.1 compliance, scrollable code blocks should be focusable
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
 * Optionally throttles rapid sequential highlighting operations.
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

type ResolvedLanguage = {
  isCustom: boolean;
  languageId: string;
  resolvedLanguage?: LanguageRegistration;
};

/**
 * Determines whether a language is custom or built-in, normalizes
 * the language identifier and returns an object with metadata
 *
 * @param lang - The language identifier, either as a string name or language object
 * @param customLanguages - Optional array of custom language definitions
 * @returns Object containing:
 *   - isCustom: Whether the language requires custom highlighting
 *   - languageId: The normalized language identifier
 *   - displayLanguageId: The display name for language label
 *   - resolvedLanguage: The full language definition if custom
 */
export const resolveLanguage = (
  lang: Language,
  customLanguages: LanguageRegistration[] = []
): ResolvedLanguage => {
  // Language is custom but not preloaded
  if (lang && typeof lang === 'object') {
    return {
      isCustom: true,
      languageId: lang.name,
      resolvedLanguage: lang,
    };
  }

  // Language is string and
  if (typeof lang === 'string') {
    // is built-in
    if (lang in bundledLanguages || isSpecialLang(lang)) {
      return { isCustom: false, languageId: lang };
    }

    // matches a preloaded custom language
    const customMatch = customLanguages.find(
      (cl) =>
        cl.fileTypes?.includes(lang) ||
        cl.scopeName?.split('.')[1] === lang ||
        cl.name?.toLowerCase() === lang.toLowerCase()
    );

    if (customMatch) {
      return {
        isCustom: true,
        languageId: customMatch.name,
        resolvedLanguage: customMatch,
      };
    }
  }

  // Fallback to plaintext if no matches
  return { isCustom: false, languageId: 'plaintext' };
};

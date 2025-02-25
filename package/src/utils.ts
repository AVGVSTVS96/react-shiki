import { visit } from 'unist-util-visit';
import { bundledLanguages, isSpecialLang, } from 'shiki';
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
 * Sets an 'inline' property to true if the <code> is not within a <pre> tag.
 *
 * Pass this plugin to the `rehypePlugins` prop of ReactMarkdown.
 * You can then access `inline` as a prop from ReactMarkdown.
 *
 * @example
 * <ReactMarkdown rehypePlugins={[rehypeInlineCodeProperty]} />
 */
export function rehypeInlineCodeProperty() {
  return function (tree: Root): undefined {
    visit(tree as any, 'element', function (node: Element, _index, parent: Element) {
      if (node.tagName === 'code' && parent.tagName !== 'pre') {
        node.properties.inline = true;
      }
    });
  }
}


/**
 * Function to determine if code is inline based on the presence of line breaks.
 * Reports `inline = true` for single line fenced code blocks.
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
  customLanguage?: LanguageRegistration;
  resolvedLanguage?: LanguageRegistration;
};

/**
 * Determines whether a language is custom or built-in, normalizing 
 * the language identifier and returning an object with pa
 * to represent the result.
 * 
 * @param lang - The language identifier, either as a string name or language object
 * @param customLanguages - Optional array of custom language definitions
 * @returns Object containing:
 *   - isCustom: Whether the language requires custom highlighting
 *   - languageId: The normalized language identifier
 *   - displayLanguageId: The display name for language label
 *   - customLanguage: The full language definition if custom
 */
export const resolveLanguage = (
  lang: Language,
  customLanguages: LanguageRegistration[] = []
): ResolvedLanguage => {
  // Languaghe is custom but not preloaded
  if (lang && typeof lang === 'object') {
    return {
      isCustom: true,
      languageId: lang.name,
      customLanguage: lang
    };
  }

  // Language is string and is built-in or matches preloaded custom languages
  if (typeof lang === 'string') {
    if (lang in bundledLanguages || isSpecialLang(lang)) {
      return { isCustom: false, languageId: lang };
    }

    const customMatch = customLanguages.find(cl =>
      (cl.fileTypes?.includes(lang)) ||
      (cl.scopeName?.split('.')[1] === lang) ||
      (cl.name?.toLowerCase() === lang.toLowerCase())
    );

    if (customMatch) {
      return {
        isCustom: true,
        languageId: customMatch.name,
        customLanguage: customMatch
      };
    }

  }

  // Fallback to plaintext
  return { isCustom: false, languageId: 'plaintext' };
};


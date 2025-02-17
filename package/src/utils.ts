import { visit } from 'unist-util-visit';
import { bundledLanguages, isSpecialLang, } from 'shiki';
import type { BundledLanguage, ShikiTransformer } from 'shiki';
import type { Element, Root } from 'hast';
import type { Language, TimeoutState } from './types';

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

/**
 * Resolve the requested language to a bundled language.
 * If the language is not special or not included in Shiki’s bundledLanguages,
 * fall back to "plaintext".
 *
 * @returns {BundledLanguage} The resolved language.
 */
export const resolvedLang = (lang: Language): BundledLanguage => {
  if (typeof lang === 'string') {
    if (!(lang in bundledLanguages) && !isSpecialLang(lang)) {
      return 'plaintext' as BundledLanguage;
    }
    return lang as BundledLanguage;
  }
  return lang as Language as BundledLanguage;
};

export type { Element };

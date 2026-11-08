import { visit } from 'unist-util-visit';
import type { Root } from 'hast';
import type { Element } from './types';

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
  return (tree: Root): undefined => {
    visit(tree, 'element', (node: Element, _index, parent) => {
      if (
        node.tagName === 'code' &&
        parent?.type === 'element' &&
        parent.tagName !== 'pre'
      ) {
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

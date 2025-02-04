import type { ShikiTransformer } from 'shiki';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

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

export type { Element };

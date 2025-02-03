import type { ShikiTransformer } from 'shiki';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * This augmentation ensures that hast.RootData includes the same
 * index signature as unist.Data, preventing type incompatibilities
 * when we pass a hast.Root to unist-util-visit (which expects Node<Data>).
 */
declare module 'hast' {
  interface RootData {
    [key: string]: unknown;
  }
}


/**
 * Rehype plugin to add an 'inline' property to <code> elements.
 * Sets an 'inline' property to true if the <code> is not within a <pre> tag.
 *
 * Pass this plugin to the `rehypePlugins` prop of ReactMarkdown.
 * You can then access `inline` as a prop from ReactMarkdown.
 *
 * @example
 * import ReactMarkdown from 'react-markdown';
 * import { rehypeInlineCodeProperty } from 'react-shiki';
 * <ReactMarkdown rehypePlugins={[rehypeInlineCodeProperty]} />
 */
export function rehypeInlineCodeProperty() {
  return function (tree: Root): undefined {
    visit(tree as any, 'element', function (node: Element, _index, parent: Element) {
      if (parent && parent.tagName === 'pre') {
        node.properties.inline = false;
      } else {
        node.properties.inline = true;
      }
    });
  }
}


/**
 * Less accurate way to determine if code is inline.
 * Reports `inline = false` for multiline inline code blocks.
 */
export const isInlineCode = (node: Element): boolean => {
  return node.position?.start.line === node.position?.end.line;
};



export const removeTabIndexFromPre: ShikiTransformer = {
  pre(node) {
    if ('properties' in node) {
      node.properties.tabindex = '-1';
    }
    return node;
  },
};

export type { Element };

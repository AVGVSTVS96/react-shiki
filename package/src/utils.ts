import type { Element } from 'hast';
import type { ShikiTransformer } from 'shiki';

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

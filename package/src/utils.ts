import type { Element } from 'hast';

export const isInlineCode = (node: Element): boolean => {
  return node.position?.start.line === node.position?.end.line;
};


export const removeTabIndexFromPre = {
  pre(node: Element) {
    node.properties.tabindex = '-1';
  },
};

export type { Element };

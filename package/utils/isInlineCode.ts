import type { Element } from 'hast';

export const isInlineCode = (node: Element): boolean => {
  return node.position?.start.line === node.position?.end.line;
};

import type { ShikiTransformer } from 'shiki/core';

/**
 * Creates a transformer that enables line numbers display
 * @param startLine - The starting line number (defaults to 1)
 */
export function lineNumbersTransformer(startLine = 1): ShikiTransformer {
  return {
    name: 'react-shiki:line-numbers',
    code(node) {
      this.addClassToHast(node, 'has-line-numbers');
      if (startLine !== 1) {
        const existingStyle = (node.properties?.style as string) || '';
        const newStyle = existingStyle
          ? `${existingStyle}; --line-start: ${startLine}`
          : `--line-start: ${startLine}`;
        node.properties = {
          ...node.properties,
          style: newStyle,
        };
      }
    },
    line(node) {
      this.addClassToHast(node, 'line-numbers');
      return node;
    },
  };
}

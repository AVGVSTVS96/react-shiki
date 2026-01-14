import type { ShikiTransformer } from 'shiki/core';

// Re-export Shiki's transformer directly
export { transformerNotationHighlight } from '@shikijs/transformers';

/**
 * Creates a transformer that highlights specified lines.
 * Uses Shiki's default classes: `highlighted` on lines, `has-highlighted` on container.
 *
 * @param highlightLines - Array of line numbers to highlight (1-indexed)
 * @param startLine - The starting line number for offset calculation (defaults to 1)
 */
export function lineHighlightTransformer(
  highlightLines: number[],
  startLine = 1
): ShikiTransformer {
  const highlightSet = new Set(highlightLines);
  let currentLine = startLine;

  return {
    name: 'react-shiki:line-highlight',
    pre(node) {
      this.addClassToHast(node, 'has-highlighted');
    },
    line(node) {
      if (highlightSet.has(currentLine)) {
        this.addClassToHast(node, 'highlighted');
      }
      currentLine++;
      return node;
    },
  };
}

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

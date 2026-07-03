import type { ShikiTransformer } from 'shiki/core';

const toLineNumberSet = (lineNumbers: readonly number[]) =>
  new Set(lineNumbers.filter(Number.isInteger));

/**
 * Creates a transformer that enables line numbers display
 * @param startLine - The starting line number (defaults to 1)
 */
export function lineNumbersTransformer(startLine = 1): ShikiTransformer {
  return {
    name: 'react-shiki:line-numbers',
    code(node) {
      this.addClassToHast(node, 'rs-has-line-numbers');
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
      this.addClassToHast(node, 'rs-line-number');
      return node;
    },
  };
}

/**
 * Creates a transformer that marks selected displayed line numbers.
 * @param lineNumbers - Displayed line numbers to highlight
 * @param startLine - The starting line number (defaults to 1)
 */
export function highlightedLinesTransformer(
  lineNumbers: readonly number[],
  startLine = 1
): ShikiTransformer {
  const highlightedLines = toLineNumberSet(lineNumbers);

  return {
    name: 'react-shiki:highlight-lines',
    line(node, line) {
      const displayedLine = startLine + line - 1;

      if (highlightedLines.has(displayedLine)) {
        this.addClassToHast(node, 'rs-highlighted-line');
      }

      return node;
    },
  };
}

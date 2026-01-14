import type { ShikiTransformer } from 'shiki/core';
import { transformerNotationHighlight as shikiTransformerNotationHighlight } from '@shikijs/transformers';

/**
 * Transformer for notation-based line highlighting using `// [!code highlight]` comments.
 * Pre-configured to use react-shiki's CSS classes and variables.
 *
 * @example
 * ```tsx
 * const code = `const x = 1; // [!code highlight]`;
 *
 * <ShikiHighlighter transformers={[transformerNotationHighlight()]}>
 *   {code}
 * </ShikiHighlighter>
 * ```
 */
export function transformerNotationHighlight(): ShikiTransformer {
  return shikiTransformerNotationHighlight({
    classActiveLine: 'highlighted-line',
    classActivePre: 'has-line-highlights',
  });
}

/**
 * Creates a transformer that highlights specified lines.
 * Adds the `highlighted-line` class to lines that should be highlighted,
 * and `has-line-highlights` class to the code block container.
 *
 * The highlighted lines can be styled using CSS variables:
 * - `--line-highlight-background`: Background color for highlighted lines
 * - `--line-highlight-border-color`: Left border color
 * - `--line-highlight-border-width`: Left border width
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
    code(node) {
      this.addClassToHast(node, 'has-line-highlights');
    },
    line(node) {
      if (highlightSet.has(currentLine)) {
        this.addClassToHast(node, 'highlighted-line');
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

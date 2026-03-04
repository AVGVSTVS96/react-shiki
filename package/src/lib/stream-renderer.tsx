import { useMemo, type CSSProperties } from 'react';
import type { ThemedToken } from 'shiki';

/**
 * Props for the ShikiTokenRenderer component.
 */
export interface ShikiTokenRendererProps {
  /**
   * Flat array of themed tokens to render.
   */
  tokens: ThemedToken[];

  /**
   * Whether to show line numbers.
   * @default false
   */
  showLineNumbers?: boolean;

  /**
   * Starting line number when showLineNumbers is true.
   * @default 1
   */
  startingLineNumber?: number;

  /**
   * Additional className for the <code> element.
   */
  className?: string;

  /**
   * Additional style for the <code> element.
   */
  style?: CSSProperties;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const FONT_ITALIC = 1;
const FONT_BOLD = 2;
const FONT_UNDERLINE = 4;

/**
 * Build a React style object from a themed token.
 * Handles both single-theme (token.color) and multi-theme (token.htmlStyle) tokens.
 */
function getTokenStyle(token: ThemedToken): CSSProperties | undefined {
  // htmlStyle is Record<string, string> (e.g. { color: '#fff', '--shiki-dark': '#000' })
  // When present, it overrides color and fontStyle per shiki convention
  if (token.htmlStyle) {
    const style: Record<string, string> = {};
    for (const [key, value] of Object.entries(token.htmlStyle)) {
      if (key.startsWith('--')) {
        // CSS custom properties pass through as-is
        style[key] = value;
      } else {
        // Convert kebab-case to camelCase for React
        const reactKey = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        style[reactKey] = value;
      }
    }
    return style as CSSProperties;
  }

  const style: Record<string, string> = {};
  let hasStyle = false;

  if (token.color) {
    style.color = token.color;
    hasStyle = true;
  }

  const fs = token.fontStyle as number | undefined;
  if (fs) {
    if (fs & FONT_ITALIC) {
      style.fontStyle = 'italic';
      hasStyle = true;
    }
    if (fs & FONT_BOLD) {
      style.fontWeight = 'bold';
      hasStyle = true;
    }
    if (fs & FONT_UNDERLINE) {
      style.textDecoration = 'underline';
      hasStyle = true;
    }
  }

  return hasStyle ? (style as CSSProperties) : undefined;
}

/**
 * Split a flat token array into lines by newline characters within token content.
 */
function splitIntoLines(tokens: ThemedToken[]): ThemedToken[][] {
  if (tokens.length === 0) return [[]];

  const lines: ThemedToken[][] = [[]];

  for (const token of tokens) {
    const parts = token.content.split('\n');

    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        lines.push([]);
      }

      const part = parts[i];
      if (part !== '' && part != null) {
        lines[lines.length - 1]!.push({
          ...token,
          content: part,
        });
      }
    }
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders themed tokens as React elements.
 *
 * Produces the same DOM structure as shiki's codeToHast output so that
 * existing CSS styles (line numbers, etc.) apply without modification.
 *
 * Structure:
 * ```html
 * <code class="[className] [has-line-numbers?]">
 *   <span class="line [line-numbers?]">
 *     <span style="color: ...">token</span>
 *   </span>
 * </code>
 * ```
 */
export function ShikiTokenRenderer({
  tokens,
  showLineNumbers = false,
  startingLineNumber = 1,
  className,
  style,
}: ShikiTokenRendererProps) {
  const lines = useMemo(() => splitIntoLines(tokens), [tokens]);

  const codeClassName = [
    className,
    showLineNumbers && 'has-line-numbers',
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const codeStyle: CSSProperties | undefined =
    showLineNumbers && startingLineNumber !== 1
      ? ({ ...style, '--line-start': startingLineNumber } as CSSProperties)
      : style;

  return (
    <code className={codeClassName} style={codeStyle}>
      {lines.map((line, lineIdx) => (
        <span
          key={lineIdx}
          className={showLineNumbers ? 'line line-numbers' : 'line'}
        >
          {line.map((token, tokenIdx) => (
            <span key={tokenIdx} style={getTokenStyle(token)}>
              {token.content}
            </span>
          ))}
          {'\n'}
        </span>
      ))}
    </code>
  );
}

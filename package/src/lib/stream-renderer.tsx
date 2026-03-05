import type { CSSProperties } from 'react';
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
function getTokenStyleObject(
  token: ThemedToken
): CSSProperties | undefined {
  if (token.htmlStyle) {
    const style: Record<string, string> = {};
    for (const [key, value] of Object.entries(token.htmlStyle)) {
      if (key.startsWith('--')) {
        style[key] = value;
      } else {
        const reactKey = key.replace(/-([a-z])/g, (_, c: string) =>
          c.toUpperCase()
        );
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

export function ShikiTokenRenderer({
  tokens,
  className,
  style,
}: ShikiTokenRendererProps) {
  const seenKeys = new Map<string, number>();

  return (
    <code className={className} style={style}>
      {tokens.map((token) => {
        const baseKey = `${token.offset}:${token.content}:${token.color ?? ''}:${token.fontStyle ?? ''}`;
        const seenCount = seenKeys.get(baseKey) ?? 0;
        seenKeys.set(baseKey, seenCount + 1);

        return (
          <span
            key={`${baseKey}:${seenCount}`}
            style={getTokenStyleObject(token)}
          >
            {token.content}
          </span>
        );
      })}
    </code>
  );
}

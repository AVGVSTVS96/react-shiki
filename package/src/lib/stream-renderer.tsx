import { memo, useRef, type CSSProperties, type ReactNode } from 'react';
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

const getTokenKey = (token: ThemedToken, index: number): string =>
  `${token.offset}:${index}`;

const buildTokenNode = (token: ThemedToken, index: number): ReactNode => (
  <span
    key={getTokenKey(token, index)}
    style={getTokenStyleObject(token)}
  >
    {token.content}
  </span>
);

const ShikiTokenRendererImpl = ({
  tokens,
  className,
  style,
}: ShikiTokenRendererProps) => {
  const previousTokensRef = useRef<ThemedToken[] | null>(null);
  const previousNodesRef = useRef<ReactNode[]>([]);

  const previousTokens = previousTokensRef.current;
  let renderedNodes = previousNodesRef.current;

  if (tokens !== previousTokens) {
    let stablePrefixLength = 0;
    if (previousTokens) {
      const max = Math.min(previousTokens.length, tokens.length);
      while (
        stablePrefixLength < max &&
        previousTokens[stablePrefixLength] === tokens[stablePrefixLength]
      ) {
        stablePrefixLength += 1;
      }
    }

    renderedNodes = renderedNodes.slice(0, stablePrefixLength);
    for (
      let index = stablePrefixLength;
      index < tokens.length;
      index += 1
    ) {
      const token = tokens[index];
      if (token) {
        renderedNodes.push(buildTokenNode(token, index));
      }
    }

    previousTokensRef.current = tokens;
    previousNodesRef.current = renderedNodes;
  }

  return (
    <code className={className} style={style}>
      {renderedNodes}
    </code>
  );
};

const areTokenRendererPropsEqual = (
  prev: ShikiTokenRendererProps,
  next: ShikiTokenRendererProps
): boolean =>
  prev.tokens === next.tokens &&
  prev.className === next.className &&
  prev.style === next.style;

export const ShikiTokenRenderer = memo(
  ShikiTokenRendererImpl,
  areTokenRendererPropsEqual
);

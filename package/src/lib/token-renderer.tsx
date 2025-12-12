import { memo, useDeferredValue, useMemo } from 'react';
import type { TokensResult, ThemedToken } from 'shiki';

export interface TokenRendererProps {
  /**
   * The TokensResult from useShikiHighlighter with outputFormat: 'tokens'
   */
  tokens: TokensResult;

  /**
   * Optional className for the pre element
   */
  className?: string;

  /**
   * Optional inline styles for the pre element.
   * If not provided, uses tokens.rootStyle (fg/bg from theme)
   */
  style?: React.CSSProperties;
}

/**
 * Renders a single token as a span with inline color.
 * For multi-theme, uses htmlStyle which contains CSS variables.
 */
const Token = memo(function Token({ token }: { token: ThemedToken }) {
  // Prefer htmlStyle (multi-theme with CSS variables) over color (single-theme)
  const style =
    token.htmlStyle ?? (token.color ? { color: token.color } : undefined);
  return <span style={style}>{token.content}</span>;
});

/**
 * Renders a line of tokens.
 */
const Line = memo(function Line({
  tokens,
  isLast,
}: {
  tokens: ThemedToken[];
  isLast: boolean;
}) {
  return (
    <span className="line">
      {tokens.map((token, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional, never reorder
        <Token key={i} token={token} />
      ))}
      {!isLast && '\n'}
    </span>
  );
});

/**
 * Memoized token renderer with concurrent rendering support.
 *
 * Uses useDeferredValue to prevent blocking the main thread during
 * rapid updates (like streaming). This allows React to interrupt
 * rendering and keep the UI responsive.
 *
 * The component uses contentVisibility: 'auto' to skip rendering
 * of off-screen content, improving performance for long code blocks.
 *
 * @example
 * ```tsx
 * const tokens = useShikiHighlighter(code, 'ts', 'nord', {
 *   outputFormat: 'tokens'
 * });
 *
 * return <TokenRenderer tokens={tokens} />;
 * ```
 */
/**
 * Parses Shiki's fg/bg strings which may contain CSS variables for multi-theme.
 * Format: "defaultValue;--css-var:value;--another-var:value"
 * Example: "#24292e;--shiki-dark:#e1e4e8"
 */
const parseThemeColor = (
  colorString: string | undefined,
  cssProperty: 'color' | 'backgroundColor'
): Record<string, string> => {
  if (!colorString) return {};

  const result: Record<string, string> = {};
  const parts = colorString.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('--')) {
      // CSS variable: "--shiki-dark:#e1e4e8" or "--shiki-dark-bg:#24292e"
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const varName = trimmed.slice(0, colonIndex);
        const varValue = trimmed.slice(colonIndex + 1);
        result[varName] = varValue;
      }
    } else {
      // Default color value: "#24292e"
      result[cssProperty] = trimmed;
    }
  }

  return result;
};

export const TokenRenderer = memo(function TokenRenderer({
  tokens,
  className,
  style,
}: TokenRendererProps) {
  // Defer token updates to prevent blocking during streaming
  const deferredTokens = useDeferredValue(tokens);

  // Parse fg/bg into CSSProperties, handling multi-theme CSS variables
  const baseStyle = useMemo((): React.CSSProperties => {
    const parsed: Record<string, string> = {
      // Enable content-visibility for off-screen optimization
      contentVisibility: 'auto',
    };

    // Parse fg (e.g., "#24292e;--shiki-dark:#e1e4e8")
    Object.assign(parsed, parseThemeColor(deferredTokens.fg, 'color'));

    // Parse bg (e.g., "#fff;--shiki-dark-bg:#24292e")
    Object.assign(
      parsed,
      parseThemeColor(deferredTokens.bg, 'backgroundColor')
    );

    // Also parse rootStyle for single-theme fallback
    if (deferredTokens.rootStyle) {
      const parts = deferredTokens.rootStyle.split(';');
      for (const part of parts) {
        const [key, value] = part.split(':');
        if (key && value) {
          const camelKey = key
            .trim()
            .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          parsed[camelKey] = value.trim();
        }
      }
    }

    return parsed as React.CSSProperties;
  }, [deferredTokens.fg, deferredTokens.bg, deferredTokens.rootStyle]);

  const mergedStyle = style ? { ...baseStyle, ...style } : baseStyle;
  const preClass = className ? `shiki ${className}` : 'shiki';

  return (
    <pre className={preClass} style={mergedStyle}>
      <code>
        {deferredTokens.tokens.map((lineTokens, i) => (
          <Line
            // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional, never reorder
            key={i}
            tokens={lineTokens}
            isLast={i === deferredTokens.tokens.length - 1}
          />
        ))}
      </code>
    </pre>
  );
});

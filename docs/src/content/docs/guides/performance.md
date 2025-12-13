---
title: Performance
description: Optimize react-shiki for maximum performance in your application.
---

react-shiki is designed for performance. This guide covers techniques to optimize highlighting in your application.

## Throttling Real-time Highlighting

When highlighting frequently changing code (like in editors or streaming scenarios), use the `delay` option to throttle updates:

```tsx
// Component
<ShikiHighlighter language="typescript" theme="github-dark" delay={150}>
  {code}
</ShikiHighlighter>

// Hook
const highlighted = useShikiHighlighter(code, "typescript", "github-dark", {
  delay: 150,
});
```

The highlighter will wait 150ms after the last change before re-highlighting, preventing excessive processing during rapid input.

## Output Format Optimization

react-shiki provides two output formats with different performance characteristics:

### React Nodes (Default)

The default output creates React elements without using `dangerouslySetInnerHTML`:

```tsx
// Hook
const highlighted = useShikiHighlighter(code, "typescript", "github-dark");

// Component (default behavior)
<ShikiHighlighter language="typescript" theme="github-dark">
  {code}
</ShikiHighlighter>
```

**Pros:**
- Safer (no raw HTML injection)
- Better for untrusted content
- Standard React rendering

### HTML String Output

For 15-45% faster performance, use HTML string output:

```tsx
// Hook (returns HTML string)
const highlightedHtml = useShikiHighlighter(code, "typescript", "github-dark", {
  outputFormat: 'html'
});

// Render with dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />

// Component (automatically uses dangerouslySetInnerHTML)
<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  outputFormat="html"
>
  {code}
</ShikiHighlighter>
```

**Pros:**
- 15-45% faster rendering
- Lower memory usage
- Better for large code blocks

**Cons:**
- Uses `dangerouslySetInnerHTML`
- Only use with trusted content

:::caution
Only use HTML output when you trust the code source. For user-submitted code, use the default React output.
:::

## Bundle Size Optimization

Choose the appropriate bundle for your needs:

| Bundle | Gzipped Size | Languages |
|--------|--------------|-----------|
| `react-shiki` | ~1.2MB | All |
| `react-shiki/web` | ~707KB | Web languages |
| `react-shiki/core` | ~12KB | Custom |

See [Bundle Options](/guides/bundle-options/) for details.

## Streaming and LLM Chat UI

For streaming code (like LLM responses), combine throttling with efficient rendering:

```tsx
function StreamingCode({ streamedCode }) {
  const highlighted = useShikiHighlighter(
    streamedCode,
    "typescript",
    "github-dark",
    {
      delay: 100,           // Throttle updates
      outputFormat: 'html', // Faster rendering
    }
  );

  return (
    <div
      className="code-block"
      dangerouslySetInnerHTML={{ __html: highlighted || '' }}
    />
  );
}
```

## Language Loading

Shiki dynamically imports language grammars on demand. For known languages, you can preload them:

```tsx
// With core bundle, preload at app initialization
const highlighter = await createHighlighterCore({
  themes: [import('@shikijs/themes/github-dark')],
  langs: [
    import('@shikijs/langs/typescript'),
    import('@shikijs/langs/javascript'),
    import('@shikijs/langs/json'),
  ],
  engine: createJavaScriptRegexEngine(),
});
```

## RegExp Engine Choice

The JavaScript engine is faster to initialize than Oniguruma (WASM):

```tsx
// Faster startup, smaller bundle
engine: createJavaScriptRegexEngine()

// Maximum compatibility, larger bundle
engine: createOnigurumaEngine(import('shiki/wasm'))
```

For client-side highlighting, the JavaScript engine is recommended.

## Memoization

If your code prop doesn't change often, memoize the component:

```tsx
const MemoizedHighlighter = React.memo(ShikiHighlighter);

function App() {
  return (
    <MemoizedHighlighter language="typescript" theme="github-dark">
      {code}
    </MemoizedHighlighter>
  );
}
```

## Best Practices Summary

1. **Use throttling** for real-time/streaming scenarios
2. **Choose HTML output** for trusted content and large code blocks
3. **Use the web bundle** for web applications
4. **Use the core bundle** for production with known languages
5. **Prefer JavaScript engine** for client-side highlighting
6. **Memoize components** when code doesn't change frequently

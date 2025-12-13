---
title: RegExp Engines
description: Reference for Shiki's RegExp engines and when to use each.
---

Shiki offers multiple RegExp engines for syntax highlighting. react-shiki re-exports these engines for use with both the full/web bundles and the core bundle.

## Available Engines

### Oniguruma (Default)

The default engine using compiled WebAssembly. Offers maximum language compatibility.

```tsx
import { createOnigurumaEngine } from 'react-shiki/core';

const engine = createOnigurumaEngine(import('shiki/wasm'));
```

| Property | Value |
|----------|-------|
| **Compatibility** | Maximum (all TextMate grammars) |
| **Bundle Size** | Larger (~1MB WASM) |
| **Startup Time** | Slower (WASM initialization) |
| **Use Case** | Server-side, complex grammars |

### JavaScript RegExp

A pure JavaScript engine with smaller bundle size and faster startup.

```tsx
import { createJavaScriptRegexEngine } from 'react-shiki';
// or
import { createJavaScriptRegexEngine } from 'react-shiki/core';

const engine = createJavaScriptRegexEngine();
```

| Property | Value |
|----------|-------|
| **Compatibility** | Most common languages |
| **Bundle Size** | Smaller |
| **Startup Time** | Faster |
| **Use Case** | Client-side highlighting |

### JavaScript Raw

For pre-compiled languages, skips the transpilation step for best performance.

```tsx
import { createJavaScriptRawEngine } from 'react-shiki';

const engine = createJavaScriptRawEngine();
```

| Property | Value |
|----------|-------|
| **Compatibility** | Pre-compiled languages only |
| **Bundle Size** | Smallest |
| **Startup Time** | Fastest |
| **Use Case** | Known pre-compiled languages |

See [Shiki's pre-compiled languages](https://shiki.style/guide/regex-engines#pre-compiled-languages) for the list of supported languages.

## Using Engines with Full/Web Bundles

The full and web bundles use Oniguruma by default. Override with the `engine` option:

```tsx
import ShikiHighlighter, {
  createJavaScriptRegexEngine,
  createJavaScriptRawEngine,
} from 'react-shiki';

// Component with JavaScript RegExp engine
<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  engine={createJavaScriptRegexEngine()}
>
  {code}
</ShikiHighlighter>

// Hook with JavaScript RegExp engine
const highlighted = useShikiHighlighter(code, "typescript", "github-dark", {
  engine: createJavaScriptRegexEngine(),
});
```

## Using Engines with Core Bundle

When using the core bundle, you must specify an engine:

```tsx
import {
  createHighlighterCore,
  createOnigurumaEngine,
  createJavaScriptRegexEngine,
} from 'react-shiki/core';

// With Oniguruma
const highlighter = await createHighlighterCore({
  themes: [import('@shikijs/themes/nord')],
  langs: [import('@shikijs/langs/typescript')],
  engine: createOnigurumaEngine(import('shiki/wasm')),
});

// With JavaScript RegExp
const highlighter = await createHighlighterCore({
  themes: [import('@shikijs/themes/nord')],
  langs: [import('@shikijs/langs/typescript')],
  engine: createJavaScriptRegexEngine(),
});
```

## Engine Options

### Forgiving Mode

The JavaScript RegExp engine is strict by default. For best-effort results with unsupported grammars:

```tsx
createJavaScriptRegexEngine({ forgiving: true });
```

This allows the engine to gracefully handle grammars that use unsupported Oniguruma features.

## Comparison

| Engine | Size Impact | Startup | Compatibility | Recommended For |
|--------|-------------|---------|---------------|-----------------|
| Oniguruma | +1MB WASM | Slower | Maximum | Server, exotic languages |
| JavaScript | Minimal | Fast | Most languages | Client-side |
| JavaScript Raw | Smallest | Fastest | Pre-compiled only | Known languages |

## Recommendations

1. **Client-side highlighting**: Use `createJavaScriptRegexEngine()`
2. **Server-side rendering**: Use `createOnigurumaEngine()` for maximum compatibility
3. **Known languages**: Consider `createJavaScriptRawEngine()` for best performance
4. **Exotic/complex grammars**: Use Oniguruma if JavaScript engine has issues

## Further Reading

- [Shiki RegExp Engines Documentation](https://shiki.style/guide/regex-engines)
- [Pre-compiled Languages](https://shiki.style/guide/regex-engines#pre-compiled-languages)

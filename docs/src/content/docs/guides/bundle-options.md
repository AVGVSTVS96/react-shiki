---
title: Bundle Options
description: Choose the right bundle size for your react-shiki integration.
---

react-shiki offers three entry points to balance convenience and bundle optimization, following the same pattern as Shiki itself.

## Full Bundle

```tsx
import ShikiHighlighter from 'react-shiki';
```

| Property | Value |
|----------|-------|
| **Size** | ~6.4MB minified, ~1.2MB gzipped |
| **Languages** | All Shiki languages and themes |
| **Engines** | `createJavaScriptRegexEngine`, `createJavaScriptRawEngine` |
| **Use case** | Unknown language requirements, maximum language support |
| **Setup** | Zero configuration required |

The full bundle is ideal when you don't know which languages will be highlighted at runtime, or when you need comprehensive language support.

## Web Bundle

```tsx
import ShikiHighlighter from 'react-shiki/web';
```

| Property | Value |
|----------|-------|
| **Size** | ~3.8MB minified, ~707KB gzipped |
| **Languages** | HTML, CSS, JS, TS, JSON, Markdown, Vue, JSX, TSX, Svelte |
| **Engines** | `createJavaScriptRegexEngine`, `createJavaScriptRawEngine` |
| **Use case** | Web applications with balanced size/functionality |
| **Setup** | Drop-in replacement for main entry point |

The web bundle includes the most commonly used web development languages while significantly reducing bundle size.

## Core Bundle

```tsx
import ShikiHighlighter, {
  createHighlighterCore,
  createOnigurumaEngine,
  createJavaScriptRegexEngine,
} from 'react-shiki/core';
```

| Property | Value |
|----------|-------|
| **Size** | ~12KB + your imported themes/languages |
| **Languages** | User-defined via custom highlighter |
| **Use case** | Production apps requiring maximum bundle control |
| **Setup** | Requires custom highlighter configuration |

### Setting Up a Custom Highlighter

With the core bundle, you create and configure the highlighter yourself:

```tsx
import ShikiHighlighter, {
  createHighlighterCore,
  createOnigurumaEngine,
  createJavaScriptRegexEngine,
} from 'react-shiki/core';

// Create highlighter with dynamic imports for optimal bundle size
const highlighter = await createHighlighterCore({
  themes: [
    import('@shikijs/themes/nord'),
    import('@shikijs/themes/github-dark'),
  ],
  langs: [
    import('@shikijs/langs/typescript'),
    import('@shikijs/langs/javascript'),
  ],
  engine: createOnigurumaEngine(import('shiki/wasm')),
  // or: engine: createJavaScriptRegexEngine()
});

// Use the custom highlighter
<ShikiHighlighter
  highlighter={highlighter}
  language="typescript"
  theme="nord"
>
  {code}
</ShikiHighlighter>
```

### Engine Options

When using the core bundle, you must specify an engine:

- **Oniguruma** (WASM) — Maximum language support, uses compiled WebAssembly
- **JavaScript RegExp** — Smaller bundle, faster startup, recommended for client-side

```tsx
// Oniguruma engine (maximum compatibility)
engine: createOnigurumaEngine(import('shiki/wasm'))

// JavaScript engine (smaller, faster startup)
engine: createJavaScriptRegexEngine()
```

See the [RegExp Engines](/reference/regexp-engines/) reference for more details.

## Comparison

| Bundle | Minified | Gzipped | Languages | Setup |
|--------|----------|---------|-----------|-------|
| `react-shiki` | ~6.4MB | ~1.2MB | All | None |
| `react-shiki/web` | ~3.8MB | ~707KB | Web languages | None |
| `react-shiki/core` | ~12KB | ~12KB | Custom | Required |

## Recommendations

- **Prototyping or internal tools**: Use the full bundle for convenience
- **Web applications**: Use the web bundle for a good balance
- **Production apps**: Consider the core bundle with only needed languages
- **Static sites**: Core bundle with build-time highlighting setup

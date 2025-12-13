---
title: Hook Options
description: Complete reference for useShikiHighlighter hook parameters and options.
---

The `useShikiHighlighter` hook provides flexible syntax highlighting with full control over rendering.

## Signature

```tsx
function useShikiHighlighter(
  code: string,
  language: string | LanguageInput,
  theme: string | ThemeInput | Record<string, string | ThemeInput>,
  options?: UseShikiHighlighterOptions
): React.ReactNode | string | null;
```

## Parameters

### `code`

**Type:** `string`

The code to highlight.

### `language`

**Type:** `string | LanguageInput`

The language for highlighting. Can be a built-in language identifier or a custom TextMate grammar object.

### `theme`

**Type:** `string | ThemeInput | Record<string, string | ThemeInput>`

Single theme, custom theme object, or multi-theme configuration.

```tsx
// Single theme
useShikiHighlighter(code, "typescript", "github-dark");

// Multi-theme
useShikiHighlighter(code, "typescript", {
  light: "github-light",
  dark: "github-dark",
});
```

### `options`

**Type:** `UseShikiHighlighterOptions`

Optional configuration object.

## Options Object

### `delay`

**Type:** `number`
**Default:** `0`

Delay in milliseconds between highlighting updates.

```tsx
const highlighted = useShikiHighlighter(code, "tsx", "github-dark", {
  delay: 150,
});
```

### `outputFormat`

**Type:** `'react' | 'html'`
**Default:** `'react'`

Output format. With `'html'`, returns an HTML string for use with `dangerouslySetInnerHTML`.

```tsx
// React nodes (default)
const reactNodes = useShikiHighlighter(code, "tsx", "github-dark");

// HTML string
const htmlString = useShikiHighlighter(code, "tsx", "github-dark", {
  outputFormat: 'html',
});
```

### `showLineNumbers`

**Type:** `boolean`
**Default:** `false`

Enable line numbers. Requires importing `'react-shiki/css'` or providing custom CSS.

```tsx
import 'react-shiki/css';

const highlighted = useShikiHighlighter(code, "tsx", "github-dark", {
  showLineNumbers: true,
});
```

### `startingLineNumber`

**Type:** `number`
**Default:** `1`

Starting line number when line numbers are enabled.

### `defaultColor`

**Type:** `string | false`
**Default:** `'light'`

Default theme mode for multi-theme configurations.

```tsx
const highlighted = useShikiHighlighter(
  code,
  "tsx",
  { light: "github-light", dark: "github-dark" },
  { defaultColor: "light-dark()" }
);
```

### `highlighter`

**Type:** `HighlighterCore`

Custom Shiki highlighter instance. Required with `react-shiki/core`.

```tsx
import { createHighlighterCore, createJavaScriptRegexEngine } from 'react-shiki/core';

const highlighter = await createHighlighterCore({
  themes: [import('@shikijs/themes/nord')],
  langs: [import('@shikijs/langs/typescript')],
  engine: createJavaScriptRegexEngine(),
});

const highlighted = useShikiHighlighter(code, "typescript", "nord", {
  highlighter,
});
```

### `engine`

**Type:** `RegexEngine`

RegExp engine for syntax highlighting.

```tsx
import { createJavaScriptRegexEngine } from 'react-shiki';

const highlighted = useShikiHighlighter(code, "tsx", "github-dark", {
  engine: createJavaScriptRegexEngine(),
});
```

### `transformers`

**Type:** `ShikiTransformer[]`
**Default:** `[]`

Array of Shiki transformers.

### `customLanguages`

**Type:** `LanguageInput[]`
**Default:** `[]`

Custom languages to preload.

### `langAlias`

**Type:** `Record<string, string>`
**Default:** `{}`

Language alias mappings.

### `cssVariablePrefix`

**Type:** `string`
**Default:** `'--shiki'`

CSS variable prefix for multi-theme.

### `decorations`

**Type:** `DecorationItem[]`
**Default:** `[]`

Custom decorations.

### `structure`

**Type:** `'classic' | 'inline'`
**Default:** `'classic'`

Output structure.

### `tabindex`

**Type:** `number`
**Default:** `0`

Tab index for the code block.

## Return Value

- **React elements** when `outputFormat` is `'react'` (default)
- **HTML string** when `outputFormat` is `'html'`
- **`null`** while loading

## Usage Examples

### Basic Usage

```tsx
function CodeBlock({ code }) {
  const highlighted = useShikiHighlighter(code, "typescript", "github-dark");

  return <div className="code-block">{highlighted}</div>;
}
```

### With Loading State

```tsx
function CodeBlock({ code }) {
  const highlighted = useShikiHighlighter(code, "typescript", "github-dark");

  if (highlighted === null) {
    return <div className="loading">Loading...</div>;
  }

  return <div className="code-block">{highlighted}</div>;
}
```

### HTML Output

```tsx
function CodeBlock({ code }) {
  const html = useShikiHighlighter(code, "typescript", "github-dark", {
    outputFormat: 'html',
  });

  return (
    <div
      className="code-block"
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );
}
```

### Full Options

```tsx
const highlighted = useShikiHighlighter(
  code,
  "typescript",
  { light: "github-light", dark: "github-dark" },
  {
    delay: 100,
    outputFormat: 'react',
    showLineNumbers: true,
    startingLineNumber: 1,
    defaultColor: 'light-dark()',
    engine: createJavaScriptRegexEngine(),
    transformers: [myTransformer],
    langAlias: { ts: 'typescript' },
  }
);
```

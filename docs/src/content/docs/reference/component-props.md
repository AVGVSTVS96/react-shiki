---
title: Component Props
description: Complete reference for ShikiHighlighter component props.
---

The `ShikiHighlighter` component accepts all common options plus component-specific styling props.

## Required Props

### `children`

**Type:** `string`

The code to highlight.

```tsx
<ShikiHighlighter language="typescript" theme="github-dark">
  {code}
</ShikiHighlighter>
```

### `language`

**Type:** `string | LanguageInput`

The language to use for highlighting. Can be a built-in language identifier or a custom TextMate grammar object.

```tsx
// Built-in language
<ShikiHighlighter language="typescript" theme="github-dark">
  {code}
</ShikiHighlighter>

// Custom language
<ShikiHighlighter language={customGrammar} theme="github-dark">
  {code}
</ShikiHighlighter>
```

## Theme Props

### `theme`

**Type:** `string | ThemeInput | Record<string, string | ThemeInput>`
**Default:** `'github-dark'`

Single theme name, custom theme object, or multi-theme configuration.

```tsx
// Single theme
<ShikiHighlighter language="tsx" theme="vitesse-dark">
  {code}
</ShikiHighlighter>

// Multi-theme
<ShikiHighlighter
  language="tsx"
  theme={{
    light: "github-light",
    dark: "github-dark",
  }}
>
  {code}
</ShikiHighlighter>
```

### `defaultColor`

**Type:** `string | false`
**Default:** `'light'`

Default theme mode when using multiple themes. Set to `'light-dark()'` for automatic switching based on `color-scheme`. Set to `false` to disable default theme.

## Display Props

### `showLanguage`

**Type:** `boolean`
**Default:** `true`

Display the language label in the top-right corner of the code block.

### `showLineNumbers`

**Type:** `boolean`
**Default:** `false`

Display line numbers alongside the code.

### `startingLineNumber`

**Type:** `number`
**Default:** `1`

Starting line number when `showLineNumbers` is enabled.

### `addDefaultStyles`

**Type:** `boolean`
**Default:** `true`

Add minimal default styling to the code block.

## Styling Props

### `as`

**Type:** `string`
**Default:** `'pre'`

The root HTML element for the component.

### `className`

**Type:** `string`

Custom class name for the code block container.

### `style`

**Type:** `CSSProperties`

Inline styles for the code block container.

### `langClassName`

**Type:** `string`

Class name for the language label element.

### `langStyle`

**Type:** `CSSProperties`

Inline styles for the language label element.

## Performance Props

### `delay`

**Type:** `number`
**Default:** `0`

Delay in milliseconds between highlighting updates. Useful for throttling real-time highlighting.

### `outputFormat`

**Type:** `'react' | 'html'`
**Default:** `'react'`

Output format. `'react'` returns React elements, `'html'` uses `dangerouslySetInnerHTML` for better performance.

## Advanced Props

### `highlighter`

**Type:** `HighlighterCore`

Custom Shiki highlighter instance. Required when using `react-shiki/core`.

### `engine`

**Type:** `RegexEngine`

RegExp engine for syntax highlighting. Options: Oniguruma (default), JavaScript RegExp, or JavaScript Raw.

### `transformers`

**Type:** `ShikiTransformer[]`
**Default:** `[]`

Array of Shiki transformers for modifying the highlighting output.

### `customLanguages`

**Type:** `LanguageInput[]`
**Default:** `[]`

Array of custom languages to preload for dynamic language selection.

### `langAlias`

**Type:** `Record<string, string>`
**Default:** `{}`

Map of language aliases.

### `cssVariablePrefix`

**Type:** `string`
**Default:** `'--shiki'`

Prefix for CSS variables when using multiple themes.

### `decorations`

**Type:** `DecorationItem[]`
**Default:** `[]`

Custom decorations to wrap highlighted tokens.

### `structure`

**Type:** `'classic' | 'inline'`
**Default:** `'classic'`

Structure of the generated output.

### `tabindex`

**Type:** `number`
**Default:** `0`

Tab index for the code block.

## Full Example

```tsx
<ShikiHighlighter
  language="typescript"
  theme={{
    light: "github-light",
    dark: "github-dark",
  }}
  defaultColor="light-dark()"
  showLanguage={true}
  showLineNumbers={true}
  startingLineNumber={1}
  addDefaultStyles={true}
  className="my-code-block"
  style={{ borderRadius: '8px' }}
  langClassName="lang-label"
  delay={100}
  outputFormat="react"
  transformers={[myTransformer]}
>
  {code}
</ShikiHighlighter>
```

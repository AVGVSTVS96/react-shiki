---
title: Line Numbers
description: Display and customize line numbers in code blocks.
---

react-shiki supports CSS-based line numbers with customizable styling.

## Enabling Line Numbers

Use the `showLineNumbers` prop to display line numbers:

```tsx
// Component
<ShikiHighlighter
  language="javascript"
  theme="github-dark"
  showLineNumbers
>
  {code}
</ShikiHighlighter>

// Hook
const highlighted = useShikiHighlighter(code, "javascript", "github-dark", {
  showLineNumbers: true,
});
```

## Custom Starting Line

Set a custom starting line number with `startingLineNumber`:

```tsx
<ShikiHighlighter
  language="javascript"
  theme="github-dark"
  showLineNumbers
  startingLineNumber={0}
>
  {code}
</ShikiHighlighter>
```

This is useful for showing code snippets that start from a specific line in a larger file.

## Hook CSS Requirement

:::note
When using the hook with line numbers, you must import the CSS file:

```tsx
import 'react-shiki/css';
```

Or provide your own CSS implementation for `.line-numbers` and `.has-line-numbers` classes.
:::

## Customizing Line Number Styles

Line numbers are styled using CSS variables. Customize them in your CSS or inline:

### CSS Variables

```css
--line-numbers-foreground: rgba(107, 114, 128, 0.5);
--line-numbers-width: 2ch;
--line-numbers-padding-left: 0ch;
--line-numbers-padding-right: 2ch;
--line-numbers-font-size: inherit;
--line-numbers-font-weight: inherit;
--line-numbers-opacity: 1;
```

### Global CSS Customization

```css
:root {
  --line-numbers-foreground: #60a5fa;
  --line-numbers-width: 3ch;
  --line-numbers-padding-right: 1.5ch;
}
```

### Inline Style Customization

```tsx
<ShikiHighlighter
  language="javascript"
  theme="github-dark"
  showLineNumbers
  style={{
    '--line-numbers-foreground': '#60a5fa',
    '--line-numbers-width': '3ch',
  }}
>
  {code}
</ShikiHighlighter>
```


---
title: Themes
description: Configure single themes, multi-themes, and custom themes in react-shiki.
---

react-shiki supports all Shiki themes, multi-theme configurations for light/dark modes, and custom TextMate themes.

## Single Theme

Pass a theme name to highlight with a single theme:

```tsx
// Component
<ShikiHighlighter language="typescript" theme="github-dark">
  {code}
</ShikiHighlighter>

// Hook
const highlighted = useShikiHighlighter(code, "typescript", "github-dark");
```

Popular built-in themes include:
- `github-dark`, `github-light`
- `vitesse-dark`, `vitesse-light`
- `nord`
- `ayu-dark`
- `one-dark-pro`
- `dracula`

See Shiki's [theme documentation](https://shiki.style/themes) for the full list.

## Multi-Theme Support

Configure multiple themes to support light and dark modes:

```tsx
// Component
<ShikiHighlighter
  language="typescript"
  theme={{
    light: "github-light",
    dark: "github-dark",
    dim: "github-dark-dimmed",
  }}
  defaultColor="dark"
>
  {code}
</ShikiHighlighter>

// Hook
const highlighted = useShikiHighlighter(
  code,
  "typescript",
  {
    light: "github-light",
    dark: "github-dark",
    dim: "github-dark-dimmed",
  },
  { defaultColor: "dark" }
);
```

### Making Themes Reactive

There are two approaches to make multi-themes respond to your site's theme:

#### Option 1: Using `light-dark()` (Recommended)

Set `defaultColor="light-dark()"` to use CSS's built-in `light-dark()` function:

```tsx
<ShikiHighlighter
  language="typescript"
  theme={{
    light: "github-light",
    dark: "github-dark",
  }}
  defaultColor="light-dark()"
>
  {code}
</ShikiHighlighter>
```

Ensure your site sets the `color-scheme` CSS property:

```css
:root {
  color-scheme: light dark;
}

/* Or dynamically for class-based dark mode */
:root {
  color-scheme: light;
}

:root.dark {
  color-scheme: dark;
}
```

#### Option 2: CSS Theme Switching

For broader browser support, add CSS that switches themes based on media queries or classes:

```css
/* Media query based */
@media (prefers-color-scheme: dark) {
  .shiki,
  .shiki span {
    color: var(--shiki-dark) !important;
    background-color: var(--shiki-dark-bg) !important;
  }
}

/* Class based */
html.dark .shiki,
html.dark .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}
```

See [Shiki's dual themes documentation](https://shiki.style/guide/dual-themes) for more CSS snippets.

:::note
The `light-dark()` function requires modern browser support. For older browsers, use the CSS variables approach.
:::

## Custom Themes

Use custom TextMate themes by passing a theme object:

```tsx
import tokyoNight from "../styles/tokyo-night.json";

// Component
<ShikiHighlighter language="typescript" theme={tokyoNight}>
  {code}
</ShikiHighlighter>

// Hook
const highlighted = useShikiHighlighter(code, "typescript", tokyoNight);
```

Custom themes should be TextMate theme objects. See [this example](https://github.com/antfu/textmate-grammars-themes/blob/main/packages/tm-themes/themes/dark-plus.json) for the expected format.

## CSS Variable Prefix

Customize the CSS variable prefix for theme colors:

```tsx
<ShikiHighlighter
  language="typescript"
  theme={{ light: "github-light", dark: "github-dark" }}
  cssVariablePrefix="--code"
>
  {code}
</ShikiHighlighter>
```

This changes variables from `--shiki-dark` to `--code-dark`, etc.

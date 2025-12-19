---
title: Quick Start
description: Get up and running with react-shiki in minutes.
---

This guide will get you highlighting code in just a few minutes.

## Using the Component

The simplest way to use react-shiki is with the `ShikiHighlighter` component:

```tsx
import ShikiHighlighter from "react-shiki";

function CodeBlock() {
  const code = `function greet(name: string) {
  return \`Hello, \${name}!\`;
}`;

  return (
    <ShikiHighlighter language="typescript" theme="github-dark">
      {code}
    </ShikiHighlighter>
  );
}
```

The component automatically:
- Displays a language label in the top-right corner
- Applies minimal default styling
- Handles loading states gracefully

## Using the Hook

For more control over rendering, use the `useShikiHighlighter` hook:

```tsx
import { useShikiHighlighter } from "react-shiki";

function CodeBlock({ code, language }) {
  const highlightedCode = useShikiHighlighter(code, language, "github-dark");

  return <div className="code-block">{highlightedCode}</div>;
}
```

The hook returns `null` while loading and the highlighted React elements when ready.

## Common Props and Options

Both the component and hook accept similar configuration options:

```tsx
// Component with options
<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  showLanguage={true}      // Show language label (component only)
  showLineNumbers={true}   // Display line numbers
  delay={150}              // Throttle updates (ms)
>
  {code}
</ShikiHighlighter>

// Hook with options
const highlighted = useShikiHighlighter(code, "typescript", "github-dark", {
  showLineNumbers: true,
  delay: 150,
});
```

## Multi-Theme Support

Use different themes for light and dark modes:

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

With `defaultColor="light-dark()"`, the theme automatically switches based on the user's color scheme preference.

## Web Bundle for Smaller Size

If you only need web-focused languages, use the web bundle:

```tsx
import ShikiHighlighter from "react-shiki/web";

// Same API, smaller bundle (~695KB vs ~1.2MB gzipped)
<ShikiHighlighter language="javascript" theme="vitesse-dark">
  {code}
</ShikiHighlighter>
```

## Next Steps

- Learn about [Bundle Options](/guides/bundle-options/) to optimize your bundle size
- Explore [Themes](/guides/themes/) for multi-theme and custom theme support
- See [react-markdown Integration](/guides/react-markdown/) for markdown rendering

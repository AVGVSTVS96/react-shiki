---
title: Transformers
description: Use Shiki transformers to modify highlighted code output.
---

react-shiki supports Shiki transformers, allowing you to modify the highlighted output in various ways.

## Using Transformers

Pass transformers to the `transformers` option:

```tsx
import { customTransformer } from "../utils/shikiTransformers";

// Component
<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  transformers={[customTransformer]}
>
  {code}
</ShikiHighlighter>

// Hook
const highlighted = useShikiHighlighter(code, "typescript", "github-dark", {
  transformers: [customTransformer],
});
```

## Creating a Transformer

Transformers are objects with hook functions that receive and can modify the HAST (Hypertext Abstract Syntax Tree):

```tsx
const lineHighlightTransformer = {
  name: 'line-highlight',
  line(node, line) {
    // Add a class to specific lines
    if ([1, 3, 5].includes(line)) {
      node.properties.className = ['highlighted'];
    }
  },
};
```

## Common Transformer Hooks

| Hook | Description |
|------|-------------|
| `preprocess` | Modify code before tokenization |
| `tokens` | Modify tokens after tokenization |
| `root` | Modify the root HAST node |
| `pre` | Modify the `<pre>` element |
| `code` | Modify the `<code>` element |
| `line` | Modify each line element |
| `span` | Modify each token span |
| `postprocess` | Final modifications |

## Example: Line Highlighting

```tsx
const highlightLinesTransformer = {
  name: 'highlight-lines',
  line(node, line) {
    // Highlight lines 2-4
    if (line >= 2 && line <= 4) {
      node.properties.className = ['highlighted-line'];
      node.properties.style = 'background-color: rgba(255, 255, 0, 0.1);';
    }
  },
};

<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  transformers={[highlightLinesTransformer]}
>
  {code}
</ShikiHighlighter>
```

## Example: Adding Line IDs

```tsx
const lineIdTransformer = {
  name: 'line-ids',
  line(node, line) {
    node.properties.id = `line-${line}`;
    node.properties['data-line'] = line;
  },
};
```

## Using Multiple Transformers

Transformers are applied in order:

```tsx
<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  transformers={[
    lineIdTransformer,
    highlightLinesTransformer,
    customTransformer,
  ]}
>
  {code}
</ShikiHighlighter>
```

## Built-in Shiki Transformers

Shiki provides several built-in transformers in the `@shikijs/transformers` package:

```tsx
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationFocus,
} from '@shikijs/transformers';

<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  transformers={[
    transformerNotationDiff(),
    transformerNotationHighlight(),
  ]}
>
  {code}
</ShikiHighlighter>
```

See [Shiki's transformers documentation](https://shiki.style/packages/transformers) for the full list.

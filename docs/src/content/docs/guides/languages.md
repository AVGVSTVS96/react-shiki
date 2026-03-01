---
title: Languages
description: Configure languages, custom grammars, and language aliases in react-shiki.
---

react-shiki supports all Shiki languages, custom TextMate grammars, and language aliases.

## Built-in Languages

Pass a language identifier to highlight code:

```tsx
// Component
<ShikiHighlighter language="typescript" theme="github-dark">
  {code}
</ShikiHighlighter>

// Hook
const highlighted = useShikiHighlighter(code, "typescript", "github-dark");
```

Shiki supports 200+ languages. See the [Shiki languages documentation](https://shiki.style/languages) for the full list.

## Custom Languages

Use custom TextMate grammars by passing a language object:

```tsx
import mcfunction from "../langs/mcfunction.tmLanguage.json";

// Component
<ShikiHighlighter language={mcfunction} theme="github-dark">
  {code}
</ShikiHighlighter>

// Hook
const highlighted = useShikiHighlighter(code, mcfunction, "github-dark");
```

Custom languages should be TextMate grammar objects. See [this example](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-grammars/grammars/typescript.json) for the expected format.

## Preloading Custom Languages

For dynamic highlighting where language selection happens at runtime, preload custom languages:

```tsx
import mcfunction from "../langs/mcfunction.tmLanguage.json";
import bosque from "../langs/bosque.tmLanguage.json";

// Component - preload custom languages
<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  customLanguages={[mcfunction, bosque]}
>
  {code}
</ShikiHighlighter>

// Hook - preload in options
const highlighted = useShikiHighlighter(code, "typescript", "github-dark", {
  customLanguages: [mcfunction, bosque],
});
```

This ensures the custom languages are loaded and available when switching languages at runtime.

## Language Aliases

Define custom aliases for languages using the `langAlias` option:

```tsx
// Component
<ShikiHighlighter
  language="indents"
  theme="github-dark"
  langAlias={{ indents: "python" }}
>
  {code}
</ShikiHighlighter>

// Hook
const highlighted = useShikiHighlighter(code, "indents", "github-dark", {
  langAlias: { indents: "python" },
});
```

This is useful when:
- You want alternative names for languages
- Your content uses non-standard language identifiers
- You're migrating from another highlighter with different naming

## Dynamic Language Selection

When the language isn't known until runtime:

```tsx
function DynamicCodeBlock({ code, language }) {
  const highlighted = useShikiHighlighter(code, language, "github-dark");

  return <div className="code-block">{highlighted}</div>;
}

// Usage
<DynamicCodeBlock code={userCode} language={userSelectedLanguage} />
```

The highlighter will automatically load the required language grammar on demand.

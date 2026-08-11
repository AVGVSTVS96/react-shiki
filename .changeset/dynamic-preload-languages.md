---
"react-shiki": patch
---

`preloadLanguages` now accepts dynamic grammar imports (shiki's `LanguageInput`) on the full and web bundles, so custom grammars can stay code-split instead of shipping in the main bundle:

```tsx
const preload = [() => import("../langs/mcfunction.tmLanguage.json")];

<ShikiHighlighter language="mcfunction" preloadLanguages={preload}>
  {code}
</ShikiHighlighter>
```

Promises, getters, and module objects are all accepted and resolved by shiki during highlighter setup. Define them at module scope; a fresh promise or arrow function on every render re-triggers highlighting. Additive only: strings and grammar objects work exactly as before.

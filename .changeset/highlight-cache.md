---
"react-shiki": minor
---

Feat: add a `cache` option. Pass a `Map` and highlighted output is kept across unmounts, so remounting unchanged code (switching chat threads, virtualized lists) paints on the first render without highlighting again. Output is stored on unmount, so partial code from streaming never lands in the cache, and entries are keyed by code, language, theme and options.

```tsx
const cache = new Map();

<ShikiHighlighter language="tsx" theme="github-dark" cache={cache}>
  {code}
</ShikiHighlighter>;
```

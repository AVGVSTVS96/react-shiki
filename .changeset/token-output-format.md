---
"react-shiki": patch
---

Add experimental `outputFormat: 'tokens'` support to `useShikiHighlighter`, returning Shiki's raw `TokensResult` for custom rendering. The hook's return type narrows based on the literal `outputFormat` passed: `'react'` returns `ReactElement`, `'html'` returns `string`, and `'tokens'` returns `TokensResult`.

Token output is hook-only. `'tokens'` is accepted through the hook's generic signature but excluded from `HighlighterOptions` and the component's props, so existing option objects and wrappers keep their current types. The `ShikiHighlighter` component warns and falls back to `'react'` if `'tokens'` is passed at runtime.

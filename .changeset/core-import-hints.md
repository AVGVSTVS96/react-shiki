---
"react-shiki": patch
---

Fix: point `createHighlighterCore` hints at `react-shiki/core` and type the internal throttle timer with `ReturnType<typeof setTimeout>` instead of Node's `NodeJS.Timeout`.

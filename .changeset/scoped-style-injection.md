---
"react-shiki": patch
---

Style injection is now scoped to what is actually used: component styles install before layout on first mount and tree-shake out of hook-only bundles entirely, while line-number/highlight styles install only when those options are enabled. Hook consumers that use no line features inject no CSS at all.

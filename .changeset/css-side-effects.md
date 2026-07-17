---
"react-shiki": patch
---

Fix: styles silently dropped from webpack production builds. `sideEffects` still listed pre-0.10 source paths instead of the published `dist/style.css`, so webpack tree-shook the stylesheet import with no warning (affects 0.10.0–0.11.0). Now `**/*.css`.

---
"react-shiki": patch
---

fix: CSS specificity by utilizing native CSS layers and rename classnames to `rs-` prefixed names (`relative` → `rs-root`, `defaultStyles` → `rs-default-styles`, `languageLabel` → `rs-language-label`) to avoid collisions with utility frameworks like Tailwind.

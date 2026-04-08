---
"react-shiki": patch
---

fix: CSS specificity by utilizing CSS `@layer base` and rename classnames and line-number CSS variables to `rs-` prefixed names, with legacy selector and variable aliases kept for backwards compatibility until the next release.

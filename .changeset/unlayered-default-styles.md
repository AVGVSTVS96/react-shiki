---
"react-shiki": minor
---

Fix #168: default styles no longer use `@layer base`, which broke Tailwind v3 builds (its PostCSS plugin treats `@layer base` as a Tailwind directive). Default styles are now unlayered with zero-specificity `:where()` selectors: CSS resets (e.g. Tailwind preflight) can no longer override them, while any rule in your own CSS still can.

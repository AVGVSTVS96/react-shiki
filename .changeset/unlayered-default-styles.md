---
"react-shiki": minor
---

fix(css): default styles no longer use `@layer base`, which broke Tailwind v3 builds (its PostCSS plugin treats `@layer base` as a Tailwind directive). Default styles are now unlayered with zero-specificity `:where()` selectors: CSS resets (e.g. Tailwind preflight) can no longer override them, while any rule in your own CSS still can.

BREAKING CHANGE (css): Small risk for users with `applyDefaultStyles` enabled:

- `pre` padding or `border-radius` overrides from cascade layers (e.g. Tailwind `[&_pre]:p-3.5`) no longer apply. Use `!` / `!important` or disable default styles. Plain (unlayered) CSS is unaffected.

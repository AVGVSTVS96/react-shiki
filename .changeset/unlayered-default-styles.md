---
"react-shiki": minor
---

fix(css): default styles no longer use `@layer base`, which broke Tailwind v3 builds (its PostCSS plugin treats `@layer base` as a Tailwind directive). Default styles are now unlayered with zero-specificity `:where()` selectors: CSS resets (e.g. Tailwind preflight) can no longer override them, while any rule in your own CSS still can.

BREAKING CHANGE (css): There is a very small risk for breaking changes with this release:
- If you have default styles enabled and override padding or border-radius on the `pre` element from inside a cascade layer (e.g. Tailwind utilities like `[&_pre]:p-3.5`), those overrides no longer apply; add `!` / `!important`, or disable default styles. Overrides in plain (unlayered) CSS are unaffected and need no change.

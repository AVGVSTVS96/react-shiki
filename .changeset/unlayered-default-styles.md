---
"react-shiki": minor
---

Rework default styles for robustness against CSS resets and scroll clipping:

- Default styles are no longer wrapped in a CSS cascade layer. They now use zero-specificity `:where()` selectors instead. Layered defaults were load-order fragile: when react-shiki's auto-injected stylesheet registered its layer before an app's layered reset (e.g. Tailwind v4 preflight), the reset won and stripped padding from code blocks. Unlayered zero-specificity rules can't be beaten by layered resets in any load order, while remaining overridable by any rule in user CSS. This also fixes Tailwind v3 PostCSS compilation, which reserves `@layer base` as a directive (the original motivation for renaming the layer).
- Horizontal padding moved from the scrolling `pre` to the inner `code` element (`display: block; width: max-content; min-width: 100%`). Browsers don't extend a scroll container's inline-end padding past overflowing content, so right padding used to disappear when scrolling long lines. The gutter width is customizable via the new `--rs-code-padding-inline` variable (default `1.5rem`).

If you previously declared `@layer react-shiki` ordering in your stylesheet per the README, that declaration is now unnecessary (though harmless).

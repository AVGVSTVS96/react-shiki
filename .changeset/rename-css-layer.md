---
"react-shiki": patch
---

Fix: rename the CSS cascade layer from `base` to `react-shiki`. Tailwind v3's PostCSS plugin reserves `@layer base` as a directive, so react-shiki's CSS failed to compile in Tailwind v3 apps. A dedicated layer name passes through untouched.

If you rely on layer ordering (e.g. overriding react-shiki defaults with Tailwind v4 utilities), declare the order in your stylesheet: `@layer react-shiki, theme, base, components, utilities;`

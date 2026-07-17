---
"react-shiki": patch
---

Fix(css): three default-style selectors left part of the selector outside `:where()` (`pre`, language label, highlighted line), giving them real specificity that could tie with or beat user rules depending on stylesheet order. All selectors are now fully wrapped and zero-specificity, so any user rule always wins.

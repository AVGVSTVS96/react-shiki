---
"react-shiki": patch
---

Deprecate `customLanguages` in favor of `preloadLanguages` for language preloading.

`preloadLanguages` supports both bundled language IDs and custom language registrations.
This also enables preloading bundled IDs directly (previously preloading focused on custom grammars).

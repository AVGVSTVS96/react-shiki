---
"react-shiki": patch
---

Feat: add named engines. `engine` now accepts `'javascript'` or `'oniguruma'` alongside engine instances.

- Named engines are created, cached, and lazy-loaded internally; `'javascript'` skips the WASM fetch entirely
- Referentially stable, so safe to pass inline without re-triggering highlighting on rerenders
- Engine instances are still accepted for custom configuration; create them once at module scope

**Heads up:** the next minor release will swap the default engine from Oniguruma WASM to the JavaScript engine (with `forgiving` enabled by default, see [shiki/regex-engines](https://shiki.style/guide/regex-engines#use-with-unsupported-languages)).

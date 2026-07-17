---
"react-shiki": patch
---

Fix: styles are embedded in the JS and injected at runtime again (as before 0.10.0), instead of relying on the consumer's bundler to resolve a `.css` import. This fixes styles silently dropped from webpack production builds, `ERR_UNKNOWN_FILE_EXTENSION` crashes in plain Node ESM, and broken no-bundler/CDN usage. Injection uses a constructable stylesheet (exempt from CSP `style-src`) with a `<style>` element fallback. `react-shiki/css` now exports the complete compiled stylesheet for use without JS.

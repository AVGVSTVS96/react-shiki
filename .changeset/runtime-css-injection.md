---
"react-shiki": patch
---

Fix: styles are embedded in the JS and injected at runtime again (as before 0.10.0), instead of relying on the consumer's bundler to resolve a `.css` import. This fixes styles silently dropped from webpack production builds, `ERR_UNKNOWN_FILE_EXTENSION` crashes in plain Node ESM, and broken no-bundler/CDN usage. Injection uses a constructable stylesheet (not governed by CSP `style-src` in current browsers) with a `<style>` element fallback. `react-shiki/css` now exports the complete compiled stylesheet for build-time CSS pipelines or as an externally loaded fallback; importing it does not disable automatic runtime injection.

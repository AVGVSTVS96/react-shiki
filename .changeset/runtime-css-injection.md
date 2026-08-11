---
"react-shiki": patch
---

Fix: styles are embedded in the JS and install automatically at runtime (as before 0.10.0), no CSS import or bundler configuration needed. Fixes styles dropped from webpack production builds, `ERR_UNKNOWN_FILE_EXTENSION` crashes in plain Node ESM, and broken no-bundler/CDN usage. `react-shiki/css` still exports the complete compiled stylesheet for build-time CSS pipelines.

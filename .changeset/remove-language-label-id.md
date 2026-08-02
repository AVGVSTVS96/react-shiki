---
"react-shiki": patch
---

Fix: removed the hardcoded `id="language-label"` from the language label. Pages with multiple code blocks rendered duplicate ids (invalid HTML, and `getElementById` only ever found the first label). Style the label with the `.rs-language-label` class or `[data-slot="language-label"]` instead of `#language-label`.

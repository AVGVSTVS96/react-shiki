---
"react-shiki": patch
---

refactor: consolidate language resolution and use stricter Shiki type for grammars

- Use stricter Shiki `LanguageRegistration` type for textmate grammars
- Re-export `LanguageRegistration` type for convenience
- Replace try/catch error handling with proactive language validation
- Decouple display label from language resolver

BREAKING CHANGES:
- Custom grammars without top-level `'repository'` property need `LanguageRegistration` casting
- Component language display no longer shows 'plaintext' for invalid languages

# Streaming Language Error Issue

## Problem Description
When using react-shiki with streaming responses (e.g., from AI chat interfaces), users are experiencing:
1. Error messages in browser console when a language isn't loaded
2. Missing codeblocks (sometimes showing nothing, sometimes showing "undefined")
3. Shiki doesn't gracefully fall back to plaintext as expected

## Current State
- Language validation was simplified to avoid importing all language bundles
- Resolver passes through any language string to Shiki for validation
- No error handling for when Shiki throws language loading errors

## Root Causes
1. **Shiki throws errors** - When a language isn't loaded, Shiki throws an error rather than falling back gracefully
2. **Streaming content** - Code content changes rapidly during streaming, potentially causing race conditions
3. **Missing guards** - No validation for empty/undefined code before highlighting

## Attempted Solutions (Reverted)
- Added try-catch blocks to catch language errors and retry with plaintext
- Added nested error handling with HAST fallback structure
- Added guards for undefined/null code

These solutions were reverted due to TypeScript errors and complexity.

## Considerations for Future Solution
1. **Pre-validation** - Check if language is loaded before calling codeToHast
2. **Error boundaries** - Handle errors at component level vs hook level
3. **Streaming optimization** - Better handling of rapidly changing content
4. **Empty content** - Proper guards for undefined/empty code

## Open Questions
- Should we validate language availability before attempting to highlight?
- How to check if a language is loaded without importing all bundles?
- Should error handling be in the hook or component?
- How to optimize for streaming content that changes rapidly?
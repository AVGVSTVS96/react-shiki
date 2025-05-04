---
"react-shiki": minor
---

- Full support for all Shiki options is now available.
- **Breaking change:** Built-in removal of `tabindex` from code blocks has been removed. By default, code blocks will now be focusable (`tabindex="0"`), aligning with Shiki’s upstream default and WCAG accessibility guidelines. If you want to restore the previous non-focusable behavior, explicitly set `tabindex: -1` in your options. For more details and accessibility context, see References below.

**References:**

- WCAG 3.1 compliance: scrollable `<pre>` elements should be focusable ([WCAG rule](https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/proposed/))
- Rationale and discussion: [shikijs/shiki#428](https://github.com/shikijs/shiki/issues/428)

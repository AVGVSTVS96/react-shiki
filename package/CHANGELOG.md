# react-shiki

## 0.8.0

### Minor Changes

- Add `outputFormat` option, support HTML in addition to JSX output for improved performance _[`#92`](https://github.com/AVGVSTVS96/react-shiki/pull/92) [`5fa19ee`](https://github.com/avgvstvs96/react-shiki/commit/5fa19ee163da6cdee4403b050ccc561aeda6b5fa) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_

## 0.7.4

### Patch Changes

- Update react dependencies _[`#80`](https://github.com/AVGVSTVS96/react-shiki/pull/80) [`6611364`](https://github.com/avgvstvs96/react-shiki/commit/66113640784261a6cc346df2acf6c2669a52566d) [@renovate](https://github.com/apps/renovate)_
- Internal updates to dependency management _[`#79`](https://github.com/AVGVSTVS96/react-shiki/pull/79) [`4b2720f`](https://github.com/avgvstvs96/react-shiki/commit/4b2720f988bd1067ba3913d1f91031631cf38bfd) [@copilot-swe-agent](https://github.com/apps/copilot-swe-agent)_
- Fix multi-theme support in component _[`#87`](https://github.com/AVGVSTVS96/react-shiki/pull/87) [`44d670a`](https://github.com/avgvstvs96/react-shiki/commit/44d670a5132c6152538bf69ac290e944d9bdaf97) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_
- Update shiki to 3.11.0 _[`b40ad4e`](https://github.com/avgvstvs96/react-shiki/commit/b40ad4eb1e22641618f8c5216fe0e98348a79235) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_

## 0.7.3

### Patch Changes

- Feat: Support passing ref to component _[`#78`](https://github.com/AVGVSTVS96/react-shiki/pull/78) [`3e24fe8`](https://github.com/avgvstvs96/react-shiki/commit/3e24fe852170acef14dde41ae6902cf9c5cf9401) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_

## 0.7.2

### Patch Changes

- Feat: support langAlias option _[`#68`](https://github.com/AVGVSTVS96/react-shiki/pull/68) [`7ff687c`](https://github.com/avgvstvs96/react-shiki/commit/7ff687cb1d7ff507f1606f7a43ed5444d721e511) [@juliusmarminge](https://github.com/juliusmarminge)_

## 0.7.1

### Patch Changes

- Feat: Add support for line numbers with `showLineNumbers` _[`928c69c`](https://github.com/avgvstvs96/react-shiki/commit/928c69c1bfc9f9918fc9ffbe2b85635dd645ce1e) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_

## 0.7.0

### Minor Changes

- Add `react-shiki/core` entrypoint for fine-grained bundle support, as well as `react-shiki/web` for Shiki's smaller web bundle _[`#59`](https://github.com/AVGVSTVS96/react-shiki/pull/59) [`fdf9609`](https://github.com/avgvstvs96/react-shiki/commit/fdf96094691fc78279ac0d6a0c216075b2fc50c6) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_

### Patch Changes

- Chore: remove minification _[`#58`](https://github.com/AVGVSTVS96/react-shiki/pull/58) [`91a4fa2`](https://github.com/avgvstvs96/react-shiki/commit/91a4fa292b9e04b8184a26cba30d15518365b81e) [@juliusmarminge](https://github.com/juliusmarminge)_

## 0.6.0

### Minor Changes

- Improve performance by 5-10% _[`#41`](https://github.com/AVGVSTVS96/react-shiki/pull/41) [`4927f46`](https://github.com/avgvstvs96/react-shiki/commit/4927f46) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_
- Full support for all Shiki options is now available. _[`#50`](https://github.com/AVGVSTVS96/react-shiki/pull/50) [`b28a1ac`](https://github.com/avgvstvs96/react-shiki/commit/b28a1ac15c3a1f512e44aa44d2b95759c75e3886) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_
- **Breaking change:** Built-in removal of `tabindex` from code blocks has been removed. By default, code blocks will now be focusable (`tabindex="0"`), aligning with Shiki’s upstream default and WCAG accessibility guidelines. If you want to restore the previous non-focusable behavior, explicitly set `tabindex: -1` in your options. For more details and accessibility context, see References below.
  - WCAG 3.1 compliance: scrollable `<pre>` elements should be focusable ([WCAG rule](https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/proposed/))
  - Rationale and discussion: [shikijs/shiki#428](https://github.com/shikijs/shiki/issues/428)

## 0.5.3

### Patch Changes

- Ensure custom languages can be identified by their filetypes _[`#51`](https://github.com/AVGVSTVS96/react-shiki/pull/51) [`ff16138`](https://github.com/avgvstvs96/react-shiki/commit/ff16138151a7faba61489c41934a670dbbce5daa) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_

## 0.5.2

### Patch Changes

- Refactor types and add changesets github integration with `changesets-changelog-clean` _[`#37`](https://github.com/AVGVSTVS96/react-shiki/pull/37) [`5b73031`](https://github.com/avgvstvs96/react-shiki/commit/5b73031a7cfb63312354b05a74ef2a19880f5c46) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_
- Bump Shiki to 3.2.1, html-react-parser to 5.2.3 _[`#39`](https://github.com/AVGVSTVS96/react-shiki/pull/39) [`f5e2fea`](https://github.com/avgvstvs96/react-shiki/commit/f5e2fea1e960254fb33419dbd283c6ecb9a15815) [@renovate](https://github.com/apps/renovate)_
- Simplify code by using Shiki managed singleton instance, adapt logic _[`#38`](https://github.com/AVGVSTVS96/react-shiki/pull/38) [`daef424`](https://github.com/avgvstvs96/react-shiki/commit/daef424f21ba78a6fdecb9608fa7276b3ff578a9) [@AVGVSTVS96](https://github.com/AVGVSTVS96)_
- Update dev-dependencies _[`#40`](https://github.com/AVGVSTVS96/react-shiki/pull/40) [`b832131`](https://github.com/avgvstvs96/react-shiki/commit/b83213107992cdd03c44ead954c65043b9897bcf) [@renovate](https://github.com/apps/renovate)_

## 0.5.1

### Patch Changes

- 9c5d0dd: export language, theme, and options types

## 0.5.0

### Minor Changes

- 5449efe: Add dual/multi theme support

## 0.4.1

### Patch Changes

- 25ab014: fix: rerender when theme changes

## 0.4.0

### Minor Changes

- d2f57de: Add support for custom languages

### Patch Changes

- 4b8364e: Update Shiki to 3.0

## 0.3.0

### Minor Changes

- 623bdc3: Refactored Shiki syntax highlighting implementation to use singleton shorthands for simplified theme/language loading and more reliable resource management.
- 0e23eaa: feat: Add support for custom Shiki transformers

### Patch Changes

- facf2bc: - Fix boolean attribute error
  - Improve `isInlineCode` function, achieve parity with `rehypeInlineCodeProperty`

## 0.2.4

### Patch Changes

- 0985346: Add new prop `langClassName` for passing classNames to the language span when `showLanguage` is enabled
- 1d9b95a: Accuartely check inline code with exported rehype inline code plugin, sets inline prop when passed to react markdown

## 0.2.3

### Patch Changes

- Add `langStyle` prop, separate from code block's `style`
- Update README

## 0.2.2

### Patch Changes

- Update README

## 0.2.1

### Patch Changes

- Update README

## 0.2.0

### Minor Changes

- Implement fleshed out solution built in <https://github.com/AVGVSTVS96/astroSite/>

  - Adds support for custom textmate themes alongside bundled Shiki themes
  - Introduces delay option to throttle highlighting for streamed code updates
  - Uses singleton highlighter instance for better performance
  - Adds comprehensive type definitions with improved language and theme support
  - Enhances error handling with graceful fallbacks for unsupported languages

## 0.1.2

### Patch Changes

- 26666da: Update README, package.json, and tsup config

## 0.1.1

### Patch Changes

- 536ffc5: Add JSDoc documentation to `ShikiHighlighter` and `useShikiHighlighter`

  Update README and demo page in playground

## 0.1.0

### Minor Changes

- b8ff50b: Add `addDSefaultStyles` prop to control whether or not the code block is rendered with default styles

### Patch Changes

- 9031972: Add changesets cli

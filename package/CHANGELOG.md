# react-shiki

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

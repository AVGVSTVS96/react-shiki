# react-shiki

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

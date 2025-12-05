# Architecture Improvements

Tracked improvements for react-shiki codebase.

## High Priority

### Consolidate Bundle Factories
`bundles/full.ts` and `bundles/web.ts` are nearly identical - only the import differs. Extract shared logic into a factory that accepts bundle configuration.

```typescript
// Before: Two nearly identical files
// bundles/full.ts imports from 'shiki'
// bundles/web.ts imports from 'shiki/bundle/web'

// After: Single factory with config
const createBundleHighlighter = (getSingletonHighlighter, createEngine) =>
  async (langs, themes, engine) => { ... }
```

### Consolidate Entry Points
`index.ts`, `web.ts`, and `core.ts` repeat the same wrapper pattern. Create a shared entry point factory.

```typescript
// Current: Same pattern repeated 3 times
export const useShikiHighlighter = <F extends OutputFormat = 'react'>(...) => {
  return useBaseHook(..., createXxxHighlighter);
};
export const ShikiHighlighter = createShikiHighlighterComponent(useShikiHighlighter);

// Proposed: Entry point factory
const { useShikiHighlighter, ShikiHighlighter } = createEntryPoint(createFullHighlighter);
```

## Medium Priority

### Type-Safe Transformer Registry
The output transformer registry loses type information on lookup:
```typescript
return outputTransformers[format](context) as OutputFormatMap[F];
```

Could use conditional types or function overloads for full type safety.

### Centralize Constants
`DEFAULT_THEMES` is defined in `options.ts`. Consider a `constants.ts` for all defaults:
- Default themes
- Default line number start
- Default output format

### Split Types File
`types.ts` mixes public API types with internal types. Consider:
- `types.ts` - Public API types (Language, Theme, HighlighterOptions)
- `internal-types.ts` - Internal types (TimeoutState, TransformContext)

## Low Priority

### Surface Errors to Consumers
Currently errors are logged but not surfaced:
```typescript
highlight().catch(console.error);
```

Consider an `onError` callback option or returning error state from hook.

### Component Output Type
The component casts the hook return:
```typescript
) as ReactNode | string | null;
```

This is because the component restricts `outputFormat` to `'react' | 'html'` but still uses the generic hook. Could create a component-specific hook variant.

### Empty String Fallbacks
Token output uses empty strings as fallbacks:
```typescript
fg: theme?.fg ?? '',
bg: theme?.bg ?? '',
```

Consider `undefined` for missing values, letting consumers decide on fallbacks.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. It also serves as a comprehensive overview of the project structure, architecture, and development workflows for anyone contributing to or working with this codebase.

## Project Structure

This is a React syntax highlighting library structured as a monorepo:

- **Main package**: `/package/` - The react-shiki library with three entry points for bundle optimization
- **Playground**: `/playground/` - Demo application for testing features
- **Root**: Workspace configuration and shared tooling

## Commands

### Development
```bash
# Start both package and playground in watch mode
pnpm dev

# Package development only
pnpm package:dev

# Playground development only  
pnpm playground:dev
```

### Testing & Quality
```bash
# Run tests
pnpm test

# Run benchmarks
pnpm bench

# Lint code
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type check and lint
pnpm check
```

### Building
```bash
# Build all packages
pnpm build

# Build package only
pnpm package:build

# Build playground only
pnpm playground:build
```

### Release
```bash
# Create a changeset
pnpm changeset

# Release packages
pnpm release
```

## Architecture

### Three Entry Points Strategy

The library solves the fundamental contradiction between bundle optimization and plug-and-play convenience through three distinct entry points:

1. **`react-shiki`** (Full Bundle): ~6.4MB minified, all languages/themes
2. **`react-shiki/web`** (Web Bundle): ~3.8MB minified, web-focused languages
3. **`react-shiki/core`** (Core Bundle): Minimal, requires custom highlighter

### Code Organization

- **`package/src/lib/`**: Core implementation (hook, component, types, utilities)
- **`package/src/bundles/`**: Bundle adapters for different entry points
- **`package/src/index.ts`**: Full bundle entry point
- **`package/src/web.ts`**: Web bundle entry point  
- **`package/src/core.ts`**: Core bundle entry point

### Key Design Patterns

- **Factory Pattern**: Base hook accepts highlighter factory for different bundles
- **Composition**: Single implementation reused across all entry points

## Important Implementation Details

### Language Fallback System
When an unknown language is requested, the library implements a two-level fallback:
1. **Factory level**: Falls back to plaintext highlighter if language loading fails
2. **Hook level**: Checks loaded languages and uses plaintext if unavailable

### Bundle Optimization
- **Factory Pattern Architecture**: The core implementation uses a factory function pattern that accepts a highlighter creation strategy, enabling different entry points with different bundle sizes
- **Code Structure Separation**: Each entry point (`index.ts`, `web.ts`, `core.ts`) imports a different highlighter factory from the `bundles/` directory
- **Lazy Loading**: The factory functions control which Shiki chunks get bundled, preventing inclusion of unnecessary languages/themes
- **Shared Core Logic**: All entry points share the same core implementation, ensuring consistent behavior regardless of bundle choice

### Type System
- Uses function signature type aliases to provide clean public API types across all entry points
- Extends Shiki's `CodeToHastOptions` and core types while adding react-shiki specific functionality
- Maintains type safety between different bundle strategies through shared type definitions

## Testing

- **Framework**: Vitest with jsdom environment
- **Location**: `package/src/__tests__/`
- **Setup**: `test-setup.ts` configures global testing environment
- **Benchmarks**: Performance tests in `performance.bench.ts`

## Code Quality Tools

- **Linter**: Biome (configured in `biome.json`)
- **Formatter**: Biome with 74 character line width
- **Build**: tsup with ESM output and automatic JSX runtime
- **Package Manager**: pnpm with workspace support

## Key Files to Understand

1. **`package/src/lib/hook.ts`**: Base hook implementation
2. **`package/src/lib/component.tsx`**: Component factory function  
3. **`package/src/lib/types.ts`**: All type definitions including public API
4. **`package/src/bundles/`**: Different highlighter creation strategies
5. **`complete-implementation-guide.md`**: Comprehensive architecture documentation

## Development Workflow

1. Make changes in `package/src/`
2. Run `pnpm test` to verify functionality
3. Run `pnpm check` for type checking and linting
4. Test in playground with `pnpm playground:dev`
5. Build with `pnpm build` before committing
6. Use `pnpm changeset` for versioning

## Bundle Entry Points

When working with the core bundle (`react-shiki/core`), users must provide a custom highlighter. The other entry points create highlighters automatically using different Shiki bundles.

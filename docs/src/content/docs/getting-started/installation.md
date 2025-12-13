---
title: Installation
description: Install react-shiki in your React project.
---

## Prerequisites

react-shiki requires React 17 or later.

## Install via npm

```bash
npm install react-shiki
```

## Install via pnpm

```bash
pnpm add react-shiki
```

## Install via yarn

```bash
yarn add react-shiki
```

## Bundle Options

react-shiki offers three different entry points to balance convenience and bundle size:

| Entry Point | Size (gzipped) | Description |
|-------------|----------------|-------------|
| `react-shiki` | ~1.2MB | Full bundle with all languages and themes |
| `react-shiki/web` | ~695KB | Web-focused languages only |
| `react-shiki/core` | ~12KB | Minimal core, BYO themes and languages |

See the [Bundle Options](/guides/bundle-options/) guide for detailed information on choosing the right bundle for your project.

## TypeScript Support

react-shiki includes TypeScript definitions out of the box. No additional `@types` packages are required.

## Next Steps

Continue to the [Quick Start](/getting-started/quick-start/) guide to start highlighting code!

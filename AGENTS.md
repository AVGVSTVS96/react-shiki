# react-shiki

A React component and hook for syntax highlighting with Shiki, published to npm as `react-shiki`, with a playground site. Public, MIT, and outside contributors send issues and PRs.

## Commands

- `pnpm check`: builds the package, then oxlint, oxfmt, `tsc` for every workspace and the tests. Lefthook runs it before each commit, CI on each PR and push.
- `pnpm fix`: oxlint's fixes, then oxfmt.
- `pnpm package:dev` / `pnpm playground:dev`: watch-build the package / run the playground.
- `pnpm --filter react-shiki check:package`: checks the built `dist` (plain Node ESM import, no CSS import in JS, hook-only bundles drop the component and its CSS).
- `pnpm bench`: the Vitest benchmarks.
- `pnpm changeset`: records a release note for a change to the published package.

## Map

| Folder | Job | May import |
| --- | --- | --- |
| `packages/react-shiki/` | the npm package: entries `src/index.ts` (full Shiki bundle), `src/web.ts`, `src/core.ts`; `src/lib/` hook, component, theme, language, engine; `src/bundles/` highlighter factories | its own dependencies |
| `apps/playground/` | Vite + MDX demo at react-shiki.vercel.app (Vercel root `apps/playground`) | `react-shiki` (workspace) |
| `tools/oxlint/` | the shared no-comments rule | nothing |
| `.github/scripts/` | writes a changeset for Renovate PRs | Node only |

## Rules and what enforces them

| Rule | Enforced by |
| --- | --- |
| The exports map (`.`, `./web`, `./core`, `./css`), `dist` output and public types are the published contract | publint + attw in `tsdown`; `scripts/check-package.ts`; `tests/types.test-d.tsx` |
| Works on React 18 and 19, builds on Node 22, 24 and 26 | `.github/workflows/compat.yml` |
| Effects only in the library's hook layer (`src/lib/hook.ts`, `styles.ts`, `utils.ts`) | `no-restricted-imports` in `oxlint.config.ts` |
| No `any`, `as` or non-null `!` | Ultracite core, type-aware |
| No comments, except in `packages/react-shiki/src` | `tools/oxlint/no-comments.ts` |
| A change to the published package carries a changeset | judgment; the Claude review checks it |

## Judgment

- Library source keeps its JSDoc, which ships in the `.d.mts` as the API docs, and its few comments on why (issue links, CSP, tree-shaking).
- Releases: merging changesets to main makes `release.yaml` open a "chore: update versions" PR; merging that publishes to npm with provenance (OIDC). Tooling-only changes need no changeset.
- pnpm, not bun: CI swaps React versions with `pnpm add` and builds on a Node matrix, and installs are held to pnpm 12's supply-chain policies (package release age and allowed build scripts, set in `pnpm-workspace.yaml`).
- The playground stays on TypeScript 6: `@mdx-js/typescript-plugin` needs TypeScript 6's JavaScript compiler API (pinned in `renovate.json`).
- Formatting keeps the repo's Biome-era style (74 columns, single quotes) so open PRs and outside contributors don't fight a reformat.
- `useShikiHighlighter` reruns only on real input changes (issue #161): keep inputs stable through `useStableValue`, and keep the factory out of effect deps.

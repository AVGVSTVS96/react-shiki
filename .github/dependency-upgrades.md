# October 2026 dependency upgrades

The upgrades are released together as `react-shiki@0.11.2`. Dependency and
workflow migrations remain separate review units so failures can be attributed
and reverted without changing the public API.

| Upgrade | Compatibility decision |
| --- | --- |
| Shiki 4.5 / React 19.3 / non-major dependencies | Take after runtime, public-type, package-integrity, and playground checks. Test React 18.3.1 with React 18 types, React 19.2.6, and the current catalog. Keep tsdown and its CSS plugin on matching 0.23 versions; the existing `deps.onlyBundle` configuration already uses the supported API. |
| jest-dom 7 | Isolate. Use its `/vitest` entry point and declare the `@testing-library/dom` peer directly. Test workers use Node 24.21, satisfying Node 22+. |
| jsdom 30 | Isolate before Vitest. Requires Node 22.22.2+, 24.15+, or 26+. Retain real style, theme, shadow-root, and cleanup assertions. |
| Vitest 5 | Isolate. Replace the removed top-level `bench` API with the test fixture, repair obsolete benchmark resolver imports, and run all six scenarios. Benchmark mode disables its redundant typecheck pass; normal tests still check the public API types. |
| TypeScript 7 | Isolate after tsdown and Vitest. Use the native compiler for library checks and declarations. Keep TypeScript 6 scoped to the playground because the MDX language-service plugin requires the stable JavaScript compiler API. Vitest type assertions continue to run with the native compiler. |
| pnpm 12 | Isolate and regenerate the lockfile with pnpm 12.9.1, including its package-manager dependency metadata. Verify frozen installs and supply-chain policies with that exact version. The existing exact Vite 8.3.3 release-age exception covers the tested release published on October 6; it does not disable the policy globally. |
| Changesets CLI 3 / action 2 | Couple. Migrate `commit`, `title`, and `publish` to `commit-message`, `pr-title`, and `publish-script`; pass `github-token` explicitly. Test the custom changelog generator and patch version plan before using the npm OIDC release workflow. |
| checkout 7 | Isolate. Fork reviews under `pull_request_target` check out the trusted event/base revision and inspect PR changes through GitHub; do not check out the untrusted fork head in the privileged workflow. |
| setup-node 7 | Isolate. Hosted runners support its action runtime; retain the tested Node pins and pnpm cache integration. |

Merge order: compatibility CI → non-major dependencies → jest-dom → jsdom →
Vitest → TypeScript → pnpm → Changesets CLI/action → checkout → setup-node →
patch release. Keep the version PR open until all upgrade PRs are resolved.

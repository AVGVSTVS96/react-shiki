# streaming-perf.task-progress

## objective
- diagnose live chat slowdown in `useShikiStreamHighlighter` path (astro consumer), prioritize deterministic evidence over synthetic pass/fail.

## stop-1.completed
- fix: duplicate child keys in `ShikiTokenRenderer` (`stream-renderer.tsx`) to remove warning-storm + reconciliation instability.
- add: per-session summary diagnostics in `stream-hook.ts` (`[react-shiki] stream summary`).

## stop-1.observed (user logs)
- severe react commit pressure:
  - caseA: `chars=765`, `tokenEvents=2250`, `scheduledCommits=2250`, `recallEvents=227`, `ms=1115.9`, `amplification=2.94`.
  - caseB: `chars=1571`, `tokenEvents=2989`, `scheduledCommits=2989`, `recallEvents=291`, `ms=1877.6`, `amplification=1.9`.
- restart events present in normal flow (`reason=restart`, `restarts=1`) across multiple blocks; indicates non-append transition at least once/session.
- warning fix improved speed; long-run slowdown persists.

## inference.current
- primary bottleneck = per-token state commits (`setTokens` per stream event) + full-array copy churn.
- secondary unknown = restart trigger root cause (consumer string mutation/remount/markdown transform).
- tertiary possible = options stabilization deep-compare overhead in real markdown tree.

## stop-2.completed
- add: slow options stabilization diagnostic in `stream-hook.ts` (`[react-shiki] slow options stabilize`) when `useStableValue(options)` cost >2ms (dev-only, test/prod excluded).

## stop-2.observed (user logs)
- no visible `slow options stabilize` signals captured.
- regression event: one response had block#5 fully unhighlighted; next response highlighted all blocks.
- restart summaries remain frequent; representative:
  - `chars=374 tokenEvents=657 scheduledCommits=657 recalls=73 ms=431`.
  - `chars=760 tokenEvents=1746 scheduledCommits=1746 recalls=177 ms=1106`.
  - `chars=715 tokenEvents=1263 scheduledCommits=1263 recalls=117 ms=787`.
- visual impact after stop-2: none/minimal.

## stop-3.completed
- add: restart-cause diagnostics in `stream-hook.ts`:
  - `[react-shiki] non-append restart` with `prevLen/nextLen/commonPrefix/head/tail`.
  - `[react-shiki] restart after closed stream` with len/tail context.

## stop-3.observed (user logs)
- no restart-cause lines captured in shared paste (only summaries).
- missing highlight still reproduces intermittently (response1 block#4 unhighlighted, prior run block#5 unhighlighted).
- commit pressure persists:
  - `chars=794 tokenEvents=1776 scheduledCommits=1776 recalls=181 ms=1032`.
  - `chars=706 tokenEvents=1197 scheduledCommits=1197 recalls=117 ms=745`.
  - `chars=723 tokenEvents=558 scheduledCommits=558 recalls=50 ms=409`.

## stop-4.completed (consumer cleanup)
- target file: `astroSite/src/components/ChatUI/CodeHighlight.tsx`.
- changes:
  - move stream hook to block-only subcomponent (`BlockCodeHighlight`), inline path no hook.
  - remove `trim()` from code extraction (`String(children ?? '')`), preserve streamed deltas.
  - memoize stream options object (`useMemo`) and hoist `customLanguages` array constant.
- goal: reduce markdown-tree overhead + eliminate non-essential per-node work.

## stop-4.observed (user logs)
- missing-highlight bug still reproduces (latest: last block unhighlighted; prior: block#4 unhighlighted).
- pattern shifted from high-recall sessions to restart storms with tiny sessions:
  - many `sessionId` increments (`1..31`, `83..88`, etc.) with `chunks=1|2`, `recallEvents=0`.
  - representative tiny-session metrics: `chars~30..113`, `tokenEvents~15..51`, `ms~2..20`.
- indicates frequent non-append restarts/remount-like behavior; incremental append path often not sustained.

## stop-5.completed (scheduler mitigation)
- in `stream-hook.ts`, wrap token commit updates in `startTransition(...)` for both recall and append token paths.
- in `stream-hook.ts`, make restart-cause logs active in non-test builds regardless of `NODE_ENV` value:
  - `[react-shiki] non-append restart`
  - `[react-shiki] restart after closed stream`

## stop-5.observed (user logs)
- still slow/jerky; behavior worsened subjectively after consumer refactor.
- restart-cause logs still absent in user output, only summary lines observed.
- summary pattern indicates restart storm + tiny sessions:
  - many consecutive restarts (`sessionId` climbing) with `chunks=1|2`, `recallEvents=0`.
  - intermittent missing highlight persists (latest: last block unhighlighted).

## stop-6.completed (coalesced token commits)
- in `stream-hook.ts` token consumer:
  - replace per-token `setTokens` with buffered token array + scheduled flush.
  - flush cadence: max once per animation frame (`requestAnimationFrame`), microtask fallback.
  - commit path still wrapped in `startTransition`.
  - recalls mutate buffer (`splice`) instead of immediate state commit.
  - done/error force flush before terminal status.
  - cleanup cancels pending frame flush.
- adjust summary log gating to reduce instrumentation overhead:
  - log only when `elapsedMs>120` or `tokenEvents>300` or `restarts>2`.
- package built (`pnpm build`) so linked astro app consumes updated dist.

## stop-6.observed (user logs)
- restart-cause logs now visible and definitive:
  - repeated non-append deltas with `commonPrefixLen = prevLen-1` while `nextLen` keeps increasing.
  - shape indicates single-char tail rewrite churn from markdown-derived code string.
- example: `prevLen=494`, `commonPrefixLen=493`, next grows `500..539`, tails shift from `thread1\n` to `thread2.start...`.
- user-visible: still jerky; last two blocks unhighlighted.

## stop-7.completed (restart storm coalescing)
- coalesce non-append restarts in `stream-hook.ts`:
  - accumulate restart signals for ~28ms window.
  - execute one restart per window (`[react-shiki] coalesced restart`).
  - track `nonAppendEvents` metric in session summary.
- immediate restart retained for `isComplete=true` non-append updates (`[react-shiki] forced restart`) to preserve final-state correctness.
- clear pending coalesced restart on append recovery and on session lifecycle transitions.
- package rebuilt after changes.

## stop-7.observed (user logs)
- coalesced restart logs confirm root input pathology is upstream markdown tail mutation, not tokenizer recall pressure.
- recurring signature:
  - `commonPrefixLen = prevLen - 1`
  - `eventCount` bursts per session (`5..28`)
  - `reason = non-append`
  - tails include transient/incomplete fence artifacts (e.g. trailing `` / partial suffix rewrites).
- summary confirms low scheduled commit count after buffering (`scheduledCommits=1`) but UI still jerky/intermittent unhighlight due repeated non-append churn.

## stop-8.completed (consumer tail normalization adapter)
- target: `astroSite/src/components/ChatUI/CodeHighlight.tsx`.
- add pre-hook code normalizer to stabilize markdown-derived code input:
  - normalize CRLF to LF.
  - strip trailing transient fence tails (`\`{1,3}` at end).
  - ignore shrink-only regressions (`prev startsWith next` => keep prev).
  - patch common `prevLen-1` tail rewrite pattern by preserving prior tail char and appending new suffix.
- feed normalized value to `useShikiStreamHighlighter` instead of raw `children` string.

## stop-8.observed (user logs)
- visual regression: slower start + longer completion; still jerky.
- normalization adapter reduced neither non-append churn nor UX issues sufficiently.
- conclusion: adapter approach is not acceptable as production pattern; keep only as diagnostic artifact.

## stop-9.completed (consumer decontamination + completion signal)
- reverted tail-normalization adapter from `astroSite/src/components/ChatUI/CodeHighlight.tsx`.
- kept low-risk consumer improvements:
  - block-only hook path
  - no `trim()`
  - memoized options/customLanguages
- added explicit completion signal wiring:
  - `ChatBox.tsx`: pass `isLoading` into `ChatMessages`.
  - `Messages.tsx`: compute per-message `isComplete` (all except currently streaming last assistant message).
  - `CodeHighlight.tsx`: accept `isComplete` prop and pass `{ code, isComplete }` to stream hook.
- intent: close stream sessions deterministically at message completion, improve final flush reliability (intermittent unhighlight on tail blocks).

## stop-9.observed (latest user logs)
- sessions now complete cleanly (`reason=done`) with no restart churn:
  - `restarts=0`, `nonAppendEvents=0`, `scheduledCommits=1`.
- all reported sessions are one-shot block updates (`chunks=1`), not incremental growth.
- implication:
  - restart-storm confound removed.
  - current astro harness path is no longer representative for incremental-per-token latency evaluation (perceived "starts late" behavior expected when block appears only near completion).
- user-reported UX remains poor/jerky despite clean metrics; treat as harness-level visual behavior, not evidence of stream-hook regression by itself.

## stop-10.completed (explicit user-directed harness rollback)
- user requested rollback of astro consumer changes.
- reverted to baseline in astro repo:
  - `src/components/ChatUI/CodeHighlight.tsx`
  - `src/components/ChatUI/Messages.tsx`
  - `src/components/ChatUI/ChatBox.tsx`

## next.order
1. package findings for expert agent (restart-storm root cause vs one-shot harness behavior).
2. continue debugging in react-shiki stream-lab with deterministic scenarios + parity/integrity metrics.

## instrumentation.snapshot (current stream-hook implementation)
- active logs in `package/src/lib/stream-hook.ts`:
  - `[react-shiki] slow options stabilize`
    - trigger: `useStableValue(options)` cost `>2ms` (`NODE_ENV !== production|test`).
    - payload: `ms`, `hasCustomLanguages`, `customLanguageCount`, `hasLangAlias`, `hasPreloadLanguages`.
  - `[react-shiki] stream summary`
    - trigger: terminal summary when `elapsedMs>120 || tokenEvents>300 || restartCount>2`.
    - payload: `reason`, `sessionId`, `mode`, `ms`, `chunks`, `chars`, `tokenEvents`, `recallEvents`, `scheduledCommits`, `restarts`, `nonAppendEvents`, `amplification`.
  - `[react-shiki] coalesced restart`
    - trigger: coalesced non-append/closed restart window (~28ms).
    - payload: `sessionId`, `eventCount`, `prevLen`, `latestNextLen`, `commonPrefixLen`, `prevTail`, `nextTail`, `reason`.
  - `[react-shiki] forced restart`
    - trigger: non-append update with `isComplete=true` (immediate restart path).
    - payload: `sessionId`, `prevLen`, `nextLen`, `commonPrefixLen`, `prevTail`, `nextTail`.
- historical logs replaced by coalesced design:
  - old `[react-shiki] non-append restart` and `[react-shiki] restart after closed stream` were superseded.
- note on visibility:
  - no output is expected when thresholds are not met (`stream summary` gated by `elapsedMs>120 || tokenEvents>300 || restartCount>2`).
  - restart logs appear only when restart paths trigger.

## commit.provenance
- core stream-hook instrumentation + buffered token commit + coalesced restart logic are present in commit `081c526`.
- handoff patch commit `1256f3d` covers:
  - `package/src/lib/stream-renderer.tsx` duplicate-key fix.
  - `package/task-progress.md` consolidated findings + instrumentation map.

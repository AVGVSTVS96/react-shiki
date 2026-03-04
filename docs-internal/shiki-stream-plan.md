# react-shiki + shiki-stream implementation plan

## Goal

Add native streaming syntax highlighting support to react-shiki in a way that:

- stays inside the existing `react-shiki`, `react-shiki/web`, and `react-shiki/core` entry points
- preserves the existing full/web/core bundle-selection story
- keeps the current static highlighting API intact
- adds a separate streaming hook and component:
  - `useShikiStreamHighlighter`
  - `ShikiStreamHighlighter`
- avoids shipping static token output for now
- ships only a small token renderer primitive instead of a large parallel rendering framework

---

## Final decisions

### Package surface

1. Do **not** create a new `react-shiki/stream` subpath.
2. Export the streaming API from the existing entry points:
   - `react-shiki`
   - `react-shiki/web`
   - `react-shiki/core`
3. Keep the current static API unchanged:
   - `useShikiHighlighter`
   - `ShikiHighlighter`
4. Add a separate streaming API:
   - `useShikiStreamHighlighter`
   - `ShikiStreamHighlighter`
5. Also export a small low-level renderer:
   - `ShikiTokenRenderer`

### API shape

1. Do **not** add `outputFormat: 'tokens'` to the current static hook now.
2. Do **not** overload the existing static hook with streaming behavior.
3. Use a separate hook for streaming.
4. Do **not** accept a bare positional union like `string | ReadableStream<string>`.
5. Use a **discriminated input object** for streaming input.

Recommended input type:

```ts
type ShikiStreamInput =
  | {
      code: string
      isComplete?: boolean
    }
  | {
      stream: ReadableStream<string>
    }
  | {
      chunks: AsyncIterable<string>
    }
```

Rationale:

- `code` means a controlled, growing string from React state
- `stream` means a browser `ReadableStream<string>`
- `chunks` means an async iterable source
- this keeps one hook cohesive while making mode semantics explicit

### Rendering model

1. `useShikiStreamHighlighter` returns **token state**, not HTML/HAST.
2. `ShikiStreamHighlighter` composes the hook with a default token renderer.
3. `ShikiTokenRenderer` is the escape hatch for custom rendering.
4. Token-mode line numbers are implemented in the renderer, not via HAST transformers.
5. Do not attempt full feature parity with the static HAST/HTML path in v1.

### Dependency / integration model

1. Use `shiki-stream` for the streaming tokenization logic.
2. Do **not** re-export or depend on `shiki-stream/react` as the renderer implementation.
3. Build react-shiki's React renderer locally.
4. Reuse react-shiki's existing highlighter-loading architecture so bundle behavior stays consistent.

---

## Research basis

The plan above is grounded in the current code and docs:

1. The current package architecture already shares a single base hook across the existing entry points, while each entry point injects a different highlighter strategy:
   - `react-shiki` uses the full bundle
   - `react-shiki/web` uses the web bundle
   - `react-shiki/core` validates and uses a provided core highlighter
2. The current static hook is built around `codeToHtml(...)` and `codeToHast(...)`.
3. The current options builder is HAST-oriented and injects line numbers via a transformer.
4. `shiki-stream` is token-first and is designed around either:
   - a `ReadableStream<string>` piped through `CodeToTokenTransformStream`, or
   - a lower-level tokenizer that supports incremental `enqueue(chunk)`, `close()`, and `clear()`.
5. `shiki-stream` uses recall tokens to let consumers replace unstable trailing tokens for smoother streaming.
6. Shiki transformers span both token-level and HAST/HTML-level hooks, so a single transformer contract should not be assumed to mean the same thing in both APIs.
7. `shiki-stream/react` is not a good direct dependency surface for react-shiki because the current published package declares a React `^19.0.0` peer dependency.

---

## Public API proposal

### Existing exports remain

```ts
import {
  useShikiHighlighter,
  ShikiHighlighter,
} from 'react-shiki/web'
```

### New exports added to all three current entry points

```ts
import {
  useShikiStreamHighlighter,
  ShikiStreamHighlighter,
  ShikiTokenRenderer,
} from 'react-shiki/web'
```

Same surface should exist in:

- `react-shiki`
- `react-shiki/web`
- `react-shiki/core`

### Hook types

```ts
export type ShikiStreamInput =
  | {
      code: string
      isComplete?: boolean
    }
  | {
      stream: ReadableStream<string>
    }
  | {
      chunks: AsyncIterable<string>
    }

export interface StreamHighlighterOptions extends SharedReactShikiOptions {
  allowRecalls?: boolean
  batch?: 'sync' | 'raf' | number
  showLineNumbers?: boolean
  startingLineNumber?: number
  transformers?: TokenCompatibleShikiTransformer[]
  onStreamStart?: () => void
  onStreamEnd?: () => void
}

export interface UseShikiStreamHighlighterResult {
  tokens: ThemedToken[]
  status: 'idle' | 'streaming' | 'done' | 'error'
  error: unknown | null
  reset: () => void
}

export type UseShikiStreamHighlighter = (
  input: ShikiStreamInput,
  lang: Language,
  theme: Theme | Themes,
  options?: StreamHighlighterOptions,
) => UseShikiStreamHighlighterResult
```

### Component types

```ts
export interface ShikiStreamHighlighterProps {
  input: ShikiStreamInput
  language: Language
  theme: Theme | Themes
  options?: StreamHighlighterOptions
  className?: string
  style?: React.CSSProperties
  showLanguage?: boolean
}

export interface ShikiTokenRendererProps {
  tokens: ThemedToken[]
  className?: string
  style?: React.CSSProperties
  showLineNumbers?: boolean
  startingLineNumber?: number
}
```

### Example usage: controlled growing string

```tsx
const { tokens, status } = useShikiStreamHighlighter(
  {
    code,
    isComplete,
  },
  'ts',
  { light: 'github-light', dark: 'github-dark' },
  {
    allowRecalls: true,
    batch: 'raf',
    showLineNumbers: true,
  },
)

return <ShikiTokenRenderer tokens={tokens} showLineNumbers />
```

### Example usage: ergonomic component path

```tsx
<ShikiStreamHighlighter
  input={{ code, isComplete }}
  language="ts"
  theme={{ light: 'github-light', dark: 'github-dark' }}
  options={{ allowRecalls: true, batch: 'raf' }}
/>
```

### Example usage: stream path

```tsx
<ShikiStreamHighlighter
  input={{ stream: textStream }}
  language="ts"
  theme="github-dark"
  options={{ allowRecalls: true }}
/>
```

---

## Architectural plan

### 1. Split shared runtime concerns from render-mode concerns

Refactor the current base implementation into three layers.

#### Layer A: shared runtime / highlighter resolution

Responsibilities:

- resolve language
- resolve theme
- select or create the highlighter
- preserve full/web/core entry point semantics
- preload embedded languages
- expose a shared internal runtime object to both static and streaming hooks

This layer should remain bundle-aware and should continue to be driven by the entry point's highlighter factory.

#### Layer B: mode-specific option builders

Split the current HAST-oriented option builder into:

- `buildStaticShikiOptions(...)`
- `buildStreamShikiOptions(...)`

The existing `buildShikiOptions(...)` is HAST-oriented and should become the static builder.

Streaming options must not be typed as if every HAST/HTML transformer hook is valid.

#### Layer C: mode-specific render/consume adapters

- static adapter:
  - `codeToHtml(...)`
  - `codeToHast(...)` -> React nodes
- stream adapter:
  - normalize input into append/reset/finish events
  - feed `shiki-stream`
  - maintain token state
  - render tokens via `ShikiTokenRenderer`

---

## Internal normalization plan

### Core principle

Do not normalize everything to a `ReadableStream<string>`.

Normalize everything to a small internal event protocol:

```ts
type NormalizedStreamSink = {
  append: (chunk: string) => void | Promise<void>
  finish: () => void | Promise<void>
  reset: () => void | Promise<void>
  error: (error: unknown) => void | Promise<void>
}
```

Then add small adapters for each input mode.

### Adapter: `{ code, isComplete }`

This is the primary React chat-app path.

Behavior:

- track previous code string
- if `nextCode.startsWith(prevCode)`, append only the suffix
- if not append-only, call `reset()` and replay the full current string
- if `isComplete === true`, call `finish()` once

Example:

```ts
prev = 'const a'
next = 'const ab'
```

Append only `'b'`.

But if:

```ts
prev = 'const ab'
next = 'let x'
```

Reset, then replay `'let x'`.

This gives the common chat case a fast incremental path, while preserving correctness when content is replaced.

### Adapter: `{ stream }`

Behavior:

- create a reader
- read chunks
- `append(chunk)` for each chunk
- `finish()` when the stream ends
- `error(e)` on failure
- cancel any active reader on cleanup / input change

### Adapter: `{ chunks }`

Behavior:

- iterate with `for await`
- `append(chunk)` for each chunk
- `finish()` at the end
- `error(e)` on failure
- stop work on unmount / input change

---

## Streaming engine plan

### Recommendation

Use `shiki-stream`'s lower-level tokenizer internally for the hook implementation.

Why:

- it naturally supports append-based updates for the `code` mode
- it avoids forcing a browser stream abstraction for normal React state usage
- it maps directly to the normalization protocol
- it still uses the same streaming tokenization model as `shiki-stream`

### Internal token engine wrapper

Create an internal wrapper that owns:

- a `ShikiStreamTokenizer`
- current rendered token list
- status lifecycle
- batching behavior
- recall application

Suggested internal interface:

```ts
interface InternalStreamSession {
  append(chunk: string): Promise<void>
  finish(): void
  reset(): void
  destroy(): void
}
```

### Recall handling

If `allowRecalls` is enabled:

- apply recall counts by slicing tokens from the end
- append unstable tokens immediately according to the chosen batching strategy

If `allowRecalls` is disabled:

- render stable tokens only during enqueue
- flush the final unstable tail on `finish()` / `close()`

### Default

Default `allowRecalls` to `true` for the React streaming hook and component.

Reason:

- it gives the smoother, more responsive LLM streaming experience
- it matches the primary use case being targeted

---

## Batching strategy

The example React renderer in shiki-stream updates React state for every incoming token or recall. For react-shiki, batch state commits to reduce render pressure.

Support these options:

```ts
batch?: 'sync' | 'raf' | number
```

Semantics:

- `'sync'`: commit immediately after each append/recall application
- `'raf'`: commit once per animation frame
- `number`: debounce / throttle commits to once per N milliseconds

Recommended default:

```ts
batch: 'raf'
```

This should keep chat rendering responsive without re-rendering on every token.

---

## Token renderer plan

### Scope

Ship a very small renderer primitive only.

`ShikiTokenRenderer` should:

- render `<pre><code>`
- render each token as `<span>`
- use `token.htmlStyle` or Shiki's token style object helper
- optionally group tokens into lines for line numbers
- avoid adding a second large rendering system to the package

### Line-number strategy in token mode

Do not reuse the current HAST transformer approach.

Instead:

1. split tokens into visual lines by `\n` token content
2. render each line in a wrapper span/div
3. inject line numbers in the renderer using `startingLineNumber`
4. keep markup/classes close to the current static output where practical

This keeps line numbers working in stream mode without pretending HAST transforms still apply.

### Styling / markup goals

Default markup can be simple and stable:

```html
<pre class="shiki shiki-stream">
  <code>
    <span>...</span>
  </code>
</pre>
```

If line numbers are enabled, add a line wrapper structure that remains CSS-friendly.

---

## Transformer strategy

### Problem

Shiki transformer hooks are not all equivalent across static HAST/HTML and token-based streaming.

Token-friendly hooks include token-stage behavior.

HAST/HTML hooks include behaviors like:

- `span`
- `line`
- `code`
- `pre`
- `root`
- `postprocess`

Those do not map cleanly to the stream/token renderer.

### Plan

Split the option types.

#### Static path

Keep existing transformer semantics for `useShikiHighlighter`.

#### Stream path

Only accept token-compatible transformer types in `StreamHighlighterOptions`.

If that type split is hard to express cleanly in the first pass, do this as an interim compromise:

- allow the property name `transformers`
- document and type-narrow it to token-safe hooks only for stream mode
- explicitly reject or ignore HAST-only hooks in development with a warning

### Recommendation for v1

Prefer explicit type separation over silent partial support.

---

## Bundle behavior and entry point behavior

### Required outcome

Streaming support must preserve the existing bundle strategy.

#### `react-shiki`

- full bundle behavior remains intact
- new stream hook/component use the full-bundle highlighter factory

#### `react-shiki/web`

- web bundle behavior remains intact
- new stream hook/component use the web-bundle highlighter factory

#### `react-shiki/core`

- requires a provided highlighter as today
- new stream hook/component use the validated provided highlighter

### Important rule

The rendering mode must not bypass bundle selection.

That means the highlighter acquisition path remains shared and entry-point-driven.

---

## Suggested file / module refactor

Current code is centered on a static `lib/hook.ts` and HAST-oriented `lib/options.ts`.

Refactor toward this shape:

```text
package/src/
  index.ts
  web.ts
  core.ts
  lib/
    runtime.ts
    static-hook.ts
    stream-hook.ts
    static-options.ts
    stream-options.ts
    stream-input.ts
    stream-session.ts
    token-renderer.tsx
    stream-component.tsx
    component.tsx
    types.ts
    stream-types.ts
    language.ts
    theme.ts
    utils.ts
```

### Minimum viable refactor

If a larger move is undesirable, keep filenames flatter but still separate concerns:

- `lib/hook.ts` -> static hook only
- add `lib/stream-hook.ts`
- split `lib/options.ts` into static + stream builders
- add `lib/token-renderer.tsx`
- add `lib/stream-component.tsx`
- extend `lib/types.ts` or add `lib/stream-types.ts`

---

## Step-by-step implementation tasks

### Phase 1: type and architecture groundwork

1. Add stream-specific public types.
2. Split shared vs static vs stream option types.
3. Extract shared highlighter-resolution runtime from the current hook.
4. Keep the current static public API behavior unchanged.

Deliverables:

- shared runtime helper
- static options builder
- stream options builder
- new public stream types

### Phase 2: streaming input normalization

1. Implement input discrimination for:
   - `{ code, isComplete? }`
   - `{ stream }`
   - `{ chunks }`
2. Implement append/reset/finish normalization protocol.
3. Add cancellation and cleanup behavior.
4. Add tests for append-only and non-append updates.

Deliverables:

- normalized input adapters
- source lifecycle management
- cleanup on unmount / input change

### Phase 3: stream session and token state

1. Create an internal stream session backed by `shiki-stream`.
2. Implement recall handling.
3. Implement batching strategies.
4. Expose hook result state:
   - `tokens`
   - `status`
   - `error`
   - `reset`
5. Add completion semantics for `isComplete`.

Deliverables:

- working `useShikiStreamHighlighter`
- stable token accumulation
- recall handling and reset logic

### Phase 4: renderer and component

1. Build `ShikiTokenRenderer`.
2. Add token grouping by line.
3. Add line number rendering.
4. Build `ShikiStreamHighlighter` as hook + renderer composition.
5. Keep markup and classes aligned with current package style where practical.

Deliverables:

- default renderer
- ergonomic component
- line numbers in stream mode

### Phase 5: entry point export wiring

1. Export stream hook/component/renderer from `index.ts`.
2. Export same from `web.ts`.
3. Export same from `core.ts`.
4. Ensure each entry point uses its existing highlighter strategy.

Deliverables:

- no new subpath
- cohesive package surface
- preserved bundle semantics

### Phase 6: docs and examples

1. Add docs for controlled growing-string usage.
2. Add docs for `ReadableStream<string>` usage.
3. Add docs for `AsyncIterable<string>` usage.
4. Add docs for custom rendering with `ShikiTokenRenderer`.
5. Add docs for stream-specific limitations vs static mode.

Deliverables:

- README / docs updates
- migration guidance
- realistic chat-app examples

---

## Testing plan

### Unit tests

#### Static regression coverage

- existing `useShikiHighlighter` behavior remains unchanged
- existing line number behavior in static mode remains unchanged
- existing bundle-specific behavior remains unchanged

#### Stream input normalization

- append-only string update appends suffix only
- non-append string update resets and replays
- `isComplete` flushes final unstable content when needed
- `ReadableStream<string>` is consumed correctly
- `AsyncIterable<string>` is consumed correctly
- cleanup cancels old source when input changes

#### Recall behavior

- recall slices the correct number of tokens
- stable and unstable tokens are combined correctly
- finish flushes the remaining unstable tokens when recalls are disabled

#### Renderer

- tokens render with correct content and style
- newline splitting creates correct line boundaries
- line numbers render starting from the requested base
- empty input renders safely

#### Batching

- `'sync'` commits immediately
- `'raf'` coalesces multiple updates into one frame commit
- numeric batch value coalesces correctly

### Integration tests

- `react-shiki` stream path uses full bundle behavior
- `react-shiki/web` stream path uses web bundle behavior
- `react-shiki/core` stream path requires and uses provided highlighter
- multi-theme still resolves correctly in stream mode if supported by tokens/style path

### Manual test scenarios

1. LLM chat block that grows character-by-character.
2. LLM chat block that updates in chunks.
3. Code that changes tokenization based on later context.
4. Stream interrupted mid-block.
5. Code replaced entirely after a retry/regeneration.
6. Long code block with many updates.
7. Line numbers on and off.
8. Light/dark multi-theme rendering.

---

## Edge cases to handle explicitly

1. **Source replacement**
   - if the input switches from one source to another, destroy the old session and start fresh
2. **Append detection false case**
   - any non-prefix string update must force a reset
3. **Double completion**
   - `finish()` should be idempotent
4. **Unmount during stream consumption**
   - cancel active readers / stop async iteration / avoid stale state commits
5. **Errors during tokenization**
   - surface via `status: 'error'` and `error`
6. **Empty code**
   - return empty token state cleanly
7. **Very frequent updates**
   - batching must prevent render thrash
8. **Option changes mid-stream**
   - language/theme/highlighter-relevant option changes should reset and rebuild the stream session
9. **Unsupported HAST-only stream transformers**
   - reject or warn clearly in development

---

## Non-goals for v1

1. No static token output API.
2. No `outputFormat: 'tokens'` on `useShikiHighlighter`.
3. No attempt to make every static transformer hook work in stream mode.
4. No dependency on `shiki-stream/react`.
5. No giant parallel renderer abstraction.
6. No promise of perfect feature parity between static and stream paths in the first release.

---

## Acceptance criteria

The implementation is complete when all of the following are true:

1. Users can import `useShikiStreamHighlighter`, `ShikiStreamHighlighter`, and `ShikiTokenRenderer` from all current entry points.
2. The current static API remains source-compatible.
3. Stream mode works with:
   - controlled growing strings
   - `ReadableStream<string>`
   - `AsyncIterable<string>`
4. Streaming uses the existing entry-point bundle strategy and does not bypass it.
5. The stream hook returns token state and exposes lifecycle status.
6. The component provides an ergonomic default path.
7. Line numbers work in stream mode.
8. Non-append string updates reset correctly.
9. Recall handling produces visibly smooth incremental highlighting.
10. React render pressure is controlled via batching.
11. Docs clearly explain the difference between static and stream APIs.
12. Stream transformer support is clearly scoped and typed.

---

## Recommended implementation order for the local agent

1. Extract shared runtime from the current static hook.
2. Add stream-specific types.
3. Implement the normalized input adapters.
4. Wrap `shiki-stream` tokenizer in an internal stream session.
5. Build `useShikiStreamHighlighter`.
6. Build `ShikiTokenRenderer`.
7. Build `ShikiStreamHighlighter`.
8. Wire exports into `index.ts`, `web.ts`, and `core.ts`.
9. Add tests for append-only, reset, recall, finish, and renderer behavior.
10. Add docs and examples.

---

## Notes for the local agent

- Preserve the current public static API exactly unless a change is strictly required.
- Do not introduce a new subpath for stream mode.
- Keep the highlighter factory injection model intact so bundle behavior stays correct.
- Treat `code` input as the primary DX path for chat apps.
- Do not accept an ambiguous positional union for input.
- Keep the default renderer intentionally small.
- Keep token-mode responsibilities focused on rendering and stream consumption, not on recreating the entire static feature surface.

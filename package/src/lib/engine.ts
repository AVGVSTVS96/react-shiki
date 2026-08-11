import type { Awaitable, RegexEngine } from 'shiki/core';
import type { EngineName } from './types';

const engines = new Map<EngineName, Promise<RegexEngine>>();

// Dynamic imports keep unused engines out of the loaded graph: naming an
// engine loads only that engine, and 'javascript' never fetches the wasm.
const loaders: Record<EngineName, () => Promise<RegexEngine>> = {
  javascript: () =>
    import('shiki/engine/javascript').then((m) =>
      m.createJavaScriptRegexEngine()
    ),
  oniguruma: () =>
    import('shiki/engine/oniguruma').then((m) =>
      m.createOnigurumaEngine(import('shiki/wasm'))
    ),
};

/**
 * Resolves a named engine to a lazily created, cached instance.
 * Engine instances and undefined pass through untouched.
 *
 * The cache makes named engines referentially stable across renders and
 * call sites, unlike inline `createJavaScriptRegexEngine()` calls.
 */
export const resolveEngine = (
  engine: EngineName | Awaitable<RegexEngine> | undefined
): Awaitable<RegexEngine> | undefined => {
  if (typeof engine !== 'string') return engine;

  const load = loaders[engine];
  if (!load) {
    throw new Error(
      `[react-shiki] unknown engine '${engine}', expected 'javascript' or 'oniguruma'`
    );
  }

  const cached = engines.get(engine);
  if (cached) return cached;

  const instance = load();
  // Evict rejected loads (e.g. transient wasm fetch failure) so the
  // next highlight retries instead of reusing the cached rejection.
  instance.catch(() => engines.delete(engine));
  engines.set(engine, instance);
  return instance;
};

import type { Awaitable, RegexEngine } from 'shiki/core';
import type { EngineName } from './types';

const engines = new Map<EngineName, Awaitable<RegexEngine>>();

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

  let instance = engines.get(engine);
  if (!instance) {
    instance = load();
    engines.set(engine, instance);
  }
  return instance;
};

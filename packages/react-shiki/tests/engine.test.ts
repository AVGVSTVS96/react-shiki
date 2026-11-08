import { describe, expect, vi, it } from 'vitest';
import { resolveEngine } from '../src/lib/engine';
import type { EngineName } from '../src/lib/types';
import { outOfType } from './fakes';

const trap = (name: string) => () => {
  throw new Error(`${name} should not be imported for 'javascript'`);
};

describe(resolveEngine, () => {
  it('returns a stable cached instance for named engines', async () => {
    const first = resolveEngine('javascript');
    const second = resolveEngine('javascript');

    expect(first).toBeDefined();
    expect(second).toBe(first);

    const engine = await first;
    expect(engine).toHaveProperty('createScanner');
  });

  it('resolves oniguruma to a distinct cached engine', async () => {
    const first = resolveEngine('oniguruma');
    expect(resolveEngine('oniguruma')).toBe(first);
    expect(first).not.toBe(resolveEngine('javascript'));

    const engine = await first;
    expect(engine).toHaveProperty('createScanner');
  });

  it('passes engine instances and undefined through untouched', async () => {
    expect(resolveEngine(undefined)).toBeUndefined();

    const custom = await resolveEngine('javascript');
    expect(resolveEngine(custom)).toBe(custom);
  });

  it('throws on unknown engine names', () => {
    expect(() => {
      void resolveEngine(outOfType<EngineName>('typo'));
    }).toThrow(/unknown engine 'typo'/u);
  });

  it("resolving 'javascript' never loads the oniguruma or wasm modules", async () => {
    vi.resetModules();

    // oxlint-disable-next-line anti-slop/no-module-mocking -- proves the oniguruma engine module is never imported
    vi.doMock(
      import('shiki/engine/oniguruma'),
      trap('shiki/engine/oniguruma')
    );
    // oxlint-disable-next-line anti-slop/no-module-mocking -- proves the wasm module is never imported
    vi.doMock(import('shiki/wasm'), trap('shiki/wasm'));

    try {
      const { resolveEngine: resolve } =
        await import('../src/lib/engine');

      const engine = await resolve('javascript');
      expect(engine).toHaveProperty('createScanner');
    } finally {
      vi.doUnmock('shiki/engine/oniguruma');
      vi.doUnmock('shiki/wasm');
      vi.resetModules();
    }
  });

  it('evicts rejected loads so the next call retries', async () => {
    vi.resetModules();
    let calls = 0;

    // oxlint-disable-next-line anti-slop/no-module-mocking -- the engine loader is a module-internal dynamic import, so failing that import is the only way in
    vi.doMock(
      import('shiki/engine/javascript'),
      async (importOriginal) => {
        const original = await importOriginal();

        return {
          ...original,
          createJavaScriptRegexEngine: (options) => {
            calls += 1;

            if (calls === 1) {
              throw new Error('transient load failure');
            }

            return original.createJavaScriptRegexEngine(options);
          },
        };
      }
    );

    try {
      const { resolveEngine: resolve } =
        await import('../src/lib/engine');

      await expect(resolve('javascript')).rejects.toThrow(
        'transient load failure'
      );

      const engine = await resolve('javascript');
      expect(engine).toHaveProperty('createScanner');
      expect(calls).toBe(2);
    } finally {
      vi.doUnmock('shiki/engine/javascript');
      vi.resetModules();
    }
  });
});

import { describe, test, expect, vi } from 'vitest';
import { resolveEngine } from '../src/lib/engine';

describe('resolveEngine', () => {
  test('returns a stable cached instance for named engines', async () => {
    const first = resolveEngine('javascript');
    const second = resolveEngine('javascript');

    expect(first).toBeDefined();
    expect(second).toBe(first);

    const engine = await first;
    expect(engine).toHaveProperty('createScanner');
  });

  test('resolves oniguruma to a distinct cached engine', async () => {
    const first = resolveEngine('oniguruma');
    expect(resolveEngine('oniguruma')).toBe(first);
    expect(first).not.toBe(resolveEngine('javascript'));

    const engine = await first;
    expect(engine).toHaveProperty('createScanner');
  });

  test('passes engine instances and undefined through untouched', async () => {
    expect(resolveEngine(undefined)).toBeUndefined();

    const custom = await resolveEngine('javascript');
    expect(resolveEngine(custom)).toBe(custom);
  });

  test('throws on unknown engine names', () => {
    expect(() => resolveEngine('typo' as never)).toThrow(
      /unknown engine 'typo'/
    );
  });

  test("resolving 'javascript' never loads the oniguruma or wasm modules", async () => {
    vi.resetModules();
    const trap = (name: string) => () => {
      throw new Error(`${name} should not be imported for 'javascript'`);
    };
    vi.doMock('shiki/engine/oniguruma', trap('shiki/engine/oniguruma'));
    vi.doMock('shiki/wasm', trap('shiki/wasm'));

    try {
      const { resolveEngine: resolve } = await import('../src/lib/engine');
      const engine = await resolve('javascript');
      expect(engine).toHaveProperty('createScanner');
    } finally {
      vi.doUnmock('shiki/engine/oniguruma');
      vi.doUnmock('shiki/wasm');
      vi.resetModules();
    }
  });

  test('evicts rejected loads so the next call retries', async () => {
    vi.resetModules();
    let calls = 0;
    vi.doMock('shiki/engine/javascript', () => ({
      createJavaScriptRegexEngine: () => {
        if (++calls === 1) throw new Error('transient load failure');
        return { createScanner: () => null };
      },
    }));

    try {
      const { resolveEngine: resolve } = await import('../src/lib/engine');

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

import { describe, test, expect } from 'vitest';
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
});

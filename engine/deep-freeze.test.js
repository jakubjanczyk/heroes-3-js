import { describe, expect, test } from 'vitest';

import { deepFreeze } from './deep-freeze.js';

describe('deep freeze', () => {
  test('freezes nested objects and arrays', () => {
    const value = { list: [{ tile: { x: 1, y: 2 } }], meta: { id: 'demo' } };

    const frozen = deepFreeze(value);

    expect(frozen).toBe(value);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.list)).toBe(true);
    expect(Object.isFrozen(value.list[0].tile)).toBe(true);
    expect(Object.isFrozen(value.meta)).toBe(true);
  });

  test('passes primitives and functions through', () => {
    const fn = () => 1;

    expect(deepFreeze(3)).toBe(3);
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze({ fn }).fn()).toBe(1);
  });
});

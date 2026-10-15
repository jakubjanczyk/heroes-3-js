import { describe, expect, test } from 'vitest';

import { NO_REMOVED_ENTITIES, applyEntityRemoved } from './removed-entities.js';

describe('removed entities', () => {
  test('adds removed ids without changing the previous set', () => {
    const next = applyEntityRemoved(NO_REMOVED_ENTITIES, 'monster-1');

    expect([...next]).toEqual(['monster-1']);
    expect(NO_REMOVED_ENTITIES.size).toBe(0);
  });

  test('ignores repeats and invalid ids', () => {
    const removed = applyEntityRemoved(NO_REMOVED_ENTITIES, 'monster-1');

    expect(applyEntityRemoved(removed, 'monster-1')).toBe(removed);
    expect(applyEntityRemoved(removed, '')).toBe(removed);
    expect(applyEntityRemoved(removed, undefined)).toBe(removed);
  });
});

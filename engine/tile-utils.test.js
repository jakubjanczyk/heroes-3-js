import { describe, expect, test } from 'vitest';

import { sameTile, tileKey } from './tile-utils.js';

describe('tile utils', () => {
  test('sameTile compares x and y and handles null-safe checks', () => {
    expect(sameTile({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(sameTile({ x: 1, y: 2 }, { x: 1, y: 3 })).toBe(false);
    expect(sameTile(null, { x: 1, y: 2 })).toBe(false);
    expect(sameTile({ x: 1, y: 2 }, null)).toBe(false);
  });

  test('tileKey serializes coordinates in x,y format', () => {
    expect(tileKey({ x: 3, y: 4 })).toBe('3,4');
  });
});

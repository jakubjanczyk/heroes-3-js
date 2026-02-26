import { describe, expect, test } from 'vitest';

import { sameTile } from './tile-utils.js';

describe('tile utils', () => {
  test('sameTile compares x and y coordinates safely', () => {
    expect(sameTile({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(sameTile({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
    expect(sameTile(null, { x: 1, y: 2 })).toBe(false);
  });
});

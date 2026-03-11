import { describe, expect, test } from 'vitest';

import { listModuleMetadata } from './register-modules.js';

describe('register-modules metadata', () => {
  test('returns module metadata with unique ids', () => {
    const metadata = listModuleMetadata();

    expect(metadata.length).toBeGreaterThan(0);
    expect(new Set(metadata.map((entry) => entry.id)).size).toBe(metadata.length);

    for (const entry of metadata) {
      expect(typeof entry.id).toBe('string');
      expect(entry.id.length).toBeGreaterThan(0);
      expect(['domain', 'view']).toContain(entry.phase);
      expect(Array.isArray(entry.consumes)).toBe(true);
      expect(Array.isArray(entry.produces)).toBe(true);
    }
  });
});

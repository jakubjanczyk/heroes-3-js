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

  test('orders metadata by phase with domain before view', () => {
    const metadata = listModuleMetadata();
    const phaseSequence = metadata.map((entry) => entry.phase);
    const firstViewIndex = phaseSequence.indexOf('view');

    expect(firstViewIndex).toBeGreaterThan(-1);
    expect(phaseSequence.slice(0, firstViewIndex).every((phase) => phase === 'domain')).toBe(true);
    expect(phaseSequence.slice(firstViewIndex).every((phase) => phase === 'view')).toBe(true);
  });
});

import { describe, expect, test } from 'vitest';

import { getSessionDbName } from './session-db-name.js';

describe('session db name', () => {
  test('uses the default name for the main site and local dev', () => {
    expect(getSessionDbName('/heroes-3-js/')).toBe('heroes-3-js');
    expect(getSessionDbName('/')).toBe('heroes-3-js');
  });

  test('scopes the name per PR preview so previews do not share saves', () => {
    expect(getSessionDbName('/heroes-3-js/pr-preview/pr-12/')).toBe(
      'heroes-3-js/pr-preview/pr-12'
    );
    expect(getSessionDbName('/heroes-3-js/pr-preview/pr-12/index.html')).toBe(
      'heroes-3-js/pr-preview/pr-12'
    );
  });
});

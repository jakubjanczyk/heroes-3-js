// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { createBusDevPanel } from './bus-dev-panel.js';

describe('bus dev panel', () => {
  test('starts collapsed and toggles visibility', () => {
    const panel = createBusDevPanel({ document });

    const toggle = document.querySelector('.bus-dev-panel__toggle');
    const body = document.querySelector('.bus-dev-panel__body');
    expect(toggle).toBeTruthy();
    expect(body?.hidden).toBe(true);

    toggle?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(body?.hidden).toBe(false);
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');

    panel.destroy();
  });

  test('renders dispatched event rows with subscriber counts', () => {
    const panel = createBusDevPanel({ document, maxEntries: 2 });

    panel.log({ action: 'emit', type: 'command.tile.clicked', detail: { tile: { x: 1, y: 0 } }, subscribers: 3 });
    panel.log({ action: 'emit', type: 'command.move.requested', detail: { targetTile: { x: 2, y: 0 } }, subscribers: 1 });
    panel.log({ action: 'subscribe', type: 'ignored', subscribers: 2 });

    const rows = [...document.querySelectorAll('.bus-dev-panel__event')].map((item) => item.textContent);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('command.move.requested');
    expect(rows[0]).toContain('subscribers: 1');
    expect(rows[1]).toContain('command.tile.clicked');

    panel.destroy();
  });
});

// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import {
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerInteractionModalModule } from './interaction-modal.module.js';

describe('interaction modal module', () => {
  test('opens modal and closes it on OK button click', async () => {
    const bus = createFakeBus();
    document.body.innerHTML = '<div class="viewport"></div>';

    registerInteractionModalModule({
      bus,
      env: {
        document,
        window
      },
      config: {
        interactionModalTransitionMs: 0
      }
    });

    bus.emit(APP_UI_INTERACTION_MODAL_OPENED, {
      title: 'Interaction',
      message: 'Monster defeated'
    });

    const modal = document.querySelector('interaction-modal.interaction-modal--visible');
    expect(modal).toBeTruthy();
    expect(modal?.querySelector('.interaction-modal__message')?.textContent).toBe('Monster defeated');

    modal?.querySelector('.interaction-modal__ok-button')?.dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true })
    );
    await Promise.resolve();

    expect(document.querySelector('interaction-modal')).toBeFalsy();
    expect(bus.emitted).toContainEqual({
      type: APP_UI_INTERACTION_MODAL_CLOSED,
      detail: {}
    });
  });

  test('closes currently opened modal when Escape is pressed', async () => {
    const bus = createFakeBus();
    document.body.innerHTML = '<div class="viewport"></div>';

    registerInteractionModalModule({
      bus,
      env: {
        document,
        window
      },
      config: {
        interactionModalTransitionMs: 0
      }
    });

    bus.emit(APP_UI_INTERACTION_MODAL_OPENED, {
      title: 'Interaction',
      message: 'Monster defeated'
    });
    expect(document.querySelector('interaction-modal')).toBeTruthy();

    window.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    await Promise.resolve();

    expect(document.querySelector('interaction-modal')).toBeFalsy();
    expect(bus.emitted).toContainEqual({
      type: APP_UI_INTERACTION_MODAL_CLOSED,
      detail: {}
    });
  });
});

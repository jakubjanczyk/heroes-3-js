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

    const modalHost = document.querySelector('interaction-modal');
    const modal = modalHost?.querySelector('dialog.interaction-modal[open]');
    expect(modalHost).toBeTruthy();
    expect(modal).toBeTruthy();
    expect(modalHost?.querySelector('.interaction-modal__message')?.textContent).toBe('Monster defeated');

    modalHost?.querySelector('.interaction-modal__ok-button')?.dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true })
    );
    await Promise.resolve();

    expect(document.querySelector('interaction-modal')).toBeFalsy();
    expect(bus.emitted).toContainEqual({
      type: APP_UI_INTERACTION_MODAL_CLOSED,
      detail: {}
    });
  });

  test('keeps currently opened modal open when Escape is pressed', async () => {
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
    const modalHost = document.querySelector('interaction-modal');
    const modal = modalHost?.querySelector('dialog.interaction-modal');
    expect(modalHost).toBeTruthy();
    expect(modal).toBeTruthy();

    modal?.dispatchEvent(new window.Event('cancel', { bubbles: false, cancelable: true }));
    await Promise.resolve();

    expect(document.querySelector('interaction-modal')).toBeTruthy();
    expect(modalHost?.querySelector('dialog.interaction-modal[open]')).toBeTruthy();
    expect(bus.emitted).not.toContainEqual({
      type: APP_UI_INTERACTION_MODAL_CLOSED,
      detail: {}
    });
  });

  test('cleans up and emits close if the native dialog closes unexpectedly', async () => {
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

    const modalHost = document.querySelector('interaction-modal');
    const dialog = modalHost?.querySelector('dialog.interaction-modal');
    dialog?.removeAttribute('open');
    dialog?.dispatchEvent(new window.Event('close'));
    await Promise.resolve();

    expect(document.querySelector('interaction-modal')).toBeFalsy();
    expect(bus.emitted).toContainEqual({
      type: APP_UI_INTERACTION_MODAL_CLOSED,
      detail: {}
    });
  });

  test('keeps currently opened modal open when backdrop is clicked', async () => {
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

    const modalHost = document.querySelector('interaction-modal');
    const dialog = modalHost?.querySelector('dialog.interaction-modal');
    dialog?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(document.querySelector('interaction-modal')).toBeTruthy();
    expect(modalHost?.querySelector('dialog.interaction-modal[open]')).toBeTruthy();
    expect(bus.emitted).not.toContainEqual({
      type: APP_UI_INTERACTION_MODAL_CLOSED,
      detail: {}
    });
  });
});

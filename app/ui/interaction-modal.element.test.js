// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createInteractionModalElement,
  INTERACTION_MODAL_CLOSED_EVENT,
} from './interaction-modal.element.js';

function createModalElement({ transitionMs = 0 } = {}) {
  const modal = createInteractionModalElement({ document, transitionMs });
  document.body.appendChild(modal);
  return modal;
}

describe('interaction modal element', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('opens with title and message content', () => {
    const modal = createModalElement();

    modal.showInteraction({
      title: 'Battle',
      message: 'Monster defeated'
    });

    expect(modal.tagName.toLowerCase()).toBe('interaction-modal');
    expect(modal.querySelector('dialog.interaction-modal[open]')).toBeTruthy();
    expect(modal.querySelector('.interaction-modal__title')?.textContent).toBe('Battle');
    expect(modal.querySelector('.interaction-modal__message')?.textContent).toBe('Monster defeated');
    expect(modal.querySelector('.interaction-modal__ok-button')).toBeTruthy();
  });

  test('dispatches close event and removes itself when closing immediately', () => {
    const modal = createModalElement();
    const closedEvents = [];

    modal.addEventListener(INTERACTION_MODAL_CLOSED_EVENT, (event) => {
      closedEvents.push(event.type);
    });

    modal.showInteraction({ title: 'Battle', message: 'Monster defeated' });
    modal.closeInteraction();

    expect(closedEvents).toEqual([INTERACTION_MODAL_CLOSED_EVENT]);
    expect(document.querySelector('interaction-modal')).toBeFalsy();
  });

  test('waits for close transition before removal', () => {
    vi.useFakeTimers();
    const modal = createModalElement({ transitionMs: 60 });
    const closedEvents = [];

    modal.addEventListener(INTERACTION_MODAL_CLOSED_EVENT, (event) => {
      closedEvents.push(event.type);
    });

    modal.showInteraction({ title: 'Battle', message: 'Monster defeated' });
    modal.closeInteraction();

    expect(document.querySelector('interaction-modal')).toBeTruthy();
    expect(modal.querySelector('dialog.interaction-modal')?.dataset.state).toBe('closing');
    expect(closedEvents).toHaveLength(0);

    vi.advanceTimersByTime(60);

    expect(document.querySelector('interaction-modal')).toBeFalsy();
    expect(closedEvents).toEqual([INTERACTION_MODAL_CLOSED_EVENT]);
  });

  test('stays open on cancel when open', () => {
    const modal = createModalElement();

    modal.showInteraction({ title: 'Battle', message: 'Monster defeated' });
    modal.dispatchEvent(new window.Event('cancel', { bubbles: false, cancelable: true }));

    expect(document.querySelector('interaction-modal')).toBeTruthy();
    expect(modal.querySelector('dialog.interaction-modal[open]')).toBeTruthy();
  });

  test('renders a native dialog inside the custom element host', () => {
    const modal = createModalElement();

    expect(modal.tagName.toLowerCase()).toBe('interaction-modal');
    expect(modal.querySelector('dialog.interaction-modal')).toBeTruthy();
  });

  test('disables native Escape close requests on the dialog', () => {
    const modal = createModalElement();

    expect(modal.querySelector('dialog.interaction-modal')?.getAttribute('closedby')).toBe('none');
  });

  test('removes itself if the native dialog closes unexpectedly', () => {
    const modal = createModalElement();
    const closedEvents = [];

    modal.addEventListener(INTERACTION_MODAL_CLOSED_EVENT, (event) => {
      closedEvents.push(event.type);
    });

    modal.showInteraction({ title: 'Battle', message: 'Monster defeated' });
    const dialog = modal.querySelector('dialog.interaction-modal');
    dialog?.removeAttribute('open');
    dialog?.dispatchEvent(new window.Event('close'));

    expect(document.querySelector('interaction-modal')).toBeFalsy();
    expect(closedEvents).toEqual([INTERACTION_MODAL_CLOSED_EVENT]);
  });

  test('stays open when clicking the dialog backdrop', () => {
    const modal = createModalElement();

    modal.showInteraction({ title: 'Battle', message: 'Monster defeated' });
    modal.querySelector('dialog.interaction-modal')?.dispatchEvent(
      new window.MouseEvent('click', { bubbles: true, cancelable: true })
    );

    expect(document.querySelector('interaction-modal')).toBeTruthy();
    expect(modal.querySelector('dialog.interaction-modal[open]')).toBeTruthy();
  });

  test('blocks click propagation from modal root', () => {
    const clickEvents = [];
    const parent = document.createElement('div');
    parent.addEventListener('click', () => {
      clickEvents.push('click');
    });
    document.body.appendChild(parent);

    const modal = createModalElement();
    parent.appendChild(modal);

    modal.showInteraction({ title: 'Battle', message: 'Monster defeated' });
    modal.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(clickEvents).toHaveLength(0);
  });
});

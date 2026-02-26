// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  ensureInteractionModalElement,
  INTERACTION_MODAL_CLOSED_EVENT,
  INTERACTION_MODAL_TAG_NAME
} from './interaction-modal.element.js';

function createModalElement({ transitionMs = 0 } = {}) {
  ensureInteractionModalElement(window);
  const modal = document.createElement(INTERACTION_MODAL_TAG_NAME);
  modal.transitionMs = transitionMs;
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

    modal.open({
      title: 'Battle',
      message: 'Monster defeated'
    });

    expect(modal.className).toBe('interaction-modal interaction-modal--visible');
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

    modal.open({ title: 'Battle', message: 'Monster defeated' });
    modal.close();

    expect(closedEvents).toEqual([INTERACTION_MODAL_CLOSED_EVENT]);
    expect(document.querySelector(INTERACTION_MODAL_TAG_NAME)).toBeFalsy();
  });

  test('waits for close transition before removal', () => {
    vi.useFakeTimers();
    const modal = createModalElement({ transitionMs: 60 });
    const closedEvents = [];

    modal.addEventListener(INTERACTION_MODAL_CLOSED_EVENT, (event) => {
      closedEvents.push(event.type);
    });

    modal.open({ title: 'Battle', message: 'Monster defeated' });
    modal.close();

    expect(document.querySelector(INTERACTION_MODAL_TAG_NAME)).toBeTruthy();
    expect(modal.className).toBe('interaction-modal');
    expect(closedEvents).toHaveLength(0);

    vi.advanceTimersByTime(60);

    expect(document.querySelector(INTERACTION_MODAL_TAG_NAME)).toBeFalsy();
    expect(closedEvents).toEqual([INTERACTION_MODAL_CLOSED_EVENT]);
  });

  test('closes on Escape key when open', () => {
    const modal = createModalElement();

    modal.open({ title: 'Battle', message: 'Monster defeated' });
    window.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );

    expect(document.querySelector(INTERACTION_MODAL_TAG_NAME)).toBeFalsy();
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

    modal.open({ title: 'Battle', message: 'Monster defeated' });
    modal.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(clickEvents).toHaveLength(0);
  });
});

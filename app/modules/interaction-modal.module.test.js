import { describe, expect, test } from 'vitest';

import {
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerInteractionModalModule } from './interaction-modal.module.js';

function createFakeElement(tagName) {
  const listeners = new Map();

  return {
    tagName,
    className: '',
    textContent: '',
    children: [],
    attributes: {},
    parentElement: null,
    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
    },
    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
      child.parentElement = null;
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    trigger(type, event = {}) {
      const payload = {
        stopPropagation() {},
        preventDefault() {},
        ...event
      };
      listeners.get(type)?.(payload);
    }
  };
}

describe('interaction modal module', () => {
  test('opens modal and closes it on OK button click', () => {
    const bus = createFakeBus();
    const viewport = createFakeElement('div');

    registerInteractionModalModule({
      bus,
      env: {
        document: {
          querySelector(selector) {
            return selector === '.viewport' ? viewport : null;
          },
          createElement(tagName) {
            return createFakeElement(tagName);
          }
        },
        window: {
          addEventListener() {},
          removeEventListener() {}
        }
      },
      config: {
        interactionModalTransitionMs: 0
      }
    });

    bus.emit(APP_UI_INTERACTION_MODAL_OPENED, {
      title: 'Interaction',
      message: 'Monster defeated'
    });

    expect(viewport.children).toHaveLength(1);
    const root = viewport.children[0];
    const dialog = root.children[0];
    const message = dialog.children[1];
    const okButton = dialog.children[2].children[0];

    expect(root.className).toBe('interaction-modal interaction-modal--visible');
    expect(message.textContent).toBe('Monster defeated');

    okButton.trigger('click');

    expect(viewport.children).toHaveLength(0);
    expect(bus.emitted).toContainEqual({
      type: APP_UI_INTERACTION_MODAL_CLOSED,
      detail: {}
    });
  });

  test('closes currently opened modal when Escape is pressed', () => {
    const bus = createFakeBus();
    const viewport = createFakeElement('div');
    const windowListeners = new Map();

    registerInteractionModalModule({
      bus,
      env: {
        document: {
          querySelector(selector) {
            return selector === '.viewport' ? viewport : null;
          },
          createElement(tagName) {
            return createFakeElement(tagName);
          }
        },
        window: {
          addEventListener(type, handler) {
            windowListeners.set(type, handler);
          },
          removeEventListener(type) {
            windowListeners.delete(type);
          }
        }
      },
      config: {
        interactionModalTransitionMs: 0
      }
    });

    bus.emit(APP_UI_INTERACTION_MODAL_OPENED, {
      title: 'Interaction',
      message: 'Monster defeated'
    });
    expect(viewport.children).toHaveLength(1);

    windowListeners.get('keydown')?.({
      key: 'Escape',
      stopPropagation() {},
      preventDefault() {}
    });

    expect(viewport.children).toHaveLength(0);
    expect(bus.emitted).toContainEqual({
      type: APP_UI_INTERACTION_MODAL_CLOSED,
      detail: {}
    });
  });
});

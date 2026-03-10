import { describe, expect, test } from 'vitest';

import { clearLayerContainer, getLayerElementFactory, setStyleVar } from './dom-layer-utils.js';

describe('dom layer utils', () => {
  test('clears children using children-array fallback', () => {
    const container = {
      children: [{}, {}, {}]
    };

    clearLayerContainer(container);

    expect(container.children).toHaveLength(0);
  });

  test('clears children using replaceChildren when available', () => {
    let called = false;
    const container = {
      children: [{}, {}, {}],
      replaceChildren() {
        called = true;
        this.children = [];
      }
    };

    clearLayerContainer(container);

    expect(called).toBe(true);
    expect(container.children).toHaveLength(0);
  });

  test('returns provided element factory unchanged', () => {
    const createElement = (tagName) => ({ tagName, via: 'custom' });
    const factory = getLayerElementFactory(createElement);

    expect(factory).toBe(createElement);
    expect(factory('div')).toEqual({ tagName: 'div', via: 'custom' });
  });

  test('sets style property when element style is available', () => {
    const style = {
      setProperty(name, value) {
        this[name] = value;
      }
    };
    const element = { style };

    setStyleVar(element, '--foo', 'bar');

    expect(style['--foo']).toBe('bar');
  });
});

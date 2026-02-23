import { describe, expect, test } from 'vitest';

import { createMap } from '../map.js';
import { renderPathPreviewLayer } from './path-preview-layer.js';

function createFakeElement(tagName) {
  return {
    tagName,
    className: '',
    style: {},
    dataset: {},
    attributes: {},
    children: [],
    appendChild(child) {
      this.children.push(child);
    },
    setAttribute(key, value) {
      this.attributes[key] = String(value);
    },
    replaceChildren() {
      this.children = [];
    }
  };
}

function getNodeClass(node) {
  return node.className || node.attributes.class || '';
}

describe('path preview layer', () => {
  test('renders svg path and target marker for preview path', () => {
    const container = createFakeElement('div');
    container.clientWidth = 1000;
    container.clientHeight = 700;
    const map = createMap({
      width: 3,
      height: 3,
      tiles: new Array(9).fill(0)
    });

    renderPathPreviewLayer({
      container,
      map,
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 }
      ],
      createElement: createFakeElement
    });

    expect(container.children).toHaveLength(1);
    const svg = container.children[0];
    expect(getNodeClass(svg)).toBe('path-preview-svg');
    const childClasses = svg.children.map((child) => getNodeClass(child));
    expect(childClasses).toContain('path-preview-dash');
    expect(childClasses).toContain('path-preview-target');
    expect(childClasses.filter((value) => value === 'path-preview-dash')).toHaveLength(1);
  });

  test('clears preview when path and target are absent', () => {
    const container = createFakeElement('div');
    container.clientWidth = 1000;
    container.clientHeight = 700;
    const map = createMap({
      width: 2,
      height: 2,
      tiles: new Array(4).fill(0)
    });
    container.children = [createFakeElement('svg')];

    renderPathPreviewLayer({
      container,
      map,
      path: null,
      targetTile: null,
      createElement: createFakeElement
    });

    expect(container.children).toHaveLength(0);
  });

  test('renders rounded corner segment when path turns', () => {
    const container = createFakeElement('div');
    container.clientWidth = 1000;
    container.clientHeight = 700;
    const map = createMap({
      width: 3,
      height: 3,
      tiles: new Array(9).fill(0)
    });

    renderPathPreviewLayer({
      container,
      map,
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 }
      ],
      createElement: createFakeElement
    });

    const svg = container.children[0];
    const childClasses = svg.children.map((child) => getNodeClass(child));
    expect(childClasses).toContain('path-preview-corner');
  });
});

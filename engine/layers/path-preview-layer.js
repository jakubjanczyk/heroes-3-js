import { clearLayerContainer, getLayerElementFactory } from './dom-layer-utils.js';
import { getMapCenteredOrigin, getTileCenter } from './layout.js';

function setAttr(node, key, value) {
  if (typeof node.setAttribute === 'function') {
    node.setAttribute(key, value);
    return;
  }

  if (!node.attributes) {
    node.attributes = {};
  }
  node.attributes[key] = String(value);
}

function setClass(node, className) {
  if (typeof node.setAttribute === 'function') {
    node.setAttribute('class', className);
    return;
  }

  node.className = className;
}

function classWithOverLimit(baseClass, isOverLimit) {
  if (!isOverLimit) {
    return baseClass;
  }
  return `${baseClass} ${baseClass}-over-limit`;
}

const DASH_LENGTH = 30;

function createDashLine(createElement, fromPoint, toPoint, centerPoint, isOverLimit) {
  const dash = createSvgNode(createElement, 'line');
  setClass(dash, classWithOverLimit('path-preview-dash', isOverLimit));
  const vx = toPoint.x - fromPoint.x;
  const vy = toPoint.y - fromPoint.y;
  const length = Math.hypot(vx, vy);
  if (length === 0) {
    setAttr(dash, 'x1', centerPoint.x - DASH_LENGTH / 2);
    setAttr(dash, 'y1', centerPoint.y);
    setAttr(dash, 'x2', centerPoint.x + DASH_LENGTH / 2);
    setAttr(dash, 'y2', centerPoint.y);
    return dash;
  }

  const ux = vx / length;
  const uy = vy / length;
  const dashHalf = DASH_LENGTH / 2;
  setAttr(dash, 'x1', centerPoint.x - ux * dashHalf);
  setAttr(dash, 'y1', centerPoint.y - uy * dashHalf);
  setAttr(dash, 'x2', centerPoint.x + ux * dashHalf);
  setAttr(dash, 'y2', centerPoint.y + uy * dashHalf);
  return dash;
}

function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: x / length, y: y / length };
}

function quadraticPoint(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

function approximateQuadraticLength(p0, p1, p2, steps = 24) {
  let length = 0;
  let prev = p0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const point = quadraticPoint(p0, p1, p2, t);
    length += Math.hypot(point.x - prev.x, point.y - prev.y);
    prev = point;
  }
  return length;
}

function createCornerCurve(createElement, prevPoint, centerPoint, nextPoint, isOverLimit) {
  const inDir = normalize(centerPoint.x - prevPoint.x, centerPoint.y - prevPoint.y);
  const outDir = normalize(nextPoint.x - centerPoint.x, nextPoint.y - centerPoint.y);
  if (inDir.x === outDir.x && inDir.y === outDir.y) {
    return null;
  }

  // Scale turn geometry so curved segment length matches straight dash length.
  const unitStart = { x: -inDir.x, y: -inDir.y };
  const unitControl = { x: 0, y: 0 };
  const unitEnd = { x: outDir.x, y: outDir.y };
  const unitLength = approximateQuadraticLength(unitStart, unitControl, unitEnd);
  const cornerRadius = unitLength === 0 ? DASH_LENGTH / 2 : DASH_LENGTH / unitLength;

  const corner = createSvgNode(createElement, 'path');
  setClass(corner, classWithOverLimit('path-preview-corner', isOverLimit));
  const startX = centerPoint.x - inDir.x * cornerRadius;
  const startY = centerPoint.y - inDir.y * cornerRadius;
  const endX = centerPoint.x + outDir.x * cornerRadius;
  const endY = centerPoint.y + outDir.y * cornerRadius;
  const d = `M ${startX} ${startY} Q ${centerPoint.x} ${centerPoint.y} ${endX} ${endY}`;
  setAttr(corner, 'd', d);
  return corner;
}

function createSvgNode(createElement, tagName) {
  if (typeof document !== 'undefined' && typeof document.createElementNS === 'function') {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
  }
  return createElement(tagName);
}

export function renderPathPreviewLayer({
  container,
  map,
  path = null,
  targetTile = null,
  maxAffordableSteps = Number.POSITIVE_INFINITY,
  createElement
}) {
  const makeElement = getLayerElementFactory(createElement);
  clearLayerContainer(container);

  const effectiveTarget = targetTile ?? (path && path.length > 0 ? path[path.length - 1] : null);
  const hasPath = Array.isArray(path) && path.length >= 2;
  const isTargetOverLimit = hasPath && path.length - 1 > maxAffordableSteps;

  if (!hasPath && !effectiveTarget) {
    return;
  }

  const width = container.clientWidth ?? 0;
  const height = container.clientHeight ?? 0;
  const origin = getMapCenteredOrigin({ width, height, map });
  const svg = createSvgNode(makeElement, 'svg');
  setClass(svg, 'path-preview-svg');
  setAttr(svg, 'viewBox', `0 0 ${width} ${height}`);

  if (hasPath) {
    const points = path.map((tile) => getTileCenter({ map, tile, origin }));
    const targetIndex = points.length - 1;
    const turnIndices = new Set();
    for (let i = 1; i < points.length - 1; i += 1) {
      const corner = createCornerCurve(
        makeElement,
        points[i - 1],
        points[i],
        points[i + 1],
        i > maxAffordableSteps
      );
      if (corner) {
        turnIndices.add(i);
        svg.appendChild(corner);
      }
    }
    for (let i = 1; i < points.length; i += 1) {
      if (i === targetIndex) {
        continue;
      }
      if (turnIndices.has(i)) {
        continue;
      }
      const dash = createDashLine(
        makeElement,
        points[i - 1],
        points[i],
        points[i],
        i > maxAffordableSteps
      );
      svg.appendChild(dash);
    }
  }

  if (effectiveTarget) {
    const center = getTileCenter({ map, tile: effectiveTarget, origin });
    const target = createSvgNode(makeElement, 'g');
    setClass(target, 'path-preview-target');

    const slashA = createSvgNode(makeElement, 'line');
    setClass(slashA, classWithOverLimit('path-preview-target-line', isTargetOverLimit));
    setAttr(slashA, 'x1', center.x - 9);
    setAttr(slashA, 'y1', center.y - 9);
    setAttr(slashA, 'x2', center.x + 9);
    setAttr(slashA, 'y2', center.y + 9);
    target.appendChild(slashA);

    const slashB = createSvgNode(makeElement, 'line');
    setClass(slashB, classWithOverLimit('path-preview-target-line', isTargetOverLimit));
    setAttr(slashB, 'x1', center.x + 9);
    setAttr(slashB, 'y1', center.y - 9);
    setAttr(slashB, 'x2', center.x - 9);
    setAttr(slashB, 'y2', center.y + 9);
    target.appendChild(slashB);

    svg.appendChild(target);
  }

  container.appendChild(svg);
}

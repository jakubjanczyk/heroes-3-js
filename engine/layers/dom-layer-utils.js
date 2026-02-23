export function clearLayerContainer(container) {
  if (typeof container.replaceChildren === 'function') {
    container.replaceChildren();
    return;
  }

  if (Array.isArray(container.children)) {
    container.children.length = 0;
  }
}

export function getLayerElementFactory(createElement) {
  if (typeof createElement === 'function') {
    return createElement;
  }

  return (tagName) => document.createElement(tagName);
}

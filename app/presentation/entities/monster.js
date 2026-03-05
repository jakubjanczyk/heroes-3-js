export const fadeOut = Object.freeze({
  selector: '.entity--monster',
  className: 'entity--monster-defeating'
});

export function getEntityLayerStyle() {
  return {
    className: 'entity entity--monster',
    width: 22,
    height: 22,
    offsetX: -11,
    offsetY: -11
  };
}

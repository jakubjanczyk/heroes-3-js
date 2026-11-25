export const fadeOut = Object.freeze({
  className: 'entity--monster-defeating',
  durationMs: 220
})

export function getEntityLayerStyle() {
  return {
    className: 'entity entity--monster',
    width: 22,
    height: 22,
    offsetX: -11,
    offsetY: -11
  }
}

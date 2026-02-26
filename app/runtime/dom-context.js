export function createDomContext(document) {
  return {
    terrainLayer: document?.querySelector('.terrain-layer'),
    entityLayer: document?.querySelector('.entity-layer'),
    effectsLayer: document?.querySelector('.effects-layer'),
    uiLayer: document?.querySelector('.ui-layer'),
    viewport: document?.querySelector('.viewport'),
    worldElement: document?.querySelector('.world'),
    movementPointsStatus: document?.getElementById('movement-points-status'),
    endTurnButton: document?.getElementById('end-turn-button'),
    musicToggleButton: document?.getElementById('music-toggle-button'),
    createElement: document?.createElement?.bind(document)
  };
}

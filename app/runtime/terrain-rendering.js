export function setupTerrainRendering({ terrainLayer, map, createElement, renderTerrainLayer, window }) {
  if (!terrainLayer) {
    return;
  }

  const renderTerrain = () => {
    renderTerrainLayer({
      container: terrainLayer,
      map,
      createElement
    });
  };

  renderTerrain();

  if (window?.requestAnimationFrame) {
    window.requestAnimationFrame(renderTerrain);
  }

  if (window?.addEventListener) {
    window.addEventListener('resize', renderTerrain);
  }
}

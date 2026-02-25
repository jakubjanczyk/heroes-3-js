import { loadGame } from '../game/load.js';
import { renderTerrainLayer } from '../engine/layers/terrain-layer.js';
import { renderEntityLayer as renderEntityLayerDefault } from '../engine/layers/entity-layer.js';
import { renderPathPreviewLayer as renderPathPreviewLayerDefault } from '../engine/layers/path-preview-layer.js';
import { createMap } from '../engine/map.js';
import { createCamera as createCameraDefault } from '../engine/camera.js';
import { attachCameraInput as attachCameraInputDefault } from '../engine/input.js';
import { createOccupancyIndex as createOccupancyIndexDefault } from '../engine/occupancy.js';
import { findPath } from '../engine/pathfinding.js';
import { createMovementSystem as createMovementSystemDefault } from '../game/systems/movement-system.js';
import { createTurnSystem as createTurnSystemDefault } from '../game/systems/turn-system.js';
import { createMusicPlayer as createMusicPlayerDefault } from '../game/audio/music-player.js';
import { loadMusicTracks as loadMusicTracksDefault } from '../game/audio/load-music-tracks.js';

function sameTile(a, b) {
  return a.x === b.x && a.y === b.y;
}

export async function bootApp({
  fetch = globalThis.fetch,
  document = globalThis.document,
  window = globalThis.window,
  loadGame: loadGameImpl = loadGame,
  createCamera = createCameraDefault,
  attachCameraInput = attachCameraInputDefault,
  renderEntityLayer = renderEntityLayerDefault,
  renderPathPreviewLayer = renderPathPreviewLayerDefault,
  createOccupancyIndex = createOccupancyIndexDefault,
  createMovementSystem = createMovementSystemDefault,
  createTurnSystem = createTurnSystemDefault,
  createMusicPlayer = createMusicPlayerDefault,
  loadMusicTracks = loadMusicTracksDefault,
  musicTracks,
  musicManifestUrl = '/assets/music/tracks.json',
  AudioCtor = globalThis.Audio
} = {}) {
  const { scenario, definitions } = await loadGameImpl({ fetch });
  const map = createMap(scenario.terrain);
  const occupancy = createOccupancyIndex(scenario.entities);

  const world = { scenario, definitions, map, occupancy };
  globalThis.__WORLD__ = world;

  const terrainLayer = document?.querySelector('.terrain-layer');
  const entityLayer = document?.querySelector('.entity-layer');
  const effectsLayer = document?.querySelector('.effects-layer');
  const uiLayer = document?.querySelector('.ui-layer');
  const viewport = document?.querySelector('.viewport');
  const worldElement = document?.querySelector('.world');
  const movementPointsStatus = document?.getElementById('movement-points-status');
  const endTurnButton = document?.getElementById('end-turn-button');
  const musicToggleButton = document?.getElementById('music-toggle-button');
  const resolvedMusicTracks = Array.isArray(musicTracks)
    ? musicTracks
    : await loadMusicTracks({ fetch, manifestUrl: musicManifestUrl });
  const hero = scenario.entities.find((entity) => entity.kind === 'HERO') ?? null;
  const turnSystem = createTurnSystem({ maxMovementPoints: 15 });
  const musicPlayer = createMusicPlayer({
    tracks: resolvedMusicTracks,
    createAudio: (src) => {
      if (typeof AudioCtor !== 'function') {
        return null;
      }
      return new AudioCtor(src);
    }
  });
  let previewPath = null;
  let previewTarget = null;
  let isMoving = false;
  let camera = null;
  let movement = null;

  function updateMovementPointsUi() {
    if (!movementPointsStatus) {
      return;
    }
    movementPointsStatus.textContent = `MP: ${turnSystem.getRemainingMovementPoints()} / 15`;
  }

  function updateMusicToggleUi() {
    if (!musicToggleButton) {
      return;
    }

    const enabled = Boolean(musicPlayer?.isEnabled?.());
    musicToggleButton.textContent = enabled ? 'Music: On' : 'Music: Off';
    musicToggleButton.setAttribute?.('aria-pressed', enabled ? 'true' : 'false');
  }

  function paintPreview() {
    if (!effectsLayer) {
      return;
    }

    renderPathPreviewLayer({
      container: effectsLayer,
      map,
      path: previewPath,
      targetTile: previewTarget,
      maxAffordableSteps: isMoving ? Number.POSITIVE_INFINITY : turnSystem.getRemainingMovementPoints(),
      createElement: document.createElement?.bind(document)
    });
  }

  function clearPreview() {
    previewPath = null;
    previewTarget = null;
    paintPreview();
  }

  function buildPath(toTile) {
    if (!hero) {
      return null;
    }

    return findPath({
      fromTile: hero.tile,
      toTile,
      map,
      isBlocked: (tile) => {
        const occupant = occupancy.getAt(tile);
        return occupant !== null && occupant.id !== hero.id;
      }
    });
  }
  if (entityLayer) {
    movement = createMovementSystem({
      entities: scenario.entities,
      map,
      occupancy,
      stepDelayMs: 220,
      getMaxMovableSteps: () => turnSystem.getRemainingMovementPoints(),
      spendMovementPoints: (stepCount) => {
        turnSystem.spendMovementPoints(stepCount);
        updateMovementPointsUi();
      },
      onStep: ({ to }) => {
        renderEntityLayer({
          container: entityLayer,
          map,
          entities: scenario.entities,
          createElement: document.createElement?.bind(document)
        });

        if (previewPath && previewPath.length > 0) {
          while (previewPath.length > 0 && !sameTile(previewPath[0], to)) {
            previewPath.shift();
          }
          if (previewTarget && sameTile(previewTarget, to)) {
            previewTarget = null;
          }
          paintPreview();
        }

        if (isMoving) {
          camera?.centerOnTile?.(to);
        } else {
          camera?.update();
        }
      }
    });
  }

  if (viewport && worldElement) {
    camera = createCamera({ viewport, world: worldElement, map });
    camera.setFollowTileGetter(() => hero?.tile ?? null);
    camera.update();
    attachCameraInput({
      camera,
      viewport,
      window,
      edgePanDelayMs: 300,
      map,
      onTileClick: (tile) => {
        if (!movement || !hero || isMoving) {
          return;
        }

        if (previewTarget && sameTile(previewTarget, tile)) {
          isMoving = true;
          camera?.clearPan?.();
          camera?.lockFollow?.();
          camera?.centerOnTile?.(hero.tile);
          Promise.resolve(movement.moveHeroTo(tile)).finally(() => {
            isMoving = false;
            camera?.unlockFollow?.();
            if (previewTarget && hero && !sameTile(hero.tile, previewTarget)) {
              paintPreview();
            } else {
              clearPreview();
            }
            camera.update();
          });
          return;
        }

        const path = buildPath(tile);
        if (!path || path.length < 2) {
          clearPreview();
          return;
        }

        previewTarget = tile;
        previewPath = path;
        paintPreview();
      }
    });
  }

  if (terrainLayer) {
    const renderTerrain = () => {
      renderTerrainLayer({
        container: terrainLayer,
        map,
        createElement: document.createElement?.bind(document)
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

  if (entityLayer) {
    renderEntityLayer({
      container: entityLayer,
      map,
      entities: scenario.entities,
      createElement: document.createElement?.bind(document)
    });
  }

  if (endTurnButton) {
    endTurnButton.addEventListener('click', (event) => {
      event?.stopPropagation?.();
      if (isMoving) {
        return;
      }
      turnSystem.endTurn();
      updateMovementPointsUi();
      paintPreview();
    });
  }

  if (musicToggleButton) {
    musicToggleButton.addEventListener('click', (event) => {
      event?.stopPropagation?.();
      Promise.resolve(musicPlayer?.toggle?.()).finally(() => {
        updateMusicToggleUi();
      });
    });
  }

  if (uiLayer) {
    uiLayer.addEventListener('click', (event) => {
      event?.stopPropagation?.();
    });
  }

  updateMovementPointsUi();
  await Promise.resolve(musicPlayer?.start?.());
  updateMusicToggleUi();

  const bootStatus = document?.getElementById('boot-status');
  if (bootStatus) {
    bootStatus.textContent = `Boot ok: ${scenario.meta.id}`;
  }

  console.log(`boot ok: ${scenario.meta.id} (entities: ${scenario.entities.length})`);

  return world;
}

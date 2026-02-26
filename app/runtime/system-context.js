import { createCamera as createCameraDefault } from '../../engine/camera.js';
import { loadMusicTracks as loadMusicTracksDefault } from '../../game/audio/load-music-tracks.js';
import { createMusicPlayer as createMusicPlayerDefault } from '../../game/audio/music-player.js';
import { createMovementSystem as createMovementSystemDefault } from '../../game/systems/movement-system.js';
import { createTurnSystem as createTurnSystemDefault } from '../../game/systems/turn-system.js';
import {
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED
} from '../events.js';

export async function createSystemContext({
  fetch,
  scenario,
  map,
  occupancy,
  bus,
  viewport,
  worldElement,
  entityLayer,
  maxMovementPoints,
  createCamera = createCameraDefault,
  createMovementSystem = createMovementSystemDefault,
  createTurnSystem = createTurnSystemDefault,
  createMusicPlayer = createMusicPlayerDefault,
  loadMusicTracks = loadMusicTracksDefault,
  musicTracks,
  musicManifestUrl,
  AudioCtor
}) {
  const hero = scenario.entities.find((entity) => entity.kind === 'HERO') ?? null;
  const turnSystem = createTurnSystem({ maxMovementPoints });

  const resolvedMusicTracks = Array.isArray(musicTracks)
    ? musicTracks
    : await loadMusicTracks({ fetch, manifestUrl: musicManifestUrl });
  const musicPlayer = createMusicPlayer({
    tracks: resolvedMusicTracks,
    createAudio: (src) => {
      if (typeof AudioCtor !== 'function') {
        return null;
      }

      return new AudioCtor(src);
    }
  });

  const movement = entityLayer
    ? createMovementSystem({
        entities: scenario.entities,
        map,
        occupancy,
        stepDelayMs: 220,
        getMaxMovableSteps: () => turnSystem.getRemainingMovementPoints(),
        spendMovementPoints: (stepCount) => {
          turnSystem.spendMovementPoints(stepCount);
          bus.emit(APP_FACT_MOVEMENT_POINTS_CHANGED, {
            value: turnSystem.getRemainingMovementPoints(),
            max: maxMovementPoints
          });
        },
        onMoveStart: ({ targetTile }) => {
          bus.emit(APP_FACT_MOVE_STARTED, { targetTile });
        },
        onMoveFinish: ({ targetTile }) => {
          bus.emit(APP_FACT_MOVE_FINISHED, {
            moved: true,
            targetTile
          });
        },
        onStep: ({ hero: steppedHero = hero, from = null, to }) => {
          if (!to) {
            return;
          }

          bus.emit(APP_FACT_HERO_MOVED, {
            heroId: steppedHero?.id ?? hero?.id ?? null,
            from,
            to
          });
        }
      })
    : null;

  let camera = null;
  if (viewport && worldElement) {
    camera = createCamera({ viewport, world: worldElement, map });
    camera.setFollowTileGetter(() => hero?.tile ?? null);
    camera.update();
  }

  return {
    hero,
    turnSystem,
    musicPlayer,
    movement,
    camera
  };
}

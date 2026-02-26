import { describe, expect, test } from 'vitest';

import {
  APP_FACT_MOVE_FINISHED,
  APP_FACT_MOVE_STARTED,
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED
} from '../events.js';
import { createSystemContext } from './system-context.js';

function createFakeBus() {
  const emitted = [];
  return {
    emitted,
    emit(type, detail) {
      emitted.push({ type, detail });
    }
  };
}

describe('system context', () => {
  test('creates movement and emits movement facts through callbacks', async () => {
    const bus = createFakeBus();
    let movementConfig = null;

    const context = await createSystemContext({
      fetch: async () => {
        throw new Error('not used');
      },
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      map: { id: 'map' },
      occupancy: { id: 'occ' },
      bus,
      viewport: null,
      worldElement: null,
      entityLayer: { id: 'entity-layer' },
      maxMovementPoints: 15,
      createMovementSystem: (config) => {
        movementConfig = config;
        return { id: 'movement' };
      },
      createTurnSystem: () => ({
        remaining: 15,
        spendMovementPoints(stepCount) {
          this.remaining -= stepCount;
          return true;
        },
        getRemainingMovementPoints() {
          return this.remaining;
        }
      }),
      createMusicPlayer: () => ({ start() {}, isEnabled() { return false; } }),
      loadMusicTracks: async () => ['/assets/music/a.mp3'],
      AudioCtor: function AudioMock(src) {
        this.src = src;
      }
    });

    expect(context.movement).toEqual({ id: 'movement' });
    movementConfig.spendMovementPoints(2);
    movementConfig.onMoveStart({ targetTile: { x: 2, y: 0 } });
    movementConfig.onStep({
      hero: { id: 'hero-1' },
      from: { x: 0, y: 0 },
      to: { x: 1, y: 0 }
    });
    movementConfig.onMoveFinish({ targetTile: { x: 2, y: 0 } });

    expect(bus.emitted).toContainEqual({
      type: APP_FACT_MOVEMENT_POINTS_CHANGED,
      detail: { value: 13, max: 15 }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_MOVE_STARTED,
      detail: { targetTile: { x: 2, y: 0 } }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_HERO_MOVED,
      detail: {
        heroId: 'hero-1',
        from: { x: 0, y: 0 },
        to: { x: 1, y: 0 }
      }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_MOVE_FINISHED,
      detail: { moved: true, targetTile: { x: 2, y: 0 } }
    });
  });

  test('creates camera only when viewport and world element exist', async () => {
    const bus = createFakeBus();
    const cameraCalls = [];

    const context = await createSystemContext({
      fetch: async () => {
        throw new Error('not used');
      },
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      map: { id: 'map' },
      occupancy: { id: 'occ' },
      bus,
      viewport: { id: 'viewport' },
      worldElement: { id: 'world' },
      entityLayer: null,
      maxMovementPoints: 15,
      createCamera: (args) => {
        cameraCalls.push(args);
        return {
          setFollowTileGetter() {},
          update() {}
        };
      },
      createMusicPlayer: () => ({ start() {}, isEnabled() { return false; } }),
      loadMusicTracks: async () => ['/assets/music/a.mp3'],
      musicTracks: ['/assets/music/a.mp3'],
      AudioCtor: function AudioMock(src) {
        this.src = src;
      }
    });

    expect(cameraCalls).toHaveLength(1);
    expect(context.camera).toBeTruthy();
  });
});

import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_FACT_WORLD_READY,
  APP_UI_MUSIC_STATE_CHANGED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerMusicModule } from './music.module.js';

describe('music module', () => {
  test('initializes from config tracks and emits initial UI state', async () => {
    const bus = createFakeBus();
    const seenTracks = [];

    registerMusicModule(
      {
        bus,
        env: {
          fetch: async () => {},
          AudioCtor: function FakeAudio() {}
        },
        config: {
          musicTracks: ['/assets/music/a.mp3'],
          musicManifestUrl: '/assets/music/tracks.json'
        }
      },
      {
        createMusicPlayer: ({ tracks }) => {
          seenTracks.push(tracks);
          return {
            start() {},
            toggle() {},
            isEnabled() {
              return false;
            }
          };
        }
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {});
    await Promise.resolve();

    expect(seenTracks).toEqual([['/assets/music/a.mp3']]);
    expect(bus.emitted).toContainEqual({
      type: APP_UI_MUSIC_STATE_CHANGED,
      detail: { enabled: false }
    });
  });

  test('loads tracks from manifest when config tracks are not provided', async () => {
    const bus = createFakeBus();
    const loadCalls = [];

    registerMusicModule(
      {
        bus,
        env: {
          fetch: async () => {},
          AudioCtor: function FakeAudio() {}
        },
        config: {
          musicManifestUrl: '/assets/music/tracks.json'
        }
      },
      {
        loadMusicTracks: async (args) => {
          loadCalls.push(args);
          return ['/assets/music/a.mp3'];
        },
        createMusicPlayer: () => ({
          start() {},
          toggle() {},
          isEnabled() {
            return false;
          }
        })
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {});
    await Promise.resolve();

    expect(loadCalls).toEqual([
      {
        fetch: expect.any(Function),
        manifestUrl: '/assets/music/tracks.json'
      }
    ]);
  });

  test('toggles music and emits changed state after command', async () => {
    const bus = createFakeBus();
    let enabled = false;
    let toggleCalls = 0;

    registerMusicModule(
      {
        bus,
        env: {
          fetch: async () => {},
          AudioCtor: function FakeAudio() {}
        },
        config: {
          musicTracks: ['/assets/music/a.mp3'],
          musicManifestUrl: '/assets/music/tracks.json'
        }
      },
      {
        createMusicPlayer: () => ({
          start() {},
          toggle() {
            toggleCalls += 1;
            enabled = !enabled;
          },
          isEnabled() {
            return enabled;
          }
        })
      }
    );

    bus.emit(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, {});
    expect(toggleCalls).toBe(0);

    bus.emit(APP_FACT_WORLD_READY, {});
    await Promise.resolve();

    bus.emit(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, {});
    await Promise.resolve();

    expect(toggleCalls).toBe(1);
    expect(bus.emitted).toContainEqual({
      type: APP_UI_MUSIC_STATE_CHANGED,
      detail: { enabled: true }
    });
  });
});

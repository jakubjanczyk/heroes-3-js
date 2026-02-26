import { describe, expect, test } from 'vitest';

import {
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_UI_MUSIC_STATE_CHANGED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerMusicController } from './music-controller.js';

describe('music controller', () => {
  test('emits initial state after start and emits updated state after toggle command', async () => {
    const bus = createFakeBus();
    let enabled = false;
    const musicPlayer = {
      startCalls: 0,
      toggleCalls: 0,
      async start() {
        this.startCalls += 1;
      },
      async toggle() {
        this.toggleCalls += 1;
        enabled = !enabled;
      },
      isEnabled() {
        return enabled;
      }
    };

    await registerMusicController({ bus, musicPlayer });
    expect(musicPlayer.startCalls).toBe(1);
    expect(bus.emitted.at(-1)).toEqual({
      type: APP_UI_MUSIC_STATE_CHANGED,
      detail: { enabled: false }
    });

    bus.emit(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, {});
    await Promise.resolve();

    expect(musicPlayer.toggleCalls).toBe(1);
    expect(bus.emitted.at(-1)).toEqual({
      type: APP_UI_MUSIC_STATE_CHANGED,
      detail: { enabled: true }
    });
  });
});

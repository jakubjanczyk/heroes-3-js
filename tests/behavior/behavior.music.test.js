// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { flushMicrotasks, setupMovementBehaviorApp } from './behavior.utils.js';

function getMusicToggleButton() {
  return document.querySelector('#music-toggle-button');
}

describe('music behavior', () => {
  test('given browser blocks autoplay at boot when tracks exist then music toggle shows off state', async () => {
    class FakeAudio {
      addEventListener() {}

      removeEventListener() {}

      play() {
        return Promise.reject(new Error('blocked'));
      }

      pause() {}
    }

    await setupMovementBehaviorApp({
      loadMusicTracks: async () => ['/assets/music/a.mp3'],
      AudioCtor: FakeAudio
    });

    const musicToggleButton = getMusicToggleButton();
    expect(musicToggleButton).toBeTruthy();
    expect(musicToggleButton?.textContent).toBe('Music: Off');
    expect(musicToggleButton?.getAttribute('aria-pressed')).toBe('false');
  });

  test('given app boots when music is enabled then music toggle shows on state', async () => {
    let enabled = true;

    await setupMovementBehaviorApp({
      createMusicPlayer: () => ({
        start() {},
        toggle() {
          enabled = !enabled;
          return enabled;
        },
        isEnabled() {
          return enabled;
        }
      }),
      musicTracks: ['/assets/music/a.mp3']
    });

    const musicToggleButton = getMusicToggleButton();
    expect(musicToggleButton).toBeTruthy();
    expect(musicToggleButton?.textContent).toBe('Music: On');
    expect(musicToggleButton?.getAttribute('aria-pressed')).toBe('true');
  });

  test('given music toggle is clicked when state changes then button text and pressed state update', async () => {
    let enabled = true;

    const { user } = await setupMovementBehaviorApp({
      createMusicPlayer: () => ({
        start() {},
        toggle() {
          enabled = !enabled;
          return enabled;
        },
        isEnabled() {
          return enabled;
        }
      }),
      musicTracks: ['/assets/music/a.mp3']
    });

    const musicToggleButton = getMusicToggleButton();
    expect(musicToggleButton).toBeTruthy();

    await user.click(musicToggleButton);
    await flushMicrotasks();

    expect(musicToggleButton?.textContent).toBe('Music: Off');
    expect(musicToggleButton?.getAttribute('aria-pressed')).toBe('false');

    await user.click(musicToggleButton);
    await flushMicrotasks();

    expect(musicToggleButton?.textContent).toBe('Music: On');
    expect(musicToggleButton?.getAttribute('aria-pressed')).toBe('true');
  });
});

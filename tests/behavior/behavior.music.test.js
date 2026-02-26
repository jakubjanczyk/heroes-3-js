// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import { flushMicrotasks, setupMovementBehaviorApp } from './behavior.utils.js';

function getMusicToggleButton() {
  return document.querySelector('#music-toggle-button');
}

describe('music behavior', () => {
  test('given tracks exist at boot then music toggle shows off state before any user action', async () => {
    class FakeAudio {
      addEventListener() {}

      removeEventListener() {}

      play() {
        return Promise.resolve();
      }

      pause() {}
    }

    await setupMovementBehaviorApp({
      musicTracks: ['/assets/music/a.mp3'],
      AudioCtor: FakeAudio
    });

    const musicToggleButton = getMusicToggleButton();
    expect(musicToggleButton).toBeTruthy();
    expect(musicToggleButton?.textContent).toBe('Music: Off');
    expect(musicToggleButton?.getAttribute('aria-pressed')).toBe('false');
  });

  test('given playback is blocked on toggle then music stays off', async () => {
    class FakeAudio {
      addEventListener() {}

      removeEventListener() {}

      play() {
        return Promise.reject(new Error('blocked'));
      }

      pause() {}
    }

    const { user } = await setupMovementBehaviorApp({
      musicTracks: ['/assets/music/a.mp3'],
      AudioCtor: FakeAudio
    });

    const musicToggleButton = getMusicToggleButton();
    expect(musicToggleButton).toBeTruthy();

    await user.click(musicToggleButton);
    await flushMicrotasks();

    expect(musicToggleButton?.textContent).toBe('Music: Off');
    expect(musicToggleButton?.getAttribute('aria-pressed')).toBe('false');
  });

  test('given music toggle is clicked when playback works then button text and pressed state update', async () => {
    class FakeAudio {
      addEventListener() {}

      removeEventListener() {}

      play() {
        return Promise.resolve();
      }

      pause() {}
    }

    const { user } = await setupMovementBehaviorApp({
      musicTracks: ['/assets/music/a.mp3'],
      AudioCtor: FakeAudio
    });

    const musicToggleButton = getMusicToggleButton();
    expect(musicToggleButton).toBeTruthy();

    await user.click(musicToggleButton);
    await flushMicrotasks();

    expect(musicToggleButton?.textContent).toBe('Music: On');
    expect(musicToggleButton?.getAttribute('aria-pressed')).toBe('true');

    await user.click(musicToggleButton);
    await flushMicrotasks();

    expect(musicToggleButton?.textContent).toBe('Music: Off');
    expect(musicToggleButton?.getAttribute('aria-pressed')).toBe('false');
  });
});

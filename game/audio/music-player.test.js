import { describe, expect, test } from 'vitest';

import { createMusicPlayer } from './music-player.js';

function createAudioFactory({ rejectPlay = false } = {}) {
  const created = [];

  function createAudio(src) {
    const listeners = new Map();
    const audio = {
      src,
      playCalls: 0,
      pauseCalls: 0,
      addEventListener(type, handler) {
        if (!listeners.has(type)) {
          listeners.set(type, []);
        }
        listeners.get(type).push(handler);
      },
      removeEventListener(type, handler) {
        listeners.set(
          type,
          (listeners.get(type) ?? []).filter((item) => item !== handler)
        );
      },
      play() {
        this.playCalls += 1;
        if (rejectPlay) {
          return Promise.reject(new Error('autoplay blocked'));
        }
        return Promise.resolve();
      },
      pause() {
        this.pauseCalls += 1;
      },
      emit(type) {
        for (const handler of listeners.get(type) ?? []) {
          handler();
        }
      }
    };
    created.push(audio);
    return audio;
  }

  return { createAudio, created };
}

describe('music player behavior', () => {
  test('is disabled by default and does not autoplay on start', async () => {
    const { createAudio, created } = createAudioFactory();

    const player = createMusicPlayer({
      tracks: ['/assets/music/a.mp3', '/assets/music/b.mp3'],
      createAudio,
      random: () => 0
    });

    expect(player.isEnabled()).toBe(false);
    await expect(player.start()).resolves.toBe(false);
    expect(created).toHaveLength(0);
  });

  test('toggle on starts random track and picks a different one after ending', async () => {
    const { createAudio, created } = createAudioFactory();

    const player = createMusicPlayer({
      tracks: ['/assets/music/a.mp3', '/assets/music/b.mp3'],
      createAudio,
      random: () => 0
    });

    await player.toggle();
    expect(created).toHaveLength(1);
    expect(created[0].src).toBe('/assets/music/a.mp3');
    expect(created[0].playCalls).toBe(1);

    created[0].emit('ended');
    await Promise.resolve();

    expect(created).toHaveLength(2);
    expect(created[1].src).toBe('/assets/music/b.mp3');
    expect(created[1].playCalls).toBe(1);
  });

  test('toggle off pauses playback and keeps disabled state', async () => {
    const { createAudio, created } = createAudioFactory();

    const player = createMusicPlayer({
      tracks: ['/assets/music/a.mp3'],
      createAudio,
      random: () => 0
    });

    await player.toggle();
    await player.toggle();

    expect(player.isEnabled()).toBe(false);
    expect(created[0].pauseCalls).toBe(1);

    created[0].emit('ended');
    await Promise.resolve();
    expect(created).toHaveLength(1);
  });

  test('toggle on after being off starts playback again', async () => {
    const { createAudio, created } = createAudioFactory();

    const player = createMusicPlayer({
      tracks: ['/assets/music/a.mp3'],
      createAudio,
      random: () => 0
    });

    await player.toggle();
    await player.toggle();
    expect(player.isEnabled()).toBe(false);
    expect(created[0].pauseCalls).toBe(1);

    await player.toggle();
    expect(player.isEnabled()).toBe(true);
    expect(created).toHaveLength(2);
    expect(created[1].playCalls).toBe(1);
  });

  test('autoplay rejection is handled without crashing', async () => {
    const { createAudio } = createAudioFactory({ rejectPlay: true });

    const player = createMusicPlayer({
      tracks: ['/assets/music/a.mp3'],
      createAudio,
      random: () => 0
    });

    await expect(player.toggle()).resolves.toBe(true);
    expect(player.isEnabled()).toBe(false);
  });
});

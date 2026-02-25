import { describe, expect, test } from 'vitest';

import { loadMusicTracks } from './load-music-tracks.js';

describe('loadMusicTracks behavior', () => {
  test('loads track paths from manifest', async () => {
    const fetch = async (url) => {
      expect(url).toBe('./assets/music/tracks.json');
      return {
        ok: true,
        json: async () => ['/assets/music/a.mp3', '/assets/music/b.mp3', 123, '']
      };
    };

    const tracks = await loadMusicTracks({ fetch });
    expect(tracks).toEqual(['./assets/music/a.mp3', './assets/music/b.mp3']);
  });

  test('returns empty list when fetch fails', async () => {
    const fetch = async () => {
      throw new Error('network error');
    };

    await expect(loadMusicTracks({ fetch })).resolves.toEqual([]);
  });

  test('returns empty list when manifest shape is invalid', async () => {
    const fetch = async () => ({
      ok: true,
      json: async () => ({ tracks: ['/assets/music/a.mp3'] })
    });

    await expect(loadMusicTracks({ fetch })).resolves.toEqual([]);
  });
});

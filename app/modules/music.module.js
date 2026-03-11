import { loadMusicTracks as loadMusicTracksDefault } from '../../game/audio/load-music-tracks.js';
import { createMusicPlayer as createMusicPlayerDefault } from '../../game/audio/music-player.js';
import {
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_FACT_WORLD_READY,
  APP_UI_MUSIC_STATE_CHANGED
} from '../events.js';
import { defineModule } from './shared/module-runtime.js';

export const registerMusicModule = defineModule((
  { on, emit, env, config },
  {
    loadMusicTracks = loadMusicTracksDefault,
    createMusicPlayer = createMusicPlayerDefault
  } = {}
) => {
  let musicPlayer = null;
  let hasInitialized = false;

  on(APP_FACT_WORLD_READY, () => {
    if (hasInitialized) {
      return;
    }

    hasInitialized = true;
    void (async () => {
      const tracks = Array.isArray(config.musicTracks)
        ? config.musicTracks
        : await loadMusicTracks({
            fetch: env.fetch,
            manifestUrl: config.musicManifestUrl
          });

      musicPlayer = createMusicPlayer({
        tracks,
        createAudio: (src) => {
          if (typeof env.AudioCtor !== 'function') {
            return null;
          }

          return new env.AudioCtor(src);
        }
      });

      await Promise.resolve(musicPlayer?.start?.());
      emit(APP_UI_MUSIC_STATE_CHANGED, {
        enabled: Boolean(musicPlayer?.isEnabled?.())
      });
    })();
  });

  on(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, () => {
    if (!musicPlayer) {
      return;
    }

    Promise.resolve(musicPlayer.toggle()).finally(() => {
      emit(APP_UI_MUSIC_STATE_CHANGED, {
        enabled: Boolean(musicPlayer?.isEnabled?.())
      });
    });
  });
});

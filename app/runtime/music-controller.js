import {
  APP_COMMAND_MUSIC_TOGGLE_REQUESTED,
  APP_UI_MUSIC_STATE_CHANGED
} from '../events.js';

export async function registerMusicController({ bus, musicPlayer }) {
  bus.addEventListener(APP_COMMAND_MUSIC_TOGGLE_REQUESTED, () => {
    Promise.resolve(musicPlayer?.toggle?.()).finally(() => {
      bus.emit(APP_UI_MUSIC_STATE_CHANGED, {
        enabled: Boolean(musicPlayer?.isEnabled?.())
      });
    });
  });

  await Promise.resolve(musicPlayer?.start?.());
  bus.emit(APP_UI_MUSIC_STATE_CHANGED, {
    enabled: Boolean(musicPlayer?.isEnabled?.())
  });
}

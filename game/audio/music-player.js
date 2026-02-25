export function createMusicPlayer({
  tracks = [],
  createAudio = (src) => new Audio(src),
  random = Math.random
} = {}) {
  let enabled = true;
  let currentAudio = null;
  let currentTrackIndex = -1;

  const normalizedTracks = tracks.filter((track) => typeof track === 'string' && track.length > 0);

  function stopCurrentAudio() {
    if (!currentAudio) {
      return;
    }
    currentAudio.removeEventListener?.('ended', onEnded);
    currentAudio.pause?.();
    currentAudio = null;
  }

  function chooseNextTrackIndex() {
    const trackCount = normalizedTracks.length;
    if (trackCount === 0) {
      return -1;
    }
    if (trackCount === 1) {
      return 0;
    }

    const candidate = Math.floor(random() * trackCount);
    if (candidate === currentTrackIndex) {
      return (candidate + 1) % trackCount;
    }
    return candidate;
  }

  async function playRandomTrack() {
    if (!enabled) {
      return false;
    }

    const nextTrackIndex = chooseNextTrackIndex();
    if (nextTrackIndex < 0) {
      return false;
    }

    stopCurrentAudio();

    currentTrackIndex = nextTrackIndex;
    const audio = createAudio(normalizedTracks[nextTrackIndex]);
    if (!audio) {
      return false;
    }

    currentAudio = audio;
    currentAudio.addEventListener?.('ended', onEnded);

    try {
      await currentAudio.play?.();
      return true;
    } catch {
      enabled = false;
      stopCurrentAudio();
      return false;
    }
  }

  function onEnded() {
    void playRandomTrack();
  }

  async function start() {
    return playRandomTrack();
  }

  async function toggle() {
    enabled = !enabled;

    if (enabled) {
      await playRandomTrack();
      return true;
    }

    stopCurrentAudio();
    return false;
  }

  function isEnabled() {
    return enabled;
  }

  function destroy() {
    stopCurrentAudio();
  }

  return {
    start,
    toggle,
    isEnabled,
    destroy
  };
}

function normalizeStaticUrl(url) {
  if (typeof url !== 'string') {
    return url;
  }
  if (url.startsWith('//')) {
    return url;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
    return url;
  }
  if (url.startsWith('/')) {
    return `.${url}`;
  }
  return url;
}

export async function loadMusicTracks({
  fetch = globalThis.fetch,
  manifestUrl = '/assets/music/tracks.json'
} = {}) {
  if (typeof fetch !== 'function') {
    return [];
  }

  try {
    const response = await fetch(normalizeStaticUrl(manifestUrl));
    if (!response?.ok) {
      return [];
    }

    const tracks = await response.json();
    if (!Array.isArray(tracks)) {
      return [];
    }

    return tracks
      .filter((track) => typeof track === 'string' && track.length > 0)
      .map((track) => normalizeStaticUrl(track));
  } catch {
    return [];
  }
}

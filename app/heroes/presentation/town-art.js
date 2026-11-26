import { CASTLE_TOWN_ART } from './castle-town-art.js'
import { RAMPART_TOWN_ART } from './rampart-town-art.js'

const TOWN_ART = {
  CASTLE: CASTLE_TOWN_ART,
  RAMPART: RAMPART_TOWN_ART
}

// For a town type drawn before its art exists: its buildings stand on bare ground under the sky.
const PLAIN_ART = {
  backdropName: 'Plain backdrop',
  backdrop: () =>
    '<rect x="-800" y="-600" width="2400" height="840" fill="#9fb8d8"/><rect x="-800" y="240" width="2400" height="760" fill="#7f9a5a"/>',
  buildings: {},
  guildWindow: {
    name: 'Plain view',
    art: () =>
      '<rect width="138" height="120" fill="#9fb8d8"/><rect y="120" width="138" height="78" fill="#7f9a5a"/>'
  }
}

export function townArt(townType) {
  return { houses: [], ...(TOWN_ART[townType] ?? PLAIN_ART) }
}

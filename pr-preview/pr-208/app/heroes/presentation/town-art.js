import { CASTLE_BUILDING_ART, castleBackgroundArt } from './castle-town-art.js'

const TOWN_ART = {
  CASTLE: {
    backdropName: 'The Castle by the sea',
    backdrop: castleBackgroundArt,
    buildings: CASTLE_BUILDING_ART
  }
}

// For a town type drawn before its art exists: its buildings stand on bare ground under the sky.
const PLAIN_ART = {
  backdropName: 'Plain backdrop',
  backdrop: () =>
    '<rect x="-800" y="-600" width="2400" height="840" fill="#9fb8d8"/><rect x="-800" y="240" width="2400" height="760" fill="#7f9a5a"/>',
  buildings: {}
}

export function townArt(townType) {
  return TOWN_ART[townType] ?? PLAIN_ART
}

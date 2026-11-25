import {
  CASTLE_BUILDING_ART,
  castleBackgroundArt,
  castleGuildWindowArt
} from './castle-town-art.js'
import {
  RAMPART_BUILDING_ART,
  RAMPART_HOUSES,
  rampartBackgroundArt,
  rampartGuildWindowArt
} from './rampart-town-art.js'

const TOWN_ART = {
  CASTLE: {
    backdropName: 'The Castle by the sea',
    backdrop: castleBackgroundArt,
    buildings: CASTLE_BUILDING_ART,
    houses: [],
    guildWindow: { name: "View of the Castle's land", art: castleGuildWindowArt }
  },
  RAMPART: {
    backdropName: "Rampart's misty valley",
    backdrop: rampartBackgroundArt,
    buildings: RAMPART_BUILDING_ART,
    houses: RAMPART_HOUSES,
    guildWindow: { name: "View of Rampart's valley", art: rampartGuildWindowArt }
  }
}

// For a town type drawn before its art exists: its buildings stand on bare ground under the sky.
const PLAIN_ART = {
  backdropName: 'Plain backdrop',
  backdrop: () =>
    '<rect x="-800" y="-600" width="2400" height="840" fill="#9fb8d8"/><rect x="-800" y="240" width="2400" height="760" fill="#7f9a5a"/>',
  buildings: {},
  houses: [],
  guildWindow: {
    name: 'Plain view',
    art: () =>
      '<rect width="138" height="120" fill="#9fb8d8"/><rect y="120" width="138" height="78" fill="#7f9a5a"/>'
  }
}

export function townArt(townType) {
  return TOWN_ART[townType] ?? PLAIN_ART
}

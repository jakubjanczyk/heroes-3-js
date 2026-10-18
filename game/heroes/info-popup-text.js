import { getRolloverText } from './rollover-text.js'

// What the Heroes 3 right-click popup says about a map tile: the same name the rollover bar
// shows, then the owner's colour on its own line for an owned object ("Gold Mine", "(Red)").
export function getInfoPopupLines({ entity, terrainName, definitions, ownerColorName = null }) {
  const name = getRolloverText({ entity, terrainName, definitions })
  return ownerColorName ? [name, `(${ownerColorName})`] : [name]
}

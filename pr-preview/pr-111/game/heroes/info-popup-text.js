import { getEntityName, getStatusBarText } from './status-bar-text.js'
import { isVisitableObject } from './visitable-objects/definitions.js'
import { describeVisitableObject } from './visitable-objects/visits.js'

// What the Heroes 3 right-click popup says about a map tile: the same name the status bar
// shows, then the owner's colour on its own line for an owned object ("Gold Mine", "(Red)"). An
// object each hero uses once says what it gives and whether the selected hero has used it.
export function getInfoPopupLines({
  entity,
  terrainName,
  definitions,
  ownerColorName = null,
  visitedText = null,
  values = {}
}) {
  if (isVisitableObject(entity)) {
    return [
      getEntityName({ entity, definitions }),
      ...describeVisitableObject(definitions, entity, values),
      ...(visitedText ? [visitedText] : [])
    ]
  }

  const name = getStatusBarText({ entity, terrainName, definitions })
  return ownerColorName ? [name, `(${ownerColorName})`] : [name]
}

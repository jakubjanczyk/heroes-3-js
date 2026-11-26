export const INFO_BOX_SHOWN_MS = 3000

const ON_ANY_VIEW = {
  selectionChanged: 'selection',
  moveStarted: 'selection',
  dayStarted: 'date',
  resourcesFound: 'resources',
  mineCaptured: 'mine',
  computerTurnStarted: 'turn'
}

const TRANSITIONS = {
  selection: { ...ON_ANY_VIEW, clicked: 'kingdom' },
  kingdom: { ...ON_ANY_VIEW, clicked: 'date', timedOut: 'selection' },
  date: { ...ON_ANY_VIEW, clicked: 'selection', timedOut: 'selection' },
  resources: { ...ON_ANY_VIEW, clicked: 'selection', timedOut: 'selection' },
  mine: { ...ON_ANY_VIEW, clicked: 'selection', timedOut: 'selection' },
  // Nothing a computer player's heroes do takes the hourglass's place.
  turn: { computerTurnStarted: 'turn', dayStarted: 'date', playerTurnStarted: 'selection' }
}

export function nextInfoBoxView(view, eventType) {
  return TRANSITIONS[view][eventType] ?? null
}

export function infoBoxTimeoutMs(view) {
  return view === 'selection' || view === 'turn' ? null : INFO_BOX_SHOWN_MS
}

export const INFO_BOX_SHOWN_MS = 3000

const ON_ANY_VIEW = {
  selectionChanged: 'selection',
  moveStarted: 'selection',
  dayStarted: 'date',
  resourcesFound: 'resources'
}

const TRANSITIONS = {
  selection: { ...ON_ANY_VIEW, clicked: 'kingdom' },
  kingdom: { ...ON_ANY_VIEW, clicked: 'date', timedOut: 'selection' },
  date: { ...ON_ANY_VIEW, clicked: 'selection', timedOut: 'selection' },
  resources: { ...ON_ANY_VIEW, clicked: 'selection', timedOut: 'selection' }
}

export function nextInfoBoxView(view, eventType) {
  return TRANSITIONS[view][eventType] ?? null
}

export function infoBoxTimeoutMs(view) {
  return view === 'selection' ? null : INFO_BOX_SHOWN_MS
}

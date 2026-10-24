export const INFO_BOX_SHOWN_MS = 3000

export const INFO_BOX_SELECTION = { view: 'selection' }

const showSelection = () => INFO_BOX_SELECTION

const showDate = (_state, event) => ({ view: 'date', date: event.date })

// A view whose time runs out while a window is open stays until something else replaces it.
const hideUnlessModalOpen = (state, event) => (event.isModalOpen ? state : INFO_BOX_SELECTION)

const TRANSITIONS = {
  selection: {
    boxClicked: (state, event) => (event.onArmySlot ? state : { view: 'kingdom' })
  },
  kingdom: {
    boxClicked: showDate,
    timedOut: hideUnlessModalOpen
  },
  date: {
    boxClicked: showSelection,
    timedOut: hideUnlessModalOpen
  },
  resources: {
    boxClicked: showSelection,
    timedOut: hideUnlessModalOpen
  }
}

const TRANSITIONS_FROM_ANY_VIEW = {
  selectionChanged: showSelection,
  moveStarted: showSelection,
  dayStarted: showDate,
  resourceFound: (_state, event) => ({ view: 'resources', resources: event.resources })
}

export function nextInfoBoxState(state, event) {
  const transition = TRANSITIONS[state.view][event.type] ?? TRANSITIONS_FROM_ANY_VIEW[event.type]
  return transition ? transition(state, event) : state
}

export function infoBoxTimeoutMs(state) {
  return state.view === 'selection' ? null : INFO_BOX_SHOWN_MS
}

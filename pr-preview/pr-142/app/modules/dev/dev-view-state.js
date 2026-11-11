// Dev tools change only what the modules read, never the saved game, so a reload undoes them.
export function createDevViewState(getState) {
  let showsWholeMap = false
  let shownFrom = null
  let shown = null

  function withoutFog(state) {
    if (state !== shownFrom) {
      shownFrom = state
      shown = { ...state, fog: { ...state.fog, enabled: false } }
    }
    return shown
  }

  return {
    setFogOfWar(enabled) {
      showsWholeMap = !enabled
    },
    get() {
      const state = getState()
      return showsWholeMap && state?.fog ? withoutFog(state) : state
    }
  }
}

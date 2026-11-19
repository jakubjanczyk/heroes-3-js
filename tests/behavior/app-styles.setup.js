// Flattening the app's stylesheet and jsdom's first parse of it take most of a second, several
// on a busy CI runner. Done once per worker before its tests, so no single test pays it inside
// its own time limit.
import { beforeAll } from 'vitest'

import { loadAppStyles, unloadAppStyles } from './app-styles.js'

let warmedUp = false

beforeAll(async () => {
  if (warmedUp) {
    return
  }

  warmedUp = true
  await loadAppStyles()
  getComputedStyle(document.body)
  unloadAppStyles()
})

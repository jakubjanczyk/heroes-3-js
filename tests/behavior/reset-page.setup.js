// Each test starts on a page of its own: the app booted by the test before stops listening to the
// window, and the app's styles are gone unless the test loads them. The behavior project runs its
// files without isolation, so this also keeps one test file from reaching into the next.
import { afterEach } from 'vitest'

import { stopRunningApp } from './app.utils.js'
import { unloadAppStyles } from './app-styles.js'

afterEach(() => {
  stopRunningApp()
  unloadAppStyles()
})

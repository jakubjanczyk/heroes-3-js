// Behavior tests run on a fake clock: `waitMs` moves it forward, so a check made partway through
// a walk or a fade-out always lands at the same moment, however busy the machine running it is.
import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'Date',
      'requestAnimationFrame',
      'cancelAnimationFrame'
    ]
  })
})

afterEach(() => {
  vi.useRealTimers()
})

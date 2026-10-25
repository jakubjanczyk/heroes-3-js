import { describe, expect, test } from 'vitest'

import { createBus } from './bus.js'

function createRecordingBus() {
  const applied = []
  const bus = createBus({ beforeDispatch: (event) => applied.push(event.type) })
  return { bus, applied }
}

describe('bus', () => {
  test('applies every fact of a commit before any listener hears the first', () => {
    const { bus, applied } = createRecordingBus()
    const seen = []
    bus.addEventListener('fact.resources.spent', () => seen.push([...applied]))

    bus.emitAll([
      { type: 'fact.resources.spent', detail: {} },
      { type: 'fact.town.building.built', detail: {} }
    ])

    expect(seen).toEqual([['fact.resources.spent', 'fact.town.building.built']])
  })

  // The handler can read the state the fact left as soon as it has emitted it.
  test('a fact emitted by a listener is heard before the listener goes on', () => {
    const { bus } = createRecordingBus()
    const order = []
    bus.addEventListener('fact.turn.ended', () => order.push('fact heard'))
    bus.addEventListener('command.turn.end.requested', () => {
      bus.emit('fact.turn.ended', {})
      order.push('handler goes on')
    })

    bus.emit('command.turn.end.requested', {})

    expect(order).toEqual(['fact heard', 'handler goes on'])
  })

  test('applies facts while silent, so a silent replay still builds the state', () => {
    const { bus, applied } = createRecordingBus()
    const heard = []
    bus.addEventListener('fact.hero.moved', () => heard.push('fact.hero.moved'))

    bus.silent = true
    bus.emit('fact.hero.moved', {})

    expect(applied).toEqual(['fact.hero.moved'])
    expect(heard).toEqual([])
  })
})

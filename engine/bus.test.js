import { describe, expect, test } from 'vitest'

import { createBus } from './bus.js'

const isFact = (type) => type.startsWith('fact.')

function createRecordingBus() {
  const applied = []
  const bus = createBus({
    beforeDispatch: (event) => applied.push(event.type),
    isDeferredWhileDispatching: isFact
  })
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

  test('a fact emitted by a fact listener waits until every listener of the first is done', () => {
    const { bus, applied } = createRecordingBus()
    const seenBySecondListener = []
    bus.addEventListener('fact.interaction.reached', () => bus.emit('fact.town.captured', {}))
    bus.addEventListener('fact.interaction.reached', () => seenBySecondListener.push([...applied]))

    bus.emit('fact.interaction.reached', {})

    expect(seenBySecondListener).toEqual([['fact.interaction.reached']])
    expect(applied).toEqual(['fact.interaction.reached', 'fact.town.captured'])
  })

  test('a fact emitted by a command handler is heard before the handler goes on', () => {
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

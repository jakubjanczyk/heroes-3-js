import { describe, expect, test } from 'vitest'

import { defineModule } from '../../app/modules/shared/module-runtime.js'
import { createBus } from '../../engine/bus.js'

const contract = { id: 'probe', phase: 'domain', consumes: ['fact.declared'], produces: [] }

describe('module contracts', () => {
  test('a module cannot emit an event it did not declare in produces', () => {
    const bus = createBus()
    const registerProbe = defineModule(
      ({ emit }) => ({
        subscriptions: [{ type: 'fact.declared', handler: () => emit('fact.undeclared', {}) }]
      }),
      contract
    )
    registerProbe({ bus })

    expect(() => bus.emit('fact.declared', {})).toThrow(
      'Module "probe" emits "fact.undeclared" without declaring it in produces'
    )
  })

  test('a module cannot listen to an event it did not declare in consumes', () => {
    const registerProbe = defineModule(
      () => ({ subscriptions: [{ type: 'fact.undeclared', handler: () => {} }] }),
      contract
    )

    expect(() => registerProbe({ bus: createBus() })).toThrow(
      'Module "probe" listens to "fact.undeclared" without declaring it in consumes'
    )
  })

  test('produces can depend on the content in config', () => {
    const bus = createBus()
    const emitted = []
    bus.addEventListener('fact.fromContent', (event) => emitted.push(event.type))
    const registerProbe = defineModule(
      ({ emit }) => ({
        subscriptions: [{ type: 'fact.declared', handler: () => emit('fact.fromContent', {}) }]
      }),
      { ...contract, produces: (config) => config.content.events }
    )
    registerProbe({ bus, config: { content: { events: ['fact.fromContent'] } } })

    bus.emit('fact.declared', {})

    expect(emitted).toEqual(['fact.fromContent'])
  })
})

// @vitest-environment jsdom
import { describe, test } from 'vitest'

import {
  clickEndTurn,
  closeInteractionModal,
  endTurns,
  expectCalendarDate,
  expectInteractionModalClosed,
  expectInteractionModalOpen
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  setupLinearMovementApp,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aScenario } from './builders.js'

describe('calendar behavior', () => {
  test('shows Month 1, Week 1, Day 1 when a new game starts', async () => {
    await setupLinearMovementApp()

    expectCalendarDate({ month: 1, week: 1, day: 1 })
  })

  test('advances to Day 2 after ending the turn', async () => {
    const { user } = await setupLinearMovementApp()

    await clickEndTurn(user)

    expectCalendarDate({ month: 1, week: 1, day: 2 })
  })

  test('moves to Week 2, Day 1 after ending the turn on Day 7', async () => {
    const { user } = await setupLinearMovementApp()
    await endTurns(user, 6)
    expectCalendarDate({ month: 1, week: 1, day: 7 })

    await clickEndTurn(user)

    expectCalendarDate({ month: 1, week: 2, day: 1 })
  })

  test('moves to Month 2, Week 1, Day 1 after ending the turn on Month 1, Week 4, Day 7', async () => {
    const { user } = await setupLinearMovementApp()
    await endTurns(user, 27)
    expectCalendarDate({ month: 1, week: 4, day: 7 })

    await clickEndTurn(user)

    expectCalendarDate({ month: 2, week: 1, day: 1 })
  })

  test('shows a new week popup after ending the turn on Day 7', async () => {
    const { user } = await setupLinearMovementApp()
    await endTurns(user, 6)

    await clickEndTurn(user)

    expectInteractionModalOpen('A new week begins. Week 2')
  })

  test.each([1, 2, 3, 4, 5, 6])('shows no popup when ending the turn on Day %i', async (day) => {
    const { user } = await setupLinearMovementApp()
    await endTurns(user, day - 1)

    await clickEndTurn(user)

    expectInteractionModalClosed()
  })

  test('shows the new week popup when a new month starts', async () => {
    const { user } = await setupLinearMovementApp()
    await endTurns(user, 27)

    await clickEndTurn(user)

    expectInteractionModalOpen('A new week begins. Week 1')
  })

  test('closes the new week popup with its OK button', async () => {
    const { user } = await setupLinearMovementApp()
    await endTurns(user, 6)
    await clickEndTurn(user)

    await closeInteractionModal(user)

    expectInteractionModalClosed()
  })

  describe('after a reload', () => {
    function createSession() {
      return {
        eventLog: createMemoryEventLog(),
        loadGameOptions: aScenario().withSize(4).build()
      }
    }

    test('keeps the date', async () => {
      const session = createSession()
      const { user } = await setupMovementBehaviorApp(session)
      await endTurns(user, 8)

      await setupMovementBehaviorApp(session)

      expectCalendarDate({ month: 1, week: 2, day: 2 })
    })

    test('does not show the new week popup again', async () => {
      const session = createSession()
      const { user } = await setupMovementBehaviorApp(session)
      await endTurns(user, 6)
      await clickEndTurn(user)
      expectInteractionModalOpen('A new week begins. Week 2')

      await setupMovementBehaviorApp(session)

      expectInteractionModalClosed()
    })
  })
})

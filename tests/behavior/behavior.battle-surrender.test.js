// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { attackMonsterAt } from './adventure-map.utils.js'
import { readGameData, setupMovementBehaviorApp } from './app.utils.js'
import { getBattleButton } from './battle.utils.js'
import { aHero, aMonster, aScenario } from './builders.js'

describe('battle surrender behavior', () => {
  // In Heroes 3 only an enemy hero can take a surrender.
  test('given the battle is against a neutral monster then Surrender is disabled, saying neutral creatures do not accept surrender', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(3)
        .withEntities(aHero(), aMonster().withStacks(1).at(1, 0))
        .withDefinitions({ monsters: readGameData('monsters.json') })
        .build()
    })

    await attackMonsterAt(1, 0)

    const surrender = getBattleButton('Surrender')
    expect(surrender.disabled).toBe(true)
    expect(surrender.title).toBe('Neutral creatures do not accept surrender')
  })
})

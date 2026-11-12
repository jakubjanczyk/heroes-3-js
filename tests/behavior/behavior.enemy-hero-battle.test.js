// @vitest-environment jsdom
import { screen, within } from '@testing-library/dom'
import { describe, expect, test } from 'vitest'

import {
  confirmTileClickByDispatch,
  getHeroEntity,
  holdRightButtonOn,
  queryMinimapHeroMarker
} from './adventure-map.utils.js'
import {
  answerMessage,
  closeLevelUpPopup,
  expectInteractionModalClosed,
  queryLevelUpPopup,
  readArmySlots,
  readMessage,
  readMessageDetails,
  readMessagePictures
} from './adventure-panels.utils.js'
import { createMemoryEventLog, readGameData, waitMs } from './app.utils.js'
import {
  attackBattleHexFrom,
  clickBattleButton,
  closeBattleResults,
  getBattleScreen,
  moveActiveStackTo,
  pickSpell,
  readBattleResultsMessage,
  readBattleResultsSide,
  readBattleStacks,
  readCombatMessages,
  reloadBattle,
  retreat,
  startBattle,
  surrender,
  waitForBattleResults
} from './battle.utils.js'
import { aCaster, aFightWithAHero, HERO, stack } from './battle-lasting-spells.fixtures.js'
import { ARMY_THAT_WINS, aHero, anArtifactDefinition, aScenario, aTown } from './builders.js'
import {
  clickHeroInHeroList,
  readHeroScreenArtifacts,
  readHeroScreenBackpack
} from './hero-screen.utils.js'
import { readSpellBookMessage } from './spell-book.utils.js'
import { openTavern, readHeroesForHire } from './town-screen.utils.js'

const ENEMY_HERO = 'Valeska'

const aBlueHero = (army = [stack('PIKEMAN', 10), null, stack('ARCHER', 4)]) =>
  aHero().withId('hero-2').withName(ENEMY_HERO).ownedBy('blue').withArmy(army)

const basic = (skill) => ({ skill, level: 'BASIC' })

// Rolls for morale or luck, under the chance to take effect.
const ALWAYS = () => 0

const HIGH_MORALE = (name) => `High morale enables the ${name} to attack again.`
const GOOD_LUCK = (name) => `Good luck shines on the ${name}.`

const readBattleStackNames = () =>
  readBattleStacks()
    .map(({ stack }) => stack)
    .sort()

async function winWithAutoCombat(user) {
  await clickBattleButton(user, 'Auto combat')
  await waitForBattleResults()
}

// One Angel (speed 12) against 20 Swordsmen (speed 5): the Angel moves first, to where the
// Swordsmen walk up and attack it; its strike back kills 2 of them.
const aLoneAngel = () => aCaster().withArmy([stack('ANGEL', 1)])
const aBlueHeroWithSwordsmen = () => aBlueHero([stack('SWORDSMAN', 20)])

async function retreatAfterSwordsmenLoseTwo(user) {
  await moveActiveStackTo(user, 6, 9)
  await retreat(user)
  await closeBattleResults(user)
}

const aRetreatScenario = () =>
  aFightWithAHero({ enemy: aBlueHeroWithSwordsmen() })
    .withSize(3, 3)
    .withEntities(
      aLoneAngel().at(0, 0),
      aBlueHeroWithSwordsmen().at(1, 0),
      aHero().withId('hero-3').withName('Sir Mullich').withArmy(ARMY_THAT_WINS).at(0, 2)
    )

const CAPTURED_MESSAGE = 'You have captured an enemy artifact!'
const ASSEMBLE_QUESTION =
  'You possess all of the components needed to assemble the Angelic Alliance.  Do you wish to assemble this artifact?'

const capturableArtifacts = {
  HELM: anArtifactDefinition()
    .withName('Helm of Heavenly Enlightenment')
    .withSlot('HELMET')
    .build(),
  SKULL: anArtifactDefinition().withName('Skull Helmet').withSlot('HELMET').build(),
  CAPE: anArtifactDefinition().withName('Cape of Conjuring').withSlot('CAPE').build(),
  SWORD: anArtifactDefinition().withName('Sword of Judgement').withSlot('WEAPON').build(),
  RING: anArtifactDefinition().withName('Ring of Vitality').withSlot('RING').build(),
  ALLIANCE: anArtifactDefinition()
    .withName('Angelic Alliance')
    .withSlot('WEAPON')
    .withClass('RELIC')
    .withParts(['HELM', 'SWORD'])
    .build()
}

// Artifacts are put on in order, as when picked up: the first of a kind is worn, the rest wait in
// the backpack.
const aFightForArtifacts = ({ hero = aCaster().withArmy(ARMY_THAT_WINS), enemyArtifacts }) => {
  const enemy = aBlueHero().withArtifacts(enemyArtifacts)
  return aScenario()
    .withSize(3)
    .withEntities(hero, enemy.at(1, 0))
    .withDefinitions({
      ...aFightWithAHero({ enemy }).build().definitions,
      artifacts: capturableArtifacts
    })
}

async function beatBlueHero(scenario, options) {
  const started = await startBattle(scenario, options)
  await winWithAutoCombat(started.user)
  await closeBattleResults(started.user)
  return started
}

async function openHeroScreenAfterMessages(user) {
  while (readMessage() === CAPTURED_MESSAGE || readMessage() === '') {
    await answerMessage(user, 'OK')
  }
  await clickHeroInHeroList(user, HERO)
}

async function attackBlueHero() {
  confirmTileClickByDispatch(1, 0)
  await waitMs()
}

const MULLICH = 'Sir Mullich'

// The hero fights the blue hero first; Sir Mullich waits below to fight it next.
const aRematch = ({
  hero,
  enemy,
  mullich = aHero().withId('hero-3').withName(MULLICH).withArmy(ARMY_THAT_WINS)
}) =>
  aScenario()
    .withSize(3, 3)
    .withEntities(hero.at(0, 0), enemy.at(1, 0), mullich.at(0, 2))
    .withDefinitions({
      ...aFightWithAHero({ enemy }).build().definitions,
      artifacts: capturableArtifacts
    })

async function loseToBlueHero(scenario, options) {
  const started = await startBattle(scenario, options)
  await winWithAutoCombat(started.user)
  await closeBattleResults(started.user)
  return started
}

async function beatBlueHeroWithMullich(user) {
  await attackBlueHero()
  await winWithAutoCombat(user)
  await closeBattleResults(user)
  if (queryLevelUpPopup(MULLICH)) {
    await closeLevelUpPopup(user, MULLICH)
  }
}

// No Attack or Defense of its own, so a level's Attack shows in its Swordsmen's strikes.
const aBlueHeroOfSwordsmen = (experience) =>
  aBlueHero([stack('SWORDSMAN', 20)])
    .withPrimarySkills({ attack: 0, defense: 0 })
    .withExperience(experience)

// The Swordsmen walk up to column 10, the Pikemen to column 5, and the Swordsmen kill 13 of them.
async function retreatAfterSwordsmenKill13(user) {
  await moveActiveStackTo(user, 6, 5)
  await waitMs(1000)
  await retreat(user)
  await closeBattleResults(user)
}

const aMullichWithRoyalGriffins = () =>
  aHero()
    .withId('hero-3')
    .withName(MULLICH)
    .withPrimarySkills({ attack: 0, defense: 0 })
    .withArmy([stack('ROYAL_GRIFFIN', 10)])

// Sir Mullich's Royal Griffins wait out of reach while the Swordsmen walk up to column 10, then
// attack them, and the Swordsmen strike back.
async function swordsmenStrikeBackAtMullich(user) {
  await attackBlueHero()
  await moveActiveStackTo(user, 6, 2)
  await waitMs(1000)
  await attackBattleHexFrom(user, 6, 10, 'left')
  await waitMs(1000)
}

// 20 Swordsmen strike back for 120 (6 each), +5% for 10 Attack against the Royal Griffins' 9
// Defense, or +10% when the blue hero's level has given it 1 Attack.
const SWORDSMEN_STRIKE_BACK_WITH_ATTACK_0 = 'The Swordsmen do 126 damage. 5 Royal Griffins perish.'
const SWORDSMEN_STRIKE_BACK_WITH_ATTACK_1 = 'The Swordsmen do 132 damage. 5 Royal Griffins perish.'

describe('attacking an enemy hero behavior', () => {
  describe('the battle', () => {
    test("when the hero walks to a blue hero then a battle starts against the blue hero's stacks", async () => {
      await startBattle(aFightWithAHero({ enemy: aBlueHero() }))

      expect(readBattleStackNames()).toEqual(['Archers 4', 'Pikemen 10', 'Swordsmen 10'])
    })

    test('given the battle is against a blue hero then the blue hero is shown on the battlefield', async () => {
      await startBattle(aFightWithAHero({ enemy: aBlueHero() }))

      expect(within(getBattleScreen()).getByRole('img', { name: ENEMY_HERO })).toBeTruthy()
    })

    describe("the blue hero's primary skills", () => {
      // Royal Griffins have 9 Attack and 9 Defense and deal 3-6 damage each, and fly 9 hexes. The
      // hero's stay out of reach; the blue hero's fly up to row 6, column 6.
      const aFightOfRoyalGriffins = (blueSkills) =>
        aFightWithAHero({
          hero: aCaster()
            .withPrimarySkills({ attack: 0, defense: 0 })
            .withArmy([stack('ROYAL_GRIFFIN', 10)]),
          enemy: aBlueHero([stack('ROYAL_GRIFFIN', 20)]).withPrimarySkills(blueSkills)
        })

      async function royalGriffinsAttack(user) {
        await moveActiveStackTo(user, 6, 2)
        await attackBattleHexFrom(user, 6, 6, 'left')
      }

      test('given a blue hero with Attack 4 when its stack strikes back then it hits harder', async () => {
        const { user } = await startBattle(aFightOfRoyalGriffins({ attack: 4, defense: 0 }))

        await royalGriffinsAttack(user)

        // 30 damage kills one of the 20. The 19 left strike back for 57 (10 rolls of 3, times
        // 19 / 10), +20% for 9 + 4 Attack against 9 Defense: 68.4, rounded down.
        expect(readCombatMessages()[1]).toBe(
          'The Royal Griffins do 68 damage. 2 Royal Griffins perish.'
        )
      })

      test('given a blue hero with Defense 5 when the hero’s stack strikes it then it takes less damage', async () => {
        const { user } = await startBattle(aFightOfRoyalGriffins({ attack: 0, defense: 5 }))

        await royalGriffinsAttack(user)

        // 30 damage, -12.5% for 9 Attack against 9 + 5 Defense: 26.25, rounded down.
        expect(readCombatMessages()[0]).toBe(
          'The Royal Griffins do 26 damage. One Royal Griffin perishes.'
        )
      })
    })

    test('given a blue hero with Leadership when its stack acts and good morale is rolled then it acts again', async () => {
      // Pikemen and Centaurs are of two towns, which alone gives no morale. The Centaurs (speed 6)
      // act first.
      await startBattle(
        aFightWithAHero({
          hero: aCaster().withArmy([stack('SKELETON', 10)]),
          enemy: aBlueHero([stack('PIKEMAN', 10), stack('CENTAUR', 10)]).withSecondarySkills([
            basic('LEADERSHIP')
          ])
        }),
        { appConfig: { moraleRandom: ALWAYS } }
      )
      await waitMs(5000)

      expect(readCombatMessages()).toContain(HIGH_MORALE('Centaurs'))
    })

    test('given a blue hero with Luck when its stack shoots lucky then good luck shines on it', async () => {
      const { user } = await startBattle(
        aFightWithAHero({
          hero: aCaster().withArmy([stack('SKELETON', 10)]),
          enemy: aBlueHero([stack('ARCHER', 10)]).withSecondarySkills([basic('LUCK')])
        }),
        { appConfig: { luckRandom: ALWAYS } }
      )

      await clickBattleButton(user, 'Defend')
      await waitMs(5000)

      expect(readCombatMessages()).toContain(GOOD_LUCK('Archers'))
    })

    test("given a blue hero wearing an artifact that cancels morale then the hero's stack with good morale never acts again", async () => {
      // Two stacks of Pikemen, all of one town: morale +1. The first starts on row 3, column 1.
      const { user } = await startBattle(
        aFightWithAHero({
          hero: aCaster().withArmy([stack('PIKEMAN', 10), stack('PIKEMAN', 10)]),
          enemy: aBlueHero([stack('SKELETON', 10)]).withArtifacts(['SPIRIT'])
        }),
        { appConfig: { moraleRandom: ALWAYS } }
      )

      await moveActiveStackTo(user, 3, 3)

      expect(readCombatMessages()).not.toContain(HIGH_MORALE('Pikemen'))
    })

    test('given a blue hero wearing an artifact that gives its troops immunity to mind spells when the hero picks Expert Sorrow then the book says the spell will affect no one', async () => {
      const { user } = await startBattle(
        aFightWithAHero({
          hero: aCaster({
            secondarySkills: [{ skill: 'EARTH_MAGIC', level: 'EXPERT' }],
            spells: ['SORROW']
          }),
          enemy: aBlueHero([stack('PIKEMAN', 10)]).withArtifacts(['MIND_GUARD'])
        })
      )

      await pickSpell(user, 'Sorrow')

      expect(readSpellBookMessage()).toEqual(['', 'That spell will affect no one!'])
    })
  })

  describe('winning', () => {
    const aWinningFight = () =>
      aFightWithAHero({ hero: aCaster().withArmy(ARMY_THAT_WINS), enemy: aBlueHero() })

    test('the results window shows the hero as Victorious and the blue hero as Defeated', async () => {
      const { user } = await startBattle(aWinningFight())

      await winWithAutoCombat(user)

      expect([readBattleResultsSide('Attacker'), readBattleResultsSide('Defender')]).toEqual([
        [HERO, 'Victorious'],
        [ENEMY_HERO, 'Defeated']
      ])
    })

    test("gives the hero the blue hero's creatures' hit points and 500 more for the hero as experience", async () => {
      const { user } = await startBattle(aWinningFight())

      await winWithAutoCombat(user)

      // 10 Pikemen and 4 Archers of 10 hit points each, and 500 for the beaten hero.
      expect(readBattleResultsMessage()).toEqual([
        'A glorious victory!',
        `For valor in combat, ${HERO} receives 640 experience`
      ])
    })

    test('the blue hero is gone from the map', async () => {
      const { user } = await startBattle(aWinningFight())
      await winWithAutoCombat(user)

      await closeBattleResults(user)

      expect(getHeroEntity('hero-2')).toBeNull()
    })

    test('the blue hero is gone from the minimap', async () => {
      const { user } = await startBattle(aWinningFight())
      await winWithAutoCombat(user)

      await closeBattleResults(user)

      expect(queryMinimapHeroMarker('hero-2')).toBeNull()
    })

    test('given the blue hero was beaten when the tavern offers new heroes then it can be offered', async () => {
      const scenario = aScenario()
        .withSize(9, 7)
        .withEntities(
          aCaster().withArmy(ARMY_THAT_WINS).at(0, 0),
          aBlueHero().at(1, 0),
          aTown().named('Whitemoon').ownedByPlayer().withBuildings(['TAVERN']).at(4, 3)
        )
        .withDefinitions({
          ...aFightWithAHero({ enemy: aBlueHero() }).build().definitions,
          // No other heroes, so the tavern offers only the scenario's heroes not on the map.
          heroes: {},
          tavern: readGameData('tavern.json'),
          resources: readGameData('resources.json'),
          towns: readGameData('towns.json'),
          buildings: readGameData('buildings.json')
        })
      const { user } = await startBattle(scenario)
      await winWithAutoCombat(user)
      await closeBattleResults(user)

      confirmTileClickByDispatch(4, 3)
      await waitMs()
      await openTavern(user)

      expect(readHeroesForHire()).toContain(ENEMY_HERO)
    })

    describe("the blue hero's artifacts", () => {
      test('the hero wears an artifact the blue hero wore, in the slot of its kind', async () => {
        const { user } = await beatBlueHero(aFightForArtifacts({ enemyArtifacts: ['CAPE'] }))

        await openHeroScreenAfterMessages(user)

        expect(readHeroScreenArtifacts().Cape).toBe('Cape of Conjuring')
      })

      test('an artifact whose slot the hero already fills goes to the end of its backpack', async () => {
        const { user } = await beatBlueHero(
          aFightForArtifacts({
            hero: aCaster({ army: ARMY_THAT_WINS, artifacts: ['SKULL', 'RING', 'RING'] }),
            enemyArtifacts: ['HELM']
          })
        )

        await openHeroScreenAfterMessages(user)

        expect(readHeroScreenBackpack()).toEqual(['Helm of Heavenly Enlightenment'])
      })

      test("the blue hero's backpack goes to the end of the hero's backpack, in its order", async () => {
        const { user } = await beatBlueHero(
          aFightForArtifacts({
            hero: aCaster({ army: ARMY_THAT_WINS, artifacts: ['CAPE', 'HELM'] }),
            enemyArtifacts: ['CAPE', 'HELM', 'SKULL', 'CAPE']
          })
        )

        await openHeroScreenAfterMessages(user)

        // The blue hero wears a Cape and the Helm, and carries the Skull Helmet and another Cape.
        // The hero already wears both kinds, so its worn ones come first, helmet before cape, then
        // its backpack.
        expect(readHeroScreenBackpack()).toEqual([
          'Helm of Heavenly Enlightenment',
          'Cape of Conjuring',
          'Skull Helmet',
          'Cape of Conjuring'
        ])
      })

      test('a combination artifact the blue hero wore is worn by the hero as a whole', async () => {
        const { user } = await beatBlueHero(aFightForArtifacts({ enemyArtifacts: ['ALLIANCE'] }))

        await openHeroScreenAfterMessages(user)

        expect(readHeroScreenArtifacts()).toMatchObject({
          Weapon: 'Angelic Alliance',
          Helmet: 'Locked'
        })
      })

      test('when the results window closes then a message shows each captured artifact', async () => {
        await beatBlueHero(aFightForArtifacts({ enemyArtifacts: ['SKULL', 'CAPE', 'HELM'] }))

        expect({ message: readMessage(), pictures: readMessagePictures() }).toEqual({
          message: CAPTURED_MESSAGE,
          pictures: ['Skull Helmet', 'Cape of Conjuring', 'Helm of Heavenly Enlightenment']
        })
      })

      test('given more artifacts than one message holds when the player clicks OK then the next ones show without the text', async () => {
        const { user } = await beatBlueHero(
          aFightForArtifacts({ enemyArtifacts: Array(10).fill('RING') })
        )

        const first = readMessagePictures().length
        await answerMessage(user, 'OK')
        const second = { message: readMessage(), pictures: readMessagePictures() }

        expect({ first, second }).toEqual({
          first: 8,
          second: { message: '', pictures: ['Ring of Vitality', 'Ring of Vitality'] }
        })
      })

      test('given the blue hero had no artifacts then no message shows', async () => {
        await beatBlueHero(aFightForArtifacts({ enemyArtifacts: [] }))

        expectInteractionModalClosed()
      })

      test('given the captured artifacts complete a combination when the message closes then the hero is asked to assemble it', async () => {
        const { user } = await beatBlueHero(
          aFightForArtifacts({ enemyArtifacts: ['HELM', 'SWORD'] })
        )

        await answerMessage(user, 'OK')

        expect(readMessageDetails()).toContain(ASSEMBLE_QUESTION)
      })

      test('given a full backpack then the artifacts that fit a free slot are worn and the rest are lost', async () => {
        const { user } = await beatBlueHero(
          aFightForArtifacts({
            hero: aCaster({
              army: ARMY_THAT_WINS,
              artifacts: ['SKULL', ...Array(64).fill('RING')]
            }),
            enemyArtifacts: ['HELM', 'CAPE']
          })
        )

        await openHeroScreenAfterMessages(user)

        expect({
          helmet: readHeroScreenArtifacts().Helmet,
          cape: readHeroScreenArtifacts().Cape,
          backpack: readHeroScreenBackpack().includes('Helm of Heavenly Enlightenment')
        }).toEqual({ helmet: 'Skull Helmet', cape: 'Cape of Conjuring', backpack: false })
      })
    })
  })

  describe('losing', () => {
    test('given the hero is beaten then it leaves the map and the blue hero stays where it was', async () => {
      const { user } = await startBattle(
        aFightWithAHero({
          hero: aCaster().withArmy([stack('PIKEMAN', 1)]),
          enemy: aBlueHero([stack('ANGEL', 5)])
        })
      )

      await winWithAutoCombat(user)
      await closeBattleResults(user)

      expect(getHeroEntity()).toBeNull()
      expect(getHeroEntity('hero-2')).toBeTruthy()
    })

    test("given the hero retreated then the blue hero's popup shows what is left of its army", async () => {
      const { user } = await startBattle(aRetreatScenario())
      await retreatAfterSwordsmenLoseTwo(user)

      await holdRightButtonOn(user, 1, 0)

      // 18 Swordsmen are a Pack; the 20 it started with were Lots.
      expect(readArmySlots(screen.getByRole('tooltip'))[0]).toBe('Swordsmen Pack')
    })

    test('given the hero retreated when another hero attacks the blue hero then it fights what is left of its army', async () => {
      const { user } = await startBattle(aRetreatScenario())
      await retreatAfterSwordsmenLoseTwo(user)

      await attackBlueHero()

      expect(readBattleStackNames()).toEqual(['Angels 10', 'Swordsmen 18'])
    })

    describe("the hero's artifacts", () => {
      test('given the hero is beaten when Sir Mullich beats the blue hero then he captures the artifacts the hero wore and carried', async () => {
        const { user } = await loseToBlueHero(
          aRematch({
            hero: aCaster({ army: [stack('PIKEMAN', 1)], artifacts: ['SKULL', 'CAPE', 'HELM'] }),
            enemy: aBlueHero([stack('ANGEL', 5)])
          })
        )

        await beatBlueHeroWithMullich(user)

        // The hero wore the Skull Helmet and the Cape and carried the Helm; so does the blue hero.
        expect(readMessagePictures()).toEqual([
          'Skull Helmet',
          'Cape of Conjuring',
          'Helm of Heavenly Enlightenment'
        ])
      })

      test("given the blue hero wears an artifact of that kind then the hero's goes to its backpack", async () => {
        const { user } = await loseToBlueHero(
          aRematch({
            hero: aCaster({ army: [stack('PIKEMAN', 1)], artifacts: ['SKULL'] }),
            enemy: aBlueHero([stack('ANGEL', 5)]).withArtifacts(['HELM'])
          })
        )

        await beatBlueHeroWithMullich(user)

        expect(readMessagePictures()).toEqual(['Helm of Heavenly Enlightenment', 'Skull Helmet'])
      })

      test('given the captured artifacts complete a combination then the blue hero wears it assembled', async () => {
        const { user } = await loseToBlueHero(
          aRematch({
            hero: aCaster({ army: [stack('PIKEMAN', 1)], artifacts: ['HELM'] }),
            enemy: aBlueHero([stack('ANGEL', 5)]).withArtifacts(['SWORD'])
          })
        )

        await beatBlueHeroWithMullich(user)

        expect(readMessagePictures()).toEqual(['Angelic Alliance'])
      })

      test('given the hero retreated when Sir Mullich beats the blue hero then none of the hero’s artifacts are captured', async () => {
        const { user } = await startBattle(
          aRematch({
            hero: aLoneAngel().withArtifacts(['CAPE']),
            enemy: aBlueHeroWithSwordsmen()
          })
        )
        await retreatAfterSwordsmenLoseTwo(user)

        await beatBlueHeroWithMullich(user)

        expectInteractionModalClosed()
      })

      test('given the hero surrendered when Sir Mullich beats the blue hero then none of the hero’s artifacts are captured', async () => {
        const { user } = await startBattle(
          aRematch({
            hero: aLoneAngel().withArtifacts(['CAPE']),
            enemy: aBlueHeroWithSwordsmen()
          }).withStartingResources({ GOLD_PILE: 1500 })
        )
        await surrender(user)
        await closeBattleResults(user)

        await beatBlueHeroWithMullich(user)

        expectInteractionModalClosed()
      })

      test('given the hero is beaten then no captured message shows', async () => {
        await loseToBlueHero(
          aRematch({
            hero: aCaster({ army: [stack('PIKEMAN', 1)], artifacts: ['CAPE'] }),
            enemy: aBlueHero([stack('ANGEL', 5)])
          })
        )

        expectInteractionModalClosed()
      })
    })

    describe("the blue hero's experience", () => {
      test('given the hero is beaten then the blue hero gains a level from its creatures and 500 more, and its Attack rises', async () => {
        // One Pikeman of 10 hit points and 500 for the beaten hero take 490 to 1000, level 2. The
        // lowest roll gives a Knight Attack.
        const { user } = await loseToBlueHero(
          aRematch({
            hero: aCaster({ army: [stack('PIKEMAN', 1)] }),
            mullich: aMullichWithRoyalGriffins(),
            enemy: aBlueHeroOfSwordsmen(490)
          })
        )

        await swordsmenStrikeBackAtMullich(user)

        expect(readCombatMessages()[1]).toBe(SWORDSMEN_STRIKE_BACK_WITH_ATTACK_1)
      })

      test('given the blue hero gains a level then the player sees no level-up popup', async () => {
        await loseToBlueHero(
          aRematch({
            hero: aCaster({ army: [stack('PIKEMAN', 1)] }),
            mullich: aMullichWithRoyalGriffins(),
            enemy: aBlueHeroOfSwordsmen(490)
          })
        )

        expect(queryLevelUpPopup(ENEMY_HERO)).toBeNull()
      })

      test('given the hero retreated after losing creatures then the blue hero gains their experience', async () => {
        // 13 Pikemen of 10 hit points take 900 past 1000.
        const { user } = await startBattle(
          aRematch({
            hero: aCaster({ army: [stack('PIKEMAN', 20)] }),
            mullich: aMullichWithRoyalGriffins(),
            enemy: aBlueHeroOfSwordsmen(900)
          })
        )
        await retreatAfterSwordsmenKill13(user)

        await swordsmenStrikeBackAtMullich(user)

        expect(readCombatMessages()[1]).toBe(SWORDSMEN_STRIKE_BACK_WITH_ATTACK_1)
      })

      test('given the hero retreated then the blue hero gets no 500 for it', async () => {
        const { user } = await startBattle(
          aRematch({
            hero: aCaster({ army: [stack('PIKEMAN', 20)] }),
            mullich: aMullichWithRoyalGriffins(),
            enemy: aBlueHeroOfSwordsmen(600)
          })
        )
        await retreat(user)
        await closeBattleResults(user)

        await swordsmenStrikeBackAtMullich(user)

        expect(readCombatMessages()[1]).toBe(SWORDSMEN_STRIKE_BACK_WITH_ATTACK_0)
      })
    })
  })

  describe('after a reload', () => {
    test('given a battle against a blue hero when the page reloads then the battle goes on against the same stacks', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () => aFightWithAHero({ enemy: aBlueHero() })
      await startBattle(scenario(), { eventLog })

      await reloadBattle(scenario(), { eventLog })

      expect(readBattleStackNames()).toEqual(['Archers 4', 'Pikemen 10', 'Swordsmen 10'])
    })

    test('given the blue hero was beaten when the page reloads then it is still gone', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () =>
        aFightWithAHero({ hero: aCaster().withArmy(ARMY_THAT_WINS), enemy: aBlueHero() })
      const { user } = await startBattle(scenario(), { eventLog })
      await winWithAutoCombat(user)
      await closeBattleResults(user)

      await reloadBattle(scenario(), { eventLog })

      expect(getHeroEntity('hero-2')).toBeNull()
    })

    test('given the blue hero was beaten when the page reloads then the hero still has its artifacts', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () => aFightForArtifacts({ enemyArtifacts: ['CAPE'] })
      const { user } = await beatBlueHero(scenario(), { eventLog })
      await answerMessage(user, 'OK')

      const { user: reloadedUser } = await reloadBattle(scenario(), { eventLog })
      await clickHeroInHeroList(reloadedUser, HERO)

      expect(readHeroScreenArtifacts().Cape).toBe('Cape of Conjuring')
    })

    test("given the hero was beaten when the page reloads then the blue hero still has the hero's artifacts", async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () =>
        aRematch({
          hero: aCaster({ army: [stack('PIKEMAN', 1)], artifacts: ['CAPE'] }),
          enemy: aBlueHero([stack('ANGEL', 5)])
        })
      await loseToBlueHero(scenario(), { eventLog })

      const { user } = await reloadBattle(scenario(), { eventLog })
      await beatBlueHeroWithMullich(user)

      expect(readMessagePictures()).toEqual(['Cape of Conjuring'])
    })

    test('given the blue hero gained a level when the page reloads then no level-up popup shows', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () =>
        aRematch({
          hero: aCaster({ army: [stack('PIKEMAN', 1)] }),
          enemy: aBlueHeroOfSwordsmen(490)
        })
      await loseToBlueHero(scenario(), { eventLog })

      await reloadBattle(scenario(), { eventLog })

      expectInteractionModalClosed()
    })

    test('given the blue hero was beaten when the page reloads then the captured message does not show again', async () => {
      const eventLog = createMemoryEventLog()
      const scenario = () => aFightForArtifacts({ enemyArtifacts: ['CAPE'] })
      const { user } = await beatBlueHero(scenario(), { eventLog })
      await answerMessage(user, 'OK')

      await reloadBattle(scenario(), { eventLog })

      expectInteractionModalClosed()
    })
  })
})

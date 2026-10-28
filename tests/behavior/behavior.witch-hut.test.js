// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'
import {
  confirmTileClickByDispatch,
  holdRightButtonOn,
  hoverTile,
  readInfoPopupLines
} from './adventure-map.utils.js'
import {
  closeInteractionModal,
  expectStatusBarText,
  readMessage,
  readMessageRewards
} from './adventure-panels.utils.js'
import {
  createMemoryEventLog,
  flushMicrotasks,
  readGameData,
  setupMovementBehaviorApp
} from './app.utils.js'
import { aBonusObject, aHero, aScenario } from './builders.js'
import { clickHeroInHeroList, readHeroScreenSecondarySkills } from './hero-screen.utils.js'
import { releaseRightButton } from './town-screen.utils.js'

const TEACHES = (skill) =>
  `An ancient witch living in a strange hut welcomes you, offering to teach you ${skill} for her own inscrutable purposes.`
const ALREADY_KNOWN = (skill) =>
  `You approach the strange hut and observe a witch inside studying an ancient tome on ${skill}. As you approach, she turns and speaks. "You already know that which I would teach you. I can help you no further."`
const TOO_WISE = (skill) =>
  `You approach the strange hut and observe a witch inside studying an ancient tome on ${skill}. As you approach, she turns and focuses her one glass eye on you. "HA!" she screeches, "I would not presume to try to teach new tricks to someone so clearly as wise as you." You leave, but can't quite shake the feeling that you have just been insulted.`

const EIGHT_SKILLS = [
  'PATHFINDING',
  'LOGISTICS',
  'SCOUTING',
  'WISDOM',
  'MYSTICISM',
  'LUCK',
  'TACTICS',
  'OFFENSE'
].map((skill) => ({ skill, level: 'BASIC' }))

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  resources: readGameData('resources.json'),
  bonusObjects: readGameData('bonus-objects.json')
}

function aHut(skill) {
  const hut = aBonusObject().withType('WITCH_HUT').at(2, 1)
  return skill ? hut.withSkill(skill) : hut
}

// The hut's entrance is at (2, 1) and the hero stands right below it, so entering it takes one
// step.
function setupHut(
  skill,
  { heroes = [aHero().withSecondarySkills([]).at(2, 2)], random = () => 0, eventLog } = {}
) {
  return setupMovementBehaviorApp({
    loadGameOptions: aScenario()
      .withSize(5, 3)
      .withEntities(...heroes, aHut(skill))
      .withDefinitions(gameDefinitions)
      .build(),
    appConfig: { random },
    eventLog
  })
}

async function walkTo(x, y) {
  confirmTileClickByDispatch(x, y)
  await flushMicrotasks()
}

const enterEntrance = () => walkTo(2, 1)
const stepOff = () => walkTo(2, 2)

async function visitHut(user) {
  await enterEntrance()
  await closeInteractionModal(user)
  await stepOff()
}

async function readSkills(user, heroName = 'Hero') {
  await clickHeroInHeroList(user, heroName)
  return readHeroScreenSecondarySkills().filter((slot) => slot !== '')
}

async function readPopupOn(user, x, y) {
  await holdRightButtonOn(user, x, y)
  const lines = readInfoPopupLines()
  await releaseRightButton(user)
  return lines
}

describe('Witch Hut', () => {
  describe('entering', () => {
    test("shows the witch's message naming the skill, with Basic Archery under it", async () => {
      await setupHut('ARCHERY')

      await enterEntrance()

      expect(readMessage()).toBe(TEACHES('Archery'))
      expect(readMessageRewards()).toEqual(['Basic Archery'])
    })

    test('the hero has Basic Archery on the hero screen', async () => {
      const { user } = await setupHut('ARCHERY')

      await enterEntrance()
      await closeInteractionModal(user)

      expect(await readSkills(user)).toEqual(['Basic Archery'])
    })

    test("teaches a skill the hero's class never offers on level-up", async () => {
      const { user } = await setupHut('NECROMANCY')

      await enterEntrance()
      await closeInteractionModal(user)

      expect(await readSkills(user)).toEqual(['Basic Necromancy'])
    })

    test('another hero of the player can still learn the skill', async () => {
      const { user } = await setupHut('ARCHERY', {
        heroes: [
          aHero().withSecondarySkills([]).at(2, 2),
          aHero().withId('hero-2').withName('Valeska').withSecondarySkills([]).at(3, 1)
        ]
      })
      await visitHut(user)
      await clickHeroInHeroList(user, 'Valeska')

      await enterEntrance()

      expect(readMessage()).toBe(TEACHES('Archery'))
    })
  })

  describe("can't learn", () => {
    const anAdvancedArcher = () =>
      aHero()
        .withSecondarySkills([{ skill: 'ARCHERY', level: 'ADVANCED' }])
        .at(2, 2)

    test('a hero who already has the skill is told she has nothing to teach', async () => {
      await setupHut('ARCHERY', { heroes: [anAdvancedArcher()] })

      await enterEntrance()

      expect(readMessage()).toBe(ALREADY_KNOWN('Archery'))
      expect(readMessageRewards()).toEqual([])
    })

    test('a hero who has the skill at Advanced keeps it at Advanced', async () => {
      const { user } = await setupHut('ARCHERY', { heroes: [anAdvancedArcher()] })

      await enterEntrance()
      await closeInteractionModal(user)

      expect(await readSkills(user)).toEqual(['Advanced Archery'])
    })

    test('a hero with 8 skills is called too wise to teach', async () => {
      await setupHut('ARCHERY', { heroes: [aHero().withSecondarySkills(EIGHT_SKILLS).at(2, 2)] })

      await enterEntrance()

      expect(readMessage()).toBe(TOO_WISE('Archery'))
      expect(readMessageRewards()).toEqual([])
    })

    test('a hero with 8 skills learns nothing', async () => {
      const { user } = await setupHut('ARCHERY', {
        heroes: [aHero().withSecondarySkills(EIGHT_SKILLS).at(2, 2)]
      })

      await enterEntrance()
      await closeInteractionModal(user)

      expect(await readSkills(user)).toEqual([
        'Basic Pathfinding',
        'Basic Logistics',
        'Basic Scouting',
        'Basic Wisdom',
        'Basic Mysticism',
        'Basic Luck',
        'Basic Tactics',
        'Basic Offense'
      ])
    })

    test("a hero with 8 skills that include the hut's is told she has nothing to teach", async () => {
      const skills = [...EIGHT_SKILLS.slice(1), { skill: 'ARCHERY', level: 'BASIC' }]
      await setupHut('ARCHERY', { heroes: [aHero().withSecondarySkills(skills).at(2, 2)] })

      await enterEntrance()

      expect(readMessage()).toBe(ALREADY_KNOWN('Archery'))
    })
  })

  describe("the hut's skill", () => {
    // With no skill in the scenario, it is drawn evenly from the 26 skills other than Leadership
    // and Necromancy, in the skill list's order: Navigation is the 6th, Wisdom the 7th (where
    // Leadership would be), Eagle Eye the 11th and Estates the 12th (where Necromancy would be).
    test.each([
      { roll: 'lowest', random: () => 0, skill: 'Pathfinding' },
      { roll: 'one past Navigation', random: () => 6.5 / 26, skill: 'Wisdom' },
      { roll: 'one past Eagle Eye', random: () => 11.5 / 26, skill: 'Estates' },
      { roll: 'highest', random: () => 0.99, skill: 'First Aid' }
    ])('with none in the scenario, the $roll roll teaches $skill', async ({ random, skill }) => {
      await setupHut(null, { random })

      await enterEntrance()

      expect(readMessage()).toBe(TEACHES(skill))
    })

    test('the rolled skill is kept after a reload', async () => {
      const session = { eventLog: createMemoryEventLog() }
      await setupHut(null, { random: () => 0.99, ...session })

      await setupHut(null, { random: () => 0, ...session })
      await enterEntrance()

      expect(readMessage()).toBe(TEACHES('First Aid'))
    })
  })

  describe('status bar and right-click popup', () => {
    test("before any of the player's heroes has visited, the status bar says only Witch Hut", async () => {
      const { user } = await setupHut('ARCHERY')

      await hoverTile(user, 2, 1)

      expectStatusBarText('Witch Hut')
    })

    test("before any of the player's heroes has visited, the popup says only Witch Hut", async () => {
      const { user } = await setupHut('ARCHERY')

      expect(await readPopupOn(user, 2, 1)).toEqual(['Witch Hut'])
    })

    test('once a hero of the player has visited, the status bar names the skill', async () => {
      const { user } = await setupHut('ARCHERY')
      await visitHut(user)

      await hoverTile(user, 2, 1)

      expectStatusBarText('Witch Hut (Archery)')
    })

    test('once a hero of the player has visited, the popup names the skill', async () => {
      const { user } = await setupHut('ARCHERY')
      await visitHut(user)

      expect(await readPopupOn(user, 2, 1)).toEqual(['Witch Hut', '(Archery)'])
    })

    test('the popup names the skill after the hut turned the hero away', async () => {
      const { user } = await setupHut('ARCHERY', {
        heroes: [aHero().withSecondarySkills(EIGHT_SKILLS).at(2, 2)]
      })
      await visitHut(user)

      expect(await readPopupOn(user, 2, 1)).toEqual(['Witch Hut', '(Archery)'])
    })

    test('the popup still names the skill after a reload', async () => {
      const session = { eventLog: createMemoryEventLog() }
      const { user } = await setupHut('ARCHERY', session)
      await visitHut(user)

      const reloaded = await setupHut('ARCHERY', session)

      expect(await readPopupOn(reloaded.user, 2, 1)).toEqual(['Witch Hut', '(Archery)'])
    })
  })

  test('after a reload, the hero still has the skill learned at the hut', async () => {
    const session = { eventLog: createMemoryEventLog() }
    const { user } = await setupHut('ARCHERY', session)
    await enterEntrance()
    await closeInteractionModal(user)

    const reloaded = await setupHut('ARCHERY', session)

    expect(await readSkills(reloaded.user)).toEqual(['Basic Archery'])
  })
})

import { readGameData, waitMs } from './app.utils.js'
import { attackBattleHexFrom, castSpellAt, moveActiveStackTo } from './battle.utils.js'
import { aHero, aMonster, anArtifactDefinition, aScenario, aSpellDefinition } from './builders.js'

export const HERO = 'Lord Haart'

const aLastingSpell = ({ name, schools, costs, allAtExpert = true, ...lasting }) =>
  aSpellDefinition()
    .withName(name)
    .withSchools(schools)
    .withCosts(costs)
    .withLasting(allAtExpert ? { ...lasting, allAtExpert } : lasting)
    .describedAs(`${name} description.`)
    .build()

const spellDefinitions = {
  HASTE: aLastingSpell({
    name: 'Haste',
    schools: ['AIR'],
    costs: [6, 5, 5, 5],
    target: 'own',
    effects: { speed: [3, 3, 5, 5] }
  }),
  SLOW: aLastingSpell({
    name: 'Slow',
    schools: ['EARTH'],
    costs: [6, 5, 5, 5],
    target: 'enemy',
    effects: { speedPercent: [-25, -25, -50, -50] }
  }),
  SHIELD: aLastingSpell({
    name: 'Shield',
    schools: ['EARTH'],
    costs: [5, 4, 4, 4],
    target: 'own',
    effects: { meleeDamageTakenPercent: [-15, -15, -30, -30] }
  }),
  STONE_SKIN: aLastingSpell({
    name: 'Stone Skin',
    schools: ['EARTH'],
    costs: [5, 4, 4, 4],
    target: 'own',
    effects: { defense: [3, 3, 6, 6] }
  }),
  BLOODLUST: aLastingSpell({
    name: 'Bloodlust',
    schools: ['FIRE'],
    costs: [5, 4, 4, 4],
    target: 'own',
    effects: { meleeAttack: [3, 3, 6, 6] }
  }),
  WEAKNESS: aLastingSpell({
    name: 'Weakness',
    schools: ['WATER'],
    costs: [8, 6, 6, 6],
    target: 'enemy',
    effects: { attack: [-3, -3, -6, -6] }
  }),
  BLESS: aLastingSpell({
    name: 'Bless',
    schools: ['WATER'],
    costs: [5, 4, 4, 4],
    target: 'own',
    effects: { maximumDamage: [0, 0, 1, 1] }
  }),
  CURSE: aLastingSpell({
    name: 'Curse',
    schools: ['FIRE'],
    costs: [6, 5, 5, 5],
    target: 'enemy',
    effects: { minimumDamage: [0, 0, -1, -1] }
  }),
  PRECISION: aLastingSpell({
    name: 'Precision',
    schools: ['AIR'],
    costs: [8, 6, 6, 6],
    target: 'own',
    shootersOnly: true,
    effects: { rangedAttack: [3, 3, 6, 6] }
  }),
  AIR_SHIELD: aLastingSpell({
    name: 'Air Shield',
    schools: ['AIR'],
    costs: [12, 9, 9, 9],
    target: 'own',
    effects: { rangedDamageTakenPercent: [-25, -25, -50, -50] }
  }),
  DISRUPTING_RAY: aLastingSpell({
    name: 'Disrupting Ray',
    schools: ['AIR'],
    costs: [10, 8, 8, 8],
    target: 'enemy',
    untilBattleEnds: true,
    addsUp: true,
    allAtExpert: false,
    effects: { defense: [-3, -3, -4, -5] }
  })
}

const moraleAndLuckSpellDefinitions = {
  FORTUNE: aLastingSpell({
    name: 'Fortune',
    schools: ['AIR'],
    costs: [7, 5, 5, 5],
    target: 'own',
    effects: { luck: [1, 1, 2, 2] }
  }),
  MIRTH: aLastingSpell({
    name: 'Mirth',
    schools: ['WATER'],
    costs: [12, 9, 9, 9],
    target: 'own',
    effects: { morale: [1, 1, 2, 2] }
  }),
  SORROW: aLastingSpell({
    name: 'Sorrow',
    schools: ['EARTH'],
    costs: [16, 12, 12, 12],
    target: 'enemy',
    effects: { morale: [-1, -1, -2, -2] }
  }),
  DESPAIR: aLastingSpell({
    name: 'Despair',
    schools: ['EARTH'],
    costs: [16, 12, 12, 12],
    target: 'enemy',
    effects: { morale: [-6, -6, -6, -6] }
  })
}

export const MORALE_AND_LUCK_SPELLS = Object.keys(moraleAndLuckSpellDefinitions)

const artifactDefinitions = {
  SPIRIT: anArtifactDefinition()
    .withName('Spirit of Oppression')
    .withSlot('MISC')
    .withCancelsInBattle(['morale'])
    .build(),
  HOURGLASS: anArtifactDefinition()
    .withName('Hourglass of the Evil Hour')
    .withSlot('MISC')
    .withCancelsInBattle(['luck'])
    .build()
}

const gameDefinitions = {
  hero: readGameData('hero.json'),
  heroClasses: readGameData('hero-classes.json'),
  heroes: readGameData('heroes.json'),
  secondarySkills: readGameData('secondary-skills.json'),
  monsters: readGameData('monsters.json'),
  spells: { ...spellDefinitions, ...moraleAndLuckSpellDefinitions },
  artifacts: artifactDefinitions
}

export const stack = (creature, count) => ({ creature, count })

// Knowledge 2, so 20 spell points, and Power 2: a spell lasts two rounds. The hero's class gives
// its stacks +2 Attack and +2 Defense.
export const aCaster = ({
  power = 2,
  secondarySkills = [],
  army = [stack('SWORDSMAN', 10)],
  spells = Object.keys(spellDefinitions),
  artifacts = []
} = {}) =>
  aHero()
    .withName(HERO)
    .withPrimarySkills({ power, knowledge: 2 })
    .withSecondarySkills(secondarySkills)
    .withSpellBook(true)
    .withSpells(spells)
    .withArmy(army)
    .withArtifacts(artifacts)

export const aFight = ({ hero = aCaster(), monster = 'PIKEMAN', count = 50, stacks = 1 } = {}) =>
  aScenario()
    .withSize(3)
    .withEntities(hero, aMonster().withType(monster).withCount(count).withStacks(stacks).at(1, 0))
    .withDefinitions(gameDefinitions)

// With one stack each, the hero's stack starts on row 6, column 1 and the monster's on column 15.
export const OWN_HEX = { row: 6, column: 1 }
export const ENEMY_HEX = { row: 6, column: 15 }

// The Swordsmen walk to column 5 and the Pikemen (speed 4) come to column 11, so next round the
// Swordsmen can attack them from column 10.
export const PIKEMEN_CLOSE_BY = { row: 6, column: 11 }

export async function bringPikemenCloser(user) {
  await moveActiveStackTo(user, 6, 5)
  await waitMs(1000)
}

export const SWORDSMEN_CLOSE_BY = { row: 6, column: 5 }

export async function attackPikemenAfter(user, spell, at) {
  await bringPikemenCloser(user)
  await castSpellAt(user, spell, at)
  await attackBattleHexFrom(user, PIKEMEN_CLOSE_BY.row, PIKEMEN_CLOSE_BY.column, 'left')
  await waitMs(1000)
}

import { heroTile, selectedHeroIdOf, viewingPlayer } from '../state/queries.js'
import { townBehavior } from './entity-behaviors/town.js'
import { getHeroPrimarySkills } from './primary-skills.js'
import { spellSkillLevel } from './spell-book.js'
import { heroById } from './state/hero-details.js'

export function visionsOf(hero, spell) {
  if (!spell?.visions) {
    return null
  }
  const level = spellSkillLevel(hero, spell)
  const cast = {
    rangePerPower: spell.visions.rangePerPower[level],
    minimumRange: spell.visions.minimumRange,
    kinds: Object.entries(spell.visions.detailsFrom)
      .filter(([, fromLevel]) => level >= fromLevel)
      .map(([kind]) => kind)
  }
  const kept = hero.visions
  return kept && kept.rangePerPower > cast.rangePerPower ? kept : cast
}

const powerOf = (hero, definitions) =>
  getHeroPrimarySkills({ entity: hero, definitions }).find(({ key }) => key === 'power').value

const bottomRight = (tiles) =>
  tiles.reduce((corner, tile) =>
    tile.y > corner.y || (tile.y === corner.y && tile.x > corner.x) ? tile : corner
  )

// A town is measured to its bottom-right tile, not its gate.
function measuredTile(entity) {
  if (entity.kind !== 'TOWN') {
    return entity.tile
  }
  const corner = bottomRight([{ x: 0, y: 0 }, ...townBehavior.footprintOffsets])
  return { x: entity.tile.x + corner.x, y: entity.tile.y + corner.y }
}

// The range is measured from where the selected hero stands now, with their Power now.
export function seenThroughVisions(state, entity, definitions) {
  if (!entity?.tile) {
    return false
  }
  const heroId = selectedHeroIdOf(state, viewingPlayer(state))
  const hero = heroId && heroById(state, heroId)
  if (!hero?.visions?.kinds.includes(entity.kind)) {
    return false
  }
  const { rangePerPower, minimumRange } = hero.visions
  const range = Math.max(rangePerPower * powerOf(hero, definitions), minimumRange)
  const from = heroTile(state, heroId)
  const target = measuredTile(entity)
  return Math.hypot(target.x - from.x, target.y - from.y) < range
}

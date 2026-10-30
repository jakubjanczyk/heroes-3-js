import { DEFAULT_PLAYER } from './core-slices.js'

// A tile is in sight when its distance from the centre, rounded to a whole number, is at most
// the radius.
function isInSight(center, tile, radius) {
  return Math.round(Math.hypot(tile.x - center.x, tile.y - center.y)) <= radius
}

function reveal(fog, { player, center, radius }) {
  const { width, height } = fog
  const previous = fog.explored[player] ?? new Uint8Array(width * height)
  let explored = previous

  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(height - 1, center.y + radius);
    y += 1
  ) {
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(width - 1, center.x + radius);
      x += 1
    ) {
      const index = y * width + x
      if (explored[index] === 0 && isInSight(center, { x, y }, radius)) {
        if (explored === previous) {
          explored = new Uint8Array(previous)
        }
        explored[index] = 1
      }
    }
  }

  return explored === previous && fog.explored[player]
    ? fog
    : { ...fog, explored: { ...fog.explored, [player]: explored } }
}

function revealAll(fog, sights) {
  return fog.enabled ? sights.reduce(reveal, fog) : fog
}

function ownerOf(entity) {
  return entity.kind === 'HERO' ? (entity.owner ?? DEFAULT_PLAYER) : entity.owner
}

// Each player's explored tiles. `sight` says how far each object a player owns at the start sees
// (`sightRadiusOf`), and which facts reveal tiles to whom (`revealsOn`).
export function createFogSlice({ sightRadiusOf, revealsOn }) {
  return {
    key: 'fog',
    initial: ({ scenario, map }) => {
      const fog = {
        enabled: scenario?.fogOfWar !== false,
        width: map.width,
        height: map.height,
        explored: { [DEFAULT_PLAYER]: new Uint8Array(map.width * map.height) }
      }
      const sights = (scenario?.entities ?? []).filter(ownerOf).map((entity) => ({
        player: ownerOf(entity),
        center: entity.tile,
        radius: sightRadiusOf(entity)
      }))
      return revealAll(fog, sights)
    },
    on: Object.fromEntries(
      Object.entries(revealsOn).map(([type, sightsOn]) => [
        type,
        (fog, detail, context) => revealAll(fog, sightsOn(detail, context))
      ])
    )
  }
}

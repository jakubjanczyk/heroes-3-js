import { isMageGuild } from './mage-guild.js'
import { FORT_CHAIN, HALL_CHAIN } from './town-buildings.js'
import { buildingsInEffect } from './town-income.js'

// What clicking a building opens: the hall the Hall, the fort the Fort window, the Tavern the
// tavern, the Mage Guild its screen, a dwelling or its horde building (Griffin Bastion) the dwelling's recruit window. The
// other buildings' screens don't exist yet, so clicking them does nothing.
function openedBy(buildingId, building, monsters) {
  if (buildingId === 'TAVERN') {
    return { opens: 'tavern' }
  }
  if (HALL_CHAIN.includes(buildingId)) {
    return { opens: 'hall' }
  }
  if (FORT_CHAIN.includes(buildingId)) {
    return { opens: 'fort' }
  }
  if (isMageGuild(buildingId)) {
    return { opens: 'mage-guild' }
  }

  const tier = monsters?.[building.creature]?.tier ?? building.horde?.tier
  return tier ? { opens: 'recruit', tier } : null
}

// The buildings drawn on the town picture, back to front: those standing, except one a standing
// building upgrades (the Castle is drawn in place of the Citadel and Fort). `picture` places each
// building on the faction's 800x374 picture: { x, y, z }.
export function describeTownPicture({ buildings, picture, built, monsters }) {
  return buildingsInEffect({ buildings, built })
    .filter((buildingId) => picture[buildingId])
    .map((buildingId) => {
      const { x, y, z = 0 } = picture[buildingId]
      return {
        buildingId,
        name: buildings[buildingId]?.name ?? buildingId,
        x,
        y,
        z,
        action: openedBy(buildingId, buildings[buildingId] ?? {}, monsters)
      }
    })
    .sort((first, second) => first.z - second.z)
}

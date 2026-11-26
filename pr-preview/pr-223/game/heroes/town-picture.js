import { isMageGuild } from './mage-guild.js'
import { FORT_CHAIN, HALL_CHAIN } from './town-buildings.js'
import { buildingsInEffect } from './town-income.js'

const POND_PRODUCED_NOTHING_YET = 'The pond has not produced anything yet.'

function describeResources(resources, resourceDefinitions) {
  return Object.entries(resources)
    .map(
      ([resourceType, amount]) =>
        `${amount} ${resourceDefinitions?.[resourceType]?.name ?? resourceType}`
    )
    .join(', ')
}

// The building and those it upgrades, the building first: the Fountain of Fortune, then the
// Mystic Pond under it.
function chainOf(buildingId, buildings) {
  const chain = []
  for (
    let id = buildingId;
    id && buildings[id] && !chain.includes(id);
    id = buildings[id].upgrades
  ) {
    chain.push(id)
  }
  return chain
}

// A building with weekly resources (the Mystic Pond), or one built over it, says what it is and
// what it made this week.
function weeklyResourcesMessage(buildingId, { buildings, producedThisWeek, resources }) {
  const chain = chainOf(buildingId, buildings).map((id) => buildings[id])
  if (!chain.some((building) => building.weeklyResources)) {
    return null
  }
  const produced = producedThisWeek
    ? `The pond produced ${describeResources(producedThisWeek, resources)} this week.`
    : POND_PRODUCED_NOTHING_YET
  return [...chain.map((building) => building.description).filter(Boolean), produced].join('\n\n')
}

// What clicking a building opens: the hall the Hall, the fort the Fort window, the Tavern the
// tavern, the Mage Guild its screen, the Blacksmith its war machine's recruit window, the
// Marketplace the trading window, a dwelling or its horde building (Griffin Bastion) the
// dwelling's recruit window, the Mystic Pond its message. The other buildings' screens don't
// exist yet, so clicking them does nothing.
const OPENED_BY_ID = { TAVERN: 'tavern', BLACKSMITH: 'blacksmith', MARKETPLACE: 'marketplace' }

function openedBy(buildingId, building, monsters, town) {
  if (OPENED_BY_ID[buildingId]) {
    return { opens: OPENED_BY_ID[buildingId] }
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
  if (tier) {
    return { opens: 'recruit', tier }
  }
  const message = weeklyResourcesMessage(buildingId, town)
  return message ? { opens: 'message', message } : null
}

// The buildings drawn on the town picture, back to front: those standing, except one a standing
// building upgrades (the Castle is drawn in place of the Citadel and Fort). `picture` places each
// building on the faction's 800x374 picture: { x, y, z }. producedThisWeek: what the town's
// weekly resources made as this week started, if anything.
export function describeTownPicture({
  buildings,
  picture,
  built,
  monsters,
  producedThisWeek = null,
  resources
}) {
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
        action: openedBy(buildingId, buildings[buildingId] ?? {}, monsters, {
          buildings,
          producedThisWeek,
          resources
        })
      }
    })
    .sort((first, second) => first.z - second.z)
}

import { addToArmy, describeRecruit } from '../../../game/heroes/creature-recruitment.js'
import { describeStack } from '../../../game/heroes/hero-army.js'
import { dwellingCreature, isFreeDwelling } from '../../../game/heroes/map-dwellings.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { dwellingAvailable } from '../../../game/heroes/state/map-objects.js'
import { activePlayer, heroOwner } from '../../../game/state/queries.js'
import {
  APP_COMMAND_DWELLING_RECRUIT_REQUESTED,
  APP_FACT_DWELLING_CREATURES_RECRUITED,
  APP_FACT_DWELLING_FLAGGED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_INTERACTION_REACHED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_WORLD_READY,
  APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED,
  APP_UI_DWELLING_RECRUIT_UPDATED,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

function noRoomMessage(stack) {
  return `The ${stack.name} would join your hero, but there aren't enough provisions to support them.`
}

export const registerDwellingsModule = defineModule(
  ({ emit, emitAll, state }) => {
    let definitions = {}

    function dwellingOf(entityId) {
      return state.get().dwellings[entityId] ?? null
    }

    function dwellingName(dwelling) {
      return definitions.dwellings?.[dwelling.type]?.name ?? 'Dwelling'
    }

    function recruitOffer({ heroId, entityId }) {
      const current = state.get()
      const dwelling = dwellingOf(entityId)
      const creature = dwelling && dwellingCreature(dwelling.type, definitions)
      if (!creature) {
        return null
      }

      const available = dwellingAvailable(current, entityId)
      return {
        dwelling,
        available,
        recruit: describeRecruit({
          creature: creature.creature,
          monsters: definitions.monsters,
          resources: definitions.resources,
          available,
          treasury: resourcesOf(current, heroOwner(current, heroId))
        })
      }
    }

    function showMessage(dwelling, message) {
      emit(APP_UI_NOTICE_OPENED, { title: dwellingName(dwelling), message })
    }

    function openRecruitWindow({ heroId, entityId }) {
      const offer = recruitOffer({ heroId, entityId })
      if (offer) {
        emit(APP_UI_DWELLING_RECRUIT_UPDATED, {
          heroId,
          entityId,
          available: offer.available,
          recruits: [offer.recruit]
        })
      }
    }

    function recruitedFacts({ heroId, entityId, creature, count, army, isFree }) {
      const cost = definitions.monsters[creature].cost ?? {}
      const spent = {
        type: APP_FACT_RESOURCES_SPENT,
        detail: {
          player: heroOwner(state.get(), heroId),
          resources: Object.fromEntries(
            Object.entries(cost).map(([resourceType, amount]) => [resourceType, amount * count])
          ),
          reason: 'dwelling.recruit',
          entityId
        }
      }
      return [
        ...(isFree ? [] : [spent]),
        { type: APP_FACT_DWELLING_CREATURES_RECRUITED, detail: { entityId, creature, count } },
        { type: APP_FACT_HERO_ARMY_CHANGED, detail: { heroId, army } }
      ]
    }

    // False when the hero's army has no room for them.
    function joinArmy({ hero, entityId, offer, count, isFree }) {
      const { creature } = offer.recruit
      const army = addToArmy(hero.army, creature, count)
      if (!army) {
        showMessage(offer.dwelling, noRoomMessage(describeStack({ creature, count }, definitions)))
        return false
      }

      emitAll(recruitedFacts({ heroId: hero.id, entityId, creature, count, army, isFree }))
      return true
    }

    // A free dwelling gives every creature it has.
    function takeFreeCreatures({ hero, entityId, offer }) {
      const count = offer.available
      const stack = describeStack({ creature: offer.recruit.creature, count }, definitions)
      if (count === 0) {
        showMessage(offer.dwelling, `There are no ${stack.pluralName} here to recruit.`)
      } else if (joinArmy({ hero, entityId, offer, count, isFree: true })) {
        showMessage(offer.dwelling, `${count} ${stack.name} join your army.`)
      }
    }

    function recruit({ heroId, entityId, count }) {
      const current = state.get()
      const offer = recruitOffer({ heroId, entityId })
      const hero = heroById(current, heroId)
      if (!offer || !hero || heroOwner(current, heroId) !== activePlayer(current)) {
        return
      }

      if (isFreeDwelling(offer.dwelling.type, definitions)) {
        takeFreeCreatures({ hero, entityId, offer })
      } else if (count >= 1 && count <= offer.recruit.maxCount) {
        joinArmy({ hero, entityId, offer, count, isFree: false })
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
          }
        },
        {
          type: APP_FACT_INTERACTION_REACHED,
          handler: (event) => {
            const { entityId, heroId } = event.detail
            const dwelling = dwellingOf(entityId)
            const owner = heroOwner(state.get(), heroId)
            if (dwelling && owner && dwelling.owner !== owner) {
              emit(APP_FACT_DWELLING_FLAGGED, { entityId, entityType: dwelling.type, owner })
            }
          }
        },
        {
          type: APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED,
          handler: (event) => openRecruitWindow(event.detail)
        },
        {
          type: APP_COMMAND_DWELLING_RECRUIT_REQUESTED,
          handler: (event) => recruit(event.detail)
        }
      ]
    }
  },
  {
    id: 'dwellings',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_FACT_INTERACTION_REACHED,
      APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED,
      APP_COMMAND_DWELLING_RECRUIT_REQUESTED
    ],
    produces: [
      APP_FACT_DWELLING_FLAGGED,
      APP_FACT_RESOURCES_SPENT,
      APP_FACT_DWELLING_CREATURES_RECRUITED,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_UI_DWELLING_RECRUIT_UPDATED,
      APP_UI_NOTICE_OPENED
    ]
  }
)

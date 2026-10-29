import { isBonusObject } from '../../../game/domain/entity-queries.js'
import {
  bonusObjectDefinition,
  bonusUntilNextBattle,
  givesBonusUntilNextBattle,
  hasBonusFromObjectType
} from '../../../game/heroes/bonus-objects.js'
import { activePlayer, heroMovementPoints, heroOwner } from '../../../game/state/queries.js'
import {
  APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
  APP_FACT_HERO_BATTLE_BONUS_GAINED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { moraleOrLuckPictureUrl } from '../presentation/morale-and-luck.js'

const SWAN_POND = 'Childhood stories said that a scarlet swan was a portent of good fortune.'
const IDOL_OF_FORTUNE = "You've found an ancient and weathered stone idol."

const MESSAGES_BY_TYPE = Object.freeze({
  FAERIE_RING: {
    gives: 'You enter a faerie ring, and your army gains luck for its next battle.',
    visited: 'You enter a faerie ring, but nothing happens.'
  },
  SWAN_POND: {
    gives: `${SWAN_POND} You decide to rest here for the remainder of the day.`,
    visited: `${SWAN_POND} However, you are still blessed with luck from your last visit here. Since there is nothing more to gain here, you move on.`
  },
  IDOL_OF_FORTUNE: {
    gives: `${IDOL_OF_FORTUNE} Kissing it is supposed to bring luck or happiness, so you do. The stone is very cold to the touch.`,
    visited: `${IDOL_OF_FORTUNE} It is supposed to grant luck or happiness to visitors, but since the stars are already shining upon you, it does nothing.`
  },
  TEMPLE: {
    gives: 'A visit and a prayer at the temple raises the morale of your troops.',
    visited: "It doesn't help to pray twice before a battle. Come back another day."
  }
})

const REWARD_KINDS = Object.freeze([
  { key: 'morale', name: 'Morale' },
  { key: 'luck', name: 'Luck' }
])

function describeRewards(bonus) {
  return REWARD_KINDS.filter(({ key }) => bonus[key]).map(({ key, name }) => ({
    label: `+${bonus[key]} ${name}`,
    amount: bonus[key],
    caption: [`+${bonus[key]}`],
    picture: moraleOrLuckPictureUrl(key)
  }))
}

// Each object gives its morale or luck to a hero who has none from an object of its kind; the
// bonus lasts until the hero's next battle. The Swan Pond also ends the hero's day.
export const registerStatBoostingObjectsModule = defineModule(
  ({ emit, state }) => {
    let definitions = {}
    let entityTypes = new Map()

    function endMovement(heroId) {
      const { max } = heroMovementPoints(state.get(), heroId)
      emit(APP_FACT_MOVEMENT_POINTS_CHANGED, { heroId, value: 0, max })
    }

    function visit({ heroId, entityId }) {
      const current = state.get()
      const type = entityTypes.get(entityId)
      if (!type || heroOwner(current, heroId) !== activePlayer(current)) {
        return
      }

      const messages = MESSAGES_BY_TYPE[type]
      if (hasBonusFromObjectType(current, heroId, type)) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: messages.visited })
        return
      }

      const bonus = bonusUntilNextBattle(definitions, type, current)
      emit(APP_FACT_HERO_BATTLE_BONUS_GAINED, { heroId, entityId, entityType: type, ...bonus })
      if (bonusObjectDefinition(definitions, type).endsMovement) {
        endMovement(heroId)
      }
      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: messages.gives,
        rewards: describeRewards(bonus)
      })
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
            entityTypes = new Map(
              (event.detail.scenario?.entities ?? [])
                .filter(
                  (entity) =>
                    isBonusObject(entity) && givesBonusUntilNextBattle(definitions, entity.type)
                )
                .map((entity) => [entity.id, entity.type])
            )
          }
        },
        {
          type: APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
          handler: (event) => visit(event.detail)
        }
      ]
    }
  },
  {
    id: 'stat-boosting-objects',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED],
    produces: [
      APP_FACT_HERO_BATTLE_BONUS_GAINED,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_UI_NOTICE_OPENED
    ]
  }
)

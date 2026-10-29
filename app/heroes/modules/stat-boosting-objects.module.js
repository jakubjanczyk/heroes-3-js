import { isBonusObject } from '../../../game/domain/entity-queries.js'
import {
  bonusObjectDefinition,
  bonusUntilNextBattle,
  givesMovementPointsUntilEndOfWeek,
  hasUsedStatBoostingObject,
  isStatBoostingObject,
  rollsLuckEachWeek,
  rollWeeklyLuck,
  upgradeArmyAt,
  weeklyLuckOf
} from '../../../game/heroes/bonus-objects.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { activePlayer, heroMovementPoints, heroOwner } from '../../../game/state/queries.js'
import {
  APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_BATTLE_BONUS_GAINED,
  APP_FACT_HERO_WEEK_BONUS_GAINED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { moraleOrLuckPictureUrl } from '../presentation/morale-and-luck.js'

const SWAN_POND = 'Childhood stories said that a scarlet swan was a portent of good fortune.'
const IDOL_OF_FORTUNE = "You've found an ancient and weathered stone idol."
const STABLEMASTER =
  'The stablemaster offers to provide your army with horses, increasing your movement for the remainder of the week'

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
  },
  FOUNTAIN_OF_YOUTH: {
    gives:
      'You drink from the fountain of youth. Your troops feel refreshed and their spirits lift. You can travel a bit further today.',
    visited: 'You drink from the fountain of youth again, but nothing more happens.'
  },
  RALLY_FLAG: {
    gives:
      'You rally your troops around this flag, renewing their strength and lifting their spirits. You feel at your peak, and can travel a bit further today.',
    visited: 'You rally your troops around this flag.'
  },
  FOUNTAIN_OF_FORTUNE: {
    gives: 'As you drink the bittersweet water, you feel your luck changing.',
    visited: 'You drink from the enchanted fountain, but nothing happens.'
  },
  STABLES: {
    gives: `${STABLEMASTER}.`,
    givesAndUpgrades: `${STABLEMASTER} and upgrading all your Cavaliers to Champions.`,
    visited: 'You have already visited the stables this week.',
    upgrades: 'The stablemaster upgrades all your Cavaliers to Champions.'
  }
})

const REWARD_KINDS = Object.freeze([
  { key: 'morale', name: 'Morale' },
  { key: 'luck', name: 'Luck' }
])

const signed = (value) => (value > 0 ? `+${value}` : String(value))

function describeRewards(bonus) {
  return REWARD_KINDS.filter(({ key }) => bonus[key]).map(({ key, name }) => ({
    label: `${signed(bonus[key])} ${name}`,
    amount: bonus[key],
    caption: [signed(bonus[key])],
    picture: moraleOrLuckPictureUrl(key)
  }))
}

// Each object gives its morale or luck to a hero who has none from an object of its kind; the
// bonus lasts until the hero's next battle. The Swan Pond also ends the hero's day, and the
// movement points some give can take the hero above their maximum until the day ends. The
// Stables give theirs each day until the week ends, once a week, and upgrade Cavaliers on every
// visit.
export const registerStatBoostingObjectsModule = defineModule(
  ({ emit, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}
    let entityTypes = new Map()

    function changeMovementPoints(heroId, { endsMovement, movementPoints }) {
      if (!endsMovement && !movementPoints) {
        return
      }

      const { value, max } = heroMovementPoints(state.get(), heroId)
      emit(APP_FACT_MOVEMENT_POINTS_CHANGED, {
        heroId,
        value: endsMovement ? 0 : value + movementPoints,
        max
      })
    }

    function bonusOf(type, entityId, current) {
      if (!rollsLuckEachWeek(definitions, type)) {
        return bonusUntilNextBattle(definitions, type, current)
      }
      const luck = weeklyLuckOf(current, entityId) ?? rollWeeklyLuck(definitions, type, random())
      return { morale: 0, luck }
    }

    function upgradeArmy(heroId, type) {
      const army = upgradeArmyAt(definitions, type, heroById(state.get(), heroId)?.army ?? [])
      if (army) {
        emit(APP_FACT_HERO_ARMY_CHANGED, { heroId, army })
      }
      return Boolean(army)
    }

    function visitStables({ heroId, entityId, type }, messages) {
      if (hasUsedStatBoostingObject(state.get(), heroId, type, definitions)) {
        const upgraded = upgradeArmy(heroId, type)
        emit(APP_UI_NOTICE_OPENED, {
          title: null,
          message: upgraded ? messages.upgrades : messages.visited
        })
        return
      }

      const movementPoints = givesMovementPointsUntilEndOfWeek(definitions, type)
      emit(APP_FACT_HERO_WEEK_BONUS_GAINED, { heroId, entityId, entityType: type, movementPoints })
      changeMovementPoints(heroId, { movementPoints })
      const upgraded = upgradeArmy(heroId, type)
      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: upgraded ? messages.givesAndUpgrades : messages.gives
      })
    }

    function visit({ heroId, entityId }) {
      const current = state.get()
      const type = entityTypes.get(entityId)
      if (!type || heroOwner(current, heroId) !== activePlayer(current)) {
        return
      }

      const messages = MESSAGES_BY_TYPE[type]
      if (givesMovementPointsUntilEndOfWeek(definitions, type)) {
        visitStables({ heroId, entityId, type }, messages)
        return
      }
      if (hasUsedStatBoostingObject(current, heroId, type, definitions)) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: messages.visited })
        return
      }

      const bonus = bonusOf(type, entityId, current)
      emit(APP_FACT_HERO_BATTLE_BONUS_GAINED, { heroId, entityId, entityType: type, ...bonus })
      changeMovementPoints(heroId, bonusObjectDefinition(definitions, type))
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
                    isBonusObject(entity) && isStatBoostingObject(definitions, entity.type)
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
      APP_FACT_HERO_ARMY_CHANGED,
      APP_FACT_HERO_BATTLE_BONUS_GAINED,
      APP_FACT_HERO_WEEK_BONUS_GAINED,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_UI_NOTICE_OPENED
    ]
  }
)

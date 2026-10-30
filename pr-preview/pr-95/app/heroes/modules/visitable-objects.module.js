import { visitableValues } from '../../../game/heroes/state/map-objects.js'
import {
  isVisitableObject,
  rollMissingValues
} from '../../../game/heroes/visitable-objects/definitions.js'
import {
  resolveAcceptedOffer,
  resolveVisit
} from '../../../game/heroes/visitable-objects/visits.js'
import { activePlayer, heroMovementPoints, heroOwner } from '../../../game/state/queries.js'
import {
  APP_COMMAND_GAME_SETUP_REQUESTED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_COMMAND_MAP_OBJECT_VISIT_REQUESTED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_BATTLE_BONUS_GAINED,
  APP_FACT_HERO_BONUS_OBJECT_VISITED,
  APP_FACT_HERO_PRIMARY_SKILLS_GAINED,
  APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
  APP_FACT_HERO_WEEK_BONUS_GAINED,
  APP_FACT_MAP_OBJECT_VALUES_ROLLED,
  APP_FACT_MAP_OBJECT_VISITED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_RESOURCES_GAINED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CONFIRMED,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { describeGains } from '../presentation/visit-rewards.js'

const OFFER_SUBJECT = 'mapObject.offer'

const hasAny = (object) => Object.keys(object ?? {}).length > 0

// The events that give the hero each kind of gain.
const EVENTS_BY_GAIN = Object.freeze({
  experience: ({ amount }, { heroId }) => [
    { type: APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, detail: { heroId, amount } }
  ],
  primarySkills: ({ primarySkills }, { heroId }) => [
    { type: APP_FACT_HERO_PRIMARY_SKILLS_GAINED, detail: { heroId, primarySkills } }
  ],
  secondarySkill: ({ skill, level }, { heroId }) => [
    { type: APP_FACT_HERO_SECONDARY_SKILL_LEARNED, detail: { heroId, skill, level } }
  ],
  battleBonus: ({ morale, luck }, { heroId, entity }) => [
    {
      type: APP_FACT_HERO_BATTLE_BONUS_GAINED,
      detail: { heroId, entityId: entity.id, entityType: entity.type, morale, luck }
    }
  ],
  movementPoints: ({ amount }, { heroId, movementPoints }) => [
    movementPoints(heroId, (value) => value + amount)
  ],
  endsMovement: (_gain, { heroId, movementPoints }) => [movementPoints(heroId, () => 0)],
  weekMovementPoints: ({ amount }, { heroId, entity, movementPoints }) => [
    {
      type: APP_FACT_HERO_WEEK_BONUS_GAINED,
      detail: { heroId, entityId: entity.id, entityType: entity.type, movementPoints: amount }
    },
    movementPoints(heroId, (value) => value + amount)
  ],
  upgradeCreatures: ({ army }, { heroId }) => [
    { type: APP_FACT_HERO_ARMY_CHANGED, detail: { heroId, army } }
  ],
  resources: ({ resources }, { player, entity }) => [
    { type: APP_FACT_RESOURCES_GAINED, detail: { player, resources, entityId: entity.id } }
  ]
})

// A hero's experience is given once the message is shown, so a level it brings opens after it.
const AFTER_MESSAGE = new Set([APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED])

// What a visit to a bonus object or resource generator does comes from the object's data: see
// `game/heroes/visitable-objects/`.
export const registerVisitableObjectsModule = defineModule(
  ({ emit, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}
    let entities = new Map()

    function rollMissingGameValues() {
      const current = state.get()
      const values = Object.fromEntries(
        [...entities.values()]
          .map((entity) => [
            entity.id,
            rollMissingValues({
              definitions,
              entity,
              values: visitableValues(current, entity.id),
              per: 'game',
              random
            })
          ])
          .filter(([, rolled]) => hasAny(rolled))
      )
      if (hasAny(values)) {
        emit(APP_FACT_MAP_OBJECT_VALUES_ROLLED, { values })
      }
    }

    // Movement points are worked out as the event is emitted, from what the earlier ones left.
    function movementPointsChanged(heroId, change) {
      return {
        type: APP_FACT_MOVEMENT_POINTS_CHANGED,
        detail: () => {
          const { value, max } = heroMovementPoints(state.get(), heroId)
          return { heroId, value: change(value), max }
        }
      }
    }

    function emitAll(events) {
      for (const { type, detail } of events) {
        emit(type, typeof detail === 'function' ? detail() : detail)
      }
    }

    // Gives the gains and returns what has to wait until the message is shown.
    function give({ heroId, entity }, { cost, gains, visits, outcome }) {
      const player = heroOwner(state.get(), heroId)
      if (hasAny(cost)) {
        emit(APP_FACT_RESOURCES_SPENT, {
          player,
          resources: cost,
          reason: 'mapObject.visit',
          entityId: entity.id
        })
      }

      const context = { heroId, player, entity, movementPoints: movementPointsChanged }
      const events = gains.flatMap((gain) => EVENTS_BY_GAIN[gain.type]?.(gain, context) ?? [])
      emitAll(events.filter(({ type }) => !AFTER_MESSAGE.has(type)))
      if (visits === 'oncePerHero' && outcome !== 'refused') {
        emit(APP_FACT_HERO_BONUS_OBJECT_VISITED, {
          heroId,
          entityId: entity.id,
          entityType: entity.type
        })
      }
      return events.filter(({ type }) => AFTER_MESSAGE.has(type))
    }

    function openMessage(message, extra = {}) {
      if (message) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message, ...extra })
      }
    }

    function rewardsOf(gains) {
      const rewards = describeGains(gains, definitions)
      return rewards.length > 0 ? { rewards } : {}
    }

    function giveAndTell(visit, result) {
      const afterMessage = give(visit, result)
      openMessage(result.message, rewardsOf(result.gains))
      emitAll(afterMessage)
    }

    function offer({ heroId, entity }, result) {
      const subject = { kind: OFFER_SUBJECT, heroId, entityId: entity.id }
      if (result.outcome === 'choice') {
        const choices = result.choices.map((gains, index) => ({
          id: String(index),
          ...describeGains(gains, definitions)[0]
        }))
        openMessage(result.message, { choices, canCancel: hasAny(result.cost), subject })
        return
      }
      openMessage(result.message, {
        ...rewardsOf(result.gains),
        isQuestion: true,
        subject: { ...subject, isQuestion: true }
      })
    }

    function visit({ heroId, entityId }) {
      const current = state.get()
      const entity = entities.get(entityId)
      const player = heroOwner(current, heroId)
      if (!entity || player !== activePlayer(current)) {
        return
      }
      const result = resolveVisit({ state: current, definitions, entity, heroId, random })
      if (!result) {
        return
      }

      emit(APP_FACT_MAP_OBJECT_VISITED, { heroId, entityId, entityType: entity.type, player })
      if (hasAny(result.rolledValues)) {
        emit(APP_FACT_MAP_OBJECT_VALUES_ROLLED, { values: { [entityId]: result.rolledValues } })
      }
      if (result.outcome === 'choice' || result.outcome === 'question') {
        offer({ heroId, entity }, result)
        return
      }
      giveAndTell({ heroId, entity }, result)
    }

    function accept({ heroId, entityId, isQuestion }, choice) {
      const entity = entities.get(entityId)
      if (!entity || choice === null || (isQuestion && choice !== 'yes')) {
        return
      }
      const accepted = resolveAcceptedOffer({
        state: state.get(),
        definitions,
        entity,
        heroId,
        choice: isQuestion ? null : choice,
        random
      })
      if (accepted) {
        emitAll(give({ heroId, entity }, accepted))
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
            entities = new Map(
              (event.detail.scenario?.entities ?? [])
                .filter(isVisitableObject)
                .map((entity) => [entity.id, entity])
            )
          }
        },
        {
          type: APP_COMMAND_GAME_SETUP_REQUESTED,
          handler: rollMissingGameValues
        },
        {
          type: APP_COMMAND_MAP_OBJECT_VISIT_REQUESTED,
          handler: (event) => visit(event.detail)
        },
        {
          type: APP_UI_INTERACTION_MODAL_CONFIRMED,
          handler: (event) => {
            const { choice, subject } = event.detail
            if (subject?.kind === OFFER_SUBJECT) {
              accept(subject, choice)
            }
          }
        }
      ]
    }
  },
  {
    id: 'visitable-objects',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_GAME_SETUP_REQUESTED,
      APP_COMMAND_MAP_OBJECT_VISIT_REQUESTED,
      APP_UI_INTERACTION_MODAL_CONFIRMED
    ],
    produces: [
      APP_FACT_MAP_OBJECT_VISITED,
      APP_FACT_MAP_OBJECT_VALUES_ROLLED,
      APP_FACT_HERO_BONUS_OBJECT_VISITED,
      APP_FACT_HERO_PRIMARY_SKILLS_GAINED,
      APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
      APP_FACT_HERO_BATTLE_BONUS_GAINED,
      APP_FACT_HERO_WEEK_BONUS_GAINED,
      APP_FACT_HERO_ARMY_CHANGED,
      APP_FACT_MOVEMENT_POINTS_CHANGED,
      APP_FACT_RESOURCES_GAINED,
      APP_FACT_RESOURCES_SPENT,
      APP_UI_NOTICE_OPENED,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED
    ]
  }
)

import { isBonusObject } from '../../../game/domain/entity-queries.js'
import { bonusObjectTaughtSkill, rollTaughtSkill } from '../../../game/heroes/bonus-objects.js'
import { describeSecondarySkill } from '../../../game/heroes/secondary-skills.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import { witchHutSkill } from '../../../game/heroes/state/map-objects.js'
import { activePlayer, heroOwner } from '../../../game/state/queries.js'
import {
  APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
  APP_COMMAND_GAME_SETUP_REQUESTED,
  APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
  APP_FACT_WITCH_HUT_SKILLS_ROLLED,
  APP_FACT_WITCH_HUT_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { initialsOf } from '../presentation/secondary-skill-icon.js'

const MAX_SECONDARY_SKILLS = 8

const STUDYING = (skill) =>
  `You approach the strange hut and observe a witch inside studying an ancient tome on ${skill}. As you approach, she turns`

const MESSAGES = Object.freeze({
  teaches: (skill) =>
    `An ancient witch living in a strange hut welcomes you, offering to teach you ${skill} for her own inscrutable purposes.`,
  alreadyKnown: (skill) =>
    `${STUDYING(skill)} and speaks. "You already know that which I would teach you. I can help you no further."`,
  tooWise: (skill) =>
    `${STUDYING(skill)} and focuses her one glass eye on you. "HA!" she screeches, "I would not presume to try to teach new tricks to someone so clearly as wise as you." You leave, but can't quite shake the feeling that you have just been insulted.`
})

// Each Witch Hut teaches its one skill to any hero who enters without it, without asking. A hero
// who has it already, or has no room for another, is turned away; either way the player now knows
// the skill.
export const registerWitchHutsModule = defineModule(
  ({ emit, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}
    let hutTypes = new Map()

    function rollMissingSkills() {
      const skills = Object.fromEntries(
        [...hutTypes]
          .filter(([entityId]) => !witchHutSkill(state.get(), entityId))
          .map(([entityId, type]) => [entityId, rollTaughtSkill(definitions, type, random())])
      )
      if (Object.keys(skills).length > 0) {
        emit(APP_FACT_WITCH_HUT_SKILLS_ROLLED, { skills })
      }
    }

    function messageFor(hero, skill, skillName) {
      if (hero.secondarySkills.some((known) => known.skill === skill)) {
        return MESSAGES.alreadyKnown(skillName)
      }
      if (hero.secondarySkills.length >= MAX_SECONDARY_SKILLS) {
        return MESSAGES.tooWise(skillName)
      }
      return null
    }

    function visit({ heroId, entityId }) {
      const current = state.get()
      const type = hutTypes.get(entityId)
      const skill = witchHutSkill(current, entityId)
      const player = heroOwner(current, heroId)
      const hero = heroById(current, heroId)
      if (!type || !skill || !hero || player !== activePlayer(current)) {
        return
      }

      const { level } = bonusObjectTaughtSkill(definitions, type)
      const learned = describeSecondarySkill({ skill, level }, definitions)
      const turnedAway = messageFor(hero, skill, learned.name)
      emit(APP_FACT_WITCH_HUT_VISITED, { heroId, entityId, player })
      if (turnedAway) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: turnedAway })
        return
      }

      emit(APP_FACT_HERO_SECONDARY_SKILL_LEARNED, { heroId, skill, level })
      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: MESSAGES.teaches(learned.name),
        rewards: [
          {
            label: learned.title,
            caption: [learned.levelName, learned.name],
            initials: initialsOf(learned.name)
          }
        ]
      })
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
            hutTypes = new Map(
              (event.detail.scenario?.entities ?? [])
                .filter(
                  (entity) =>
                    isBonusObject(entity) && bonusObjectTaughtSkill(definitions, entity.type)
                )
                .map((entity) => [entity.id, entity.type])
            )
          }
        },
        {
          type: APP_COMMAND_GAME_SETUP_REQUESTED,
          handler: rollMissingSkills
        },
        {
          type: APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
          handler: (event) => visit(event.detail)
        }
      ]
    }
  },
  {
    id: 'witch-huts',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_GAME_SETUP_REQUESTED,
      APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED
    ],
    produces: [
      APP_FACT_WITCH_HUT_SKILLS_ROLLED,
      APP_FACT_WITCH_HUT_VISITED,
      APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
      APP_UI_NOTICE_OPENED
    ]
  }
)

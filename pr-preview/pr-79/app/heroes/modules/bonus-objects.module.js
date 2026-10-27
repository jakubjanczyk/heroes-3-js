import { isBonusObject } from '../../../game/domain/entity-queries.js'
import {
  bonusObjectGives,
  describeBonus,
  hasVisitedBonusObject
} from '../../../game/heroes/bonus-objects.js'
import { activePlayer, heroOwner } from '../../../game/state/queries.js'
import {
  APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_HERO_BONUS_OBJECT_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { getChestExperiencePicture } from '../presentation/adventure-sprites.js'
import { primarySkillPictureUrl } from '../presentation/primary-skill-icons.js'

const MERCENARY_CAMP = "You've come upon a camp of mercenaries practicing their combat tactics."
const STAR_AXIS =
  "You've found several of the best astrologers of the land gathered at a Star Axis."

const MESSAGES_BY_TYPE = Object.freeze({
  LEARNING_STONE: {
    gives:
      'A smooth stone on the face of this pillar begins to swirl as you approach. Looking into it, you are amazed to see answers to questions you have pondered for years. The stone suddenly goes still, but you realize you have learned much.',
    visited:
      'You approach the pillar, hoping to gain more insight, but the stone now does nothing more than reflect the sunlight.'
  },
  MERCENARY_CAMP: {
    gives: `${MERCENARY_CAMP} They welcome you and your troops and invite you to train with them.`,
    visited: `${MERCENARY_CAMP} "You're too advanced for us," the mercenary captain says. "We can teach you nothing more."`
  },
  MARLETTO_TOWER: {
    gives: 'The soldiers living in the tower teach you a few new defensive tricks.',
    visited:
      '"I\'m sorry sir," the leader of the soldiers says, "but you already know everything we have to teach."'
  },
  STAR_AXIS: {
    gives: `${STAR_AXIS} Happy to have some company, they teach you how to use the Sun, Moon, and Stars to enhance your spell casting ability.`,
    visited: `${STAR_AXIS} You spend some time chatting with them, but soon realize that there is nothing new for you to learn from them.`
  },
  GARDEN_OF_REVELATION: {
    gives:
      'A monk sitting in the center of a garden invites you to meditate with him. You do, and after a short time you feel enlightened.',
    visited:
      'You enter the garden, and the monk, recognizing you, says, "My child, the blessing of knowledge comes but once in a person\'s lifetime."'
  }
})

function rewardPicture(key) {
  return key === 'experience' ? getChestExperiencePicture() : primarySkillPictureUrl(key)
}

function describeRewards(gives) {
  return describeBonus(gives).map(({ key, amount, label }) => ({
    label: key === 'experience' ? `${amount} Experience` : label,
    amount,
    caption: [key === 'experience' ? String(amount) : `+${amount}`],
    picture: rewardPicture(key)
  }))
}

// Each object gives its bonus once to each hero who enters it.
export const registerBonusObjectsModule = defineModule(
  ({ emit, state }) => {
    let definitions = {}
    let entityTypes = new Map()

    function visit({ heroId, entityId }) {
      const current = state.get()
      const type = entityTypes.get(entityId)
      if (!type || heroOwner(current, heroId) !== activePlayer(current)) {
        return
      }

      const messages = MESSAGES_BY_TYPE[type]
      if (hasVisitedBonusObject(current, heroId, entityId)) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: messages.visited })
        return
      }

      const gives = bonusObjectGives(definitions, type)
      emit(APP_FACT_HERO_BONUS_OBJECT_VISITED, {
        heroId,
        entityId,
        entityType: type,
        primarySkills: gives.primarySkills ?? {}
      })
      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: messages.gives,
        rewards: describeRewards(gives)
      })
      if (gives.experience) {
        emit(APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, { heroId, amount: gives.experience })
      }
    }

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            definitions = event.detail.definitions ?? {}
            entityTypes = new Map(
              (event.detail.scenario?.entities ?? [])
                .filter(isBonusObject)
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
    id: 'bonus-objects',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED],
    produces: [
      APP_FACT_HERO_BONUS_OBJECT_VISITED,
      APP_UI_NOTICE_OPENED,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED
    ]
  }
)

import { isBonusObject } from '../../../game/domain/entity-queries.js'
import {
  bonusObjectDefinition,
  describeBonus,
  hasVisitedBonusObject
} from '../../../game/heroes/bonus-objects.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { canAfford } from '../../../game/heroes/treasury.js'
import { activePlayer, heroOwner } from '../../../game/state/queries.js'
import {
  APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_HERO_BONUS_OBJECT_VISITED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CONFIRMED,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { getChestExperiencePicture } from '../presentation/adventure-sprites.js'
import { primarySkillPictureUrl } from '../presentation/primary-skill-icons.js'

const MERCENARY_CAMP = "You've come upon a camp of mercenaries practicing their combat tactics."
const STAR_AXIS =
  "You've found several of the best astrologers of the land gathered at a Star Axis."
const SCHOOL_OF_WAR = 'The battle-scarred instructor of this school of war grunts as you walk past.'
const SCHOOL_OF_MAGIC = 'The tingle of magic fills the air of this school of mystical arts.'

const CHOICE_SUBJECT = 'bonusObject.choice'

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
  },
  ARENA: {
    gives:
      'You enter the arena and face a pack of vicious lions. You handily defeat them, to the wild cheers of the crowd. Impressed by your skill, the aged trainer of gladiators agrees to train you in a skill of your choice.',
    visited:
      'The Arena guards prevent you from entering. "You\'ve already beaten our best. Begone from here."'
  },
  SCHOOL_OF_WAR: {
    gives: `${SCHOOL_OF_WAR} For a fee of 1000 gold he can teach you your choice of new attack or defense skills.`,
    tooPoor: `${SCHOOL_OF_WAR} He could teach you some new combat tactics, but he charges 1000 gold, which you currently do not have.`,
    visited:
      'The head instructor laughs out loud when you ask to receive more training. "You should be teaching here!" he shouts.'
  },
  SCHOOL_OF_MAGIC: {
    gives: `${SCHOOL_OF_MAGIC} An acolyte offers to sign you up for the next class for 1000 gold. You will have your choice of increasing your knowledge, or learning to better focus your powers.`,
    tooPoor: `${SCHOOL_OF_MAGIC} An acolyte informs you that he could sign you up for the next class, but that you do not have the required tuition of 1000 gold.`,
    visited:
      'An old wizard appears out of thin air. "Master," he says, "you have learned all that we could possibly teach you."'
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

function describeChoices(choices) {
  return choices.map((choice, index) => ({ id: String(index), ...describeRewards(choice)[0] }))
}

// Each object gives its bonus once to each hero who enters it. An object with choices gives the
// one the player picks, for its cost; a hero who leaves without picking can come back.
export const registerBonusObjectsModule = defineModule(
  ({ emit, state }) => {
    let definitions = {}
    let entityTypes = new Map()

    function canPay(heroId, cost) {
      const current = state.get()
      return canAfford(resourcesOf(current, heroOwner(current, heroId)), cost)
    }

    function offerChoices({ heroId, entityId, type }) {
      const { choices, cost } = bonusObjectDefinition(definitions, type)
      const messages = MESSAGES_BY_TYPE[type]
      if (cost && !canPay(heroId, cost)) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: messages.tooPoor })
        return
      }

      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: messages.gives,
        choices: describeChoices(choices),
        canCancel: Boolean(cost),
        subject: { kind: CHOICE_SUBJECT, heroId, entityId }
      })
    }

    function give({ heroId, entityId, type }, gives) {
      emit(APP_FACT_HERO_BONUS_OBJECT_VISITED, {
        heroId,
        entityId,
        entityType: type,
        primarySkills: gives.primarySkills ?? {}
      })
    }

    function giveFree(visit) {
      const gives = bonusObjectDefinition(definitions, visit.type).gives ?? {}
      give(visit, gives)
      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: MESSAGES_BY_TYPE[visit.type].gives,
        rewards: describeRewards(gives)
      })
      if (gives.experience) {
        emit(APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, {
          heroId: visit.heroId,
          amount: gives.experience
        })
      }
    }

    function visit({ heroId, entityId }) {
      const current = state.get()
      const type = entityTypes.get(entityId)
      if (!type || heroOwner(current, heroId) !== activePlayer(current)) {
        return
      }

      if (hasVisitedBonusObject(current, heroId, entityId)) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: MESSAGES_BY_TYPE[type].visited })
        return
      }

      if (bonusObjectDefinition(definitions, type).choices) {
        offerChoices({ heroId, entityId, type })
      } else {
        giveFree({ heroId, entityId, type })
      }
    }

    function givePicked({ heroId, entityId }, choice) {
      const type = entityTypes.get(entityId)
      const { choices, cost } = bonusObjectDefinition(definitions, type)
      const picked = choices?.[Number(choice)]
      if (!picked || hasVisitedBonusObject(state.get(), heroId, entityId)) {
        return
      }

      if (cost) {
        emit(APP_FACT_RESOURCES_SPENT, {
          player: heroOwner(state.get(), heroId),
          resources: cost,
          reason: 'bonusObject.visit',
          entityId
        })
      }
      give({ heroId, entityId, type }, picked)
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
        },
        {
          type: APP_UI_INTERACTION_MODAL_CONFIRMED,
          handler: (event) => {
            const { choice, subject } = event.detail
            if (subject?.kind === CHOICE_SUBJECT && choice !== null) {
              givePicked(subject, choice)
            }
          }
        }
      ]
    }
  },
  {
    id: 'bonus-objects',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
      APP_UI_INTERACTION_MODAL_CONFIRMED
    ],
    produces: [
      APP_FACT_HERO_BONUS_OBJECT_VISITED,
      APP_FACT_RESOURCES_SPENT,
      APP_UI_NOTICE_OPENED,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED
    ]
  }
)

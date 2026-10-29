import { isBonusObject } from '../../../game/domain/entity-queries.js'
import {
  bonusObjectDefinition,
  bonusObjectTaughtSkill,
  describeBonus,
  describePrice,
  hasVisitedBonusObject,
  isStatBoostingObject,
  meetsMinimumHeroLevel,
  rollBonusObjectPrice
} from '../../../game/heroes/bonus-objects.js'
import { experienceToNextLevel } from '../../../game/heroes/hero-experience.js'
import { resourcesOf } from '../../../game/heroes/state/kingdoms.js'
import { bonusObjectPrice } from '../../../game/heroes/state/map-objects.js'
import { canAfford } from '../../../game/heroes/treasury.js'
import { activePlayer, heroOwner } from '../../../game/state/queries.js'
import {
  APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
  APP_COMMAND_GAME_SETUP_REQUESTED,
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_BONUS_OBJECT_PRICES_ROLLED,
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

const TREE_GREETING = 'Upon your approach, the tree opens its eyes in delight.'

const CHOICE_SUBJECT = 'bonusObject.choice'
const LEVEL_OFFER_SUBJECT = 'bonusObject.levelOffer'

const TREE_OF_KNOWLEDGE_MESSAGES = Object.freeze({
  free: `${TREE_GREETING} "Ahh, an adventurer! Allow me to teach you a little of what I have learned over the ages."`,
  paid: (price) =>
    `${TREE_GREETING} "Ahh, an adventurer! I will be happy to teach you a little of what I have learned over the ages for a mere ${price}." (Just bury it around my roots.)`,
  tooPoor: (price) =>
    `Tears brim in the eyes of the tree. "I need ${price}." it whispers. (sniff) "Well, come back when you can pay me."`
})

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
  },
  LIBRARY_OF_ENLIGHTENMENT: {
    gives:
      'The caretaker admits you into the Library of Enlightenment. You are able to learn much in the short time you spend here.',
    tooLowLevel:
      'The caretaker opens the door and looks you up and down. "You are neither famous nor diplomatic enough to be admitted to the Library of Enlightenment," he sniffs. "Come back when you think yourself worthy."',
    visited:
      'Recognizing you, the caretaker refuses to admit you. "The Library of Enlightenment," he says, "may be visited but once."'
  },
  TREE_OF_KNOWLEDGE: {
    visited: `${TREE_GREETING} "It is good to see you, my student. I hope my teachings have helped you."`
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
// one the player picks, for its cost; a hero who leaves without picking can come back. A Tree of
// Knowledge gives the hero one level, for the price rolled for it once per game. A hero below an
// object's minimum level is turned away and can come back later.
export const registerBonusObjectsModule = defineModule(
  ({ emit, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
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

    function rollMissingPrices() {
      const current = state.get()
      const prices = Object.fromEntries(
        [...entityTypes]
          .filter(([entityId, type]) => {
            const { prices: choices } = bonusObjectDefinition(definitions, type)
            return choices && !bonusObjectPrice(current, entityId)
          })
          .map(([entityId, type]) => [entityId, rollBonusObjectPrice(definitions, type, random())])
      )
      if (Object.keys(prices).length > 0) {
        emit(APP_FACT_BONUS_OBJECT_PRICES_ROLLED, { prices })
      }
    }

    const priceOf = (entityId) => bonusObjectPrice(state.get(), entityId) ?? {}
    const experienceMissing = (heroId) =>
      experienceToNextLevel(state.get().heroDetails[heroId]?.experience ?? 0)

    function giveLevel({ heroId, entityId, type }, message) {
      const experience = experienceMissing(heroId)
      const price = priceOf(entityId)
      if (Object.keys(price).length > 0) {
        emit(APP_FACT_RESOURCES_SPENT, {
          player: heroOwner(state.get(), heroId),
          resources: price,
          reason: 'bonusObject.visit',
          entityId
        })
      }
      give({ heroId, entityId, type }, {})
      if (message) {
        emit(APP_UI_NOTICE_OPENED, {
          title: null,
          message,
          rewards: describeRewards({ experience })
        })
      }
      emit(APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED, { heroId, amount: experience })
    }

    function offerLevel({ heroId, entityId, type }) {
      const price = priceOf(entityId)
      const priceText = describePrice(definitions, price)
      if (!priceText) {
        giveLevel({ heroId, entityId, type }, TREE_OF_KNOWLEDGE_MESSAGES.free)
        return
      }

      if (!canPay(heroId, price)) {
        emit(APP_UI_NOTICE_OPENED, {
          title: null,
          message: TREE_OF_KNOWLEDGE_MESSAGES.tooPoor(priceText)
        })
        return
      }

      emit(APP_UI_NOTICE_OPENED, {
        title: null,
        message: TREE_OF_KNOWLEDGE_MESSAGES.paid(priceText),
        rewards: describeRewards({ experience: experienceMissing(heroId) }),
        isQuestion: true,
        subject: { kind: LEVEL_OFFER_SUBJECT, heroId, entityId }
      })
    }

    function acceptLevelOffer({ heroId, entityId }) {
      const type = entityTypes.get(entityId)
      if (
        !type ||
        hasVisitedBonusObject(state.get(), heroId, entityId) ||
        !canPay(heroId, priceOf(entityId))
      ) {
        return
      }

      giveLevel({ heroId, entityId, type }, null)
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

      if (!meetsMinimumHeroLevel(definitions, type, current.heroDetails[heroId] ?? {})) {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: MESSAGES_BY_TYPE[type].tooLowLevel })
        return
      }

      const { choices, prices } = bonusObjectDefinition(definitions, type)
      if (prices) {
        offerLevel({ heroId, entityId, type })
      } else if (choices) {
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
                .filter(
                  (entity) =>
                    isBonusObject(entity) &&
                    !bonusObjectTaughtSkill(definitions, entity.type) &&
                    !isStatBoostingObject(definitions, entity.type)
                )
                .map((entity) => [entity.id, entity.type])
            )
          }
        },
        {
          type: APP_COMMAND_GAME_SETUP_REQUESTED,
          handler: rollMissingPrices
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
            } else if (subject?.kind === LEVEL_OFFER_SUBJECT && choice === 'yes') {
              acceptLevelOffer(subject)
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
      APP_COMMAND_GAME_SETUP_REQUESTED,
      APP_COMMAND_BONUS_OBJECT_VISIT_REQUESTED,
      APP_UI_INTERACTION_MODAL_CONFIRMED
    ],
    produces: [
      APP_FACT_HERO_BONUS_OBJECT_VISITED,
      APP_FACT_BONUS_OBJECT_PRICES_ROLLED,
      APP_FACT_RESOURCES_SPENT,
      APP_UI_NOTICE_OPENED,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED
    ]
  }
)

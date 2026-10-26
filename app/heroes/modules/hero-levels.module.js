import { levelForExperience, rollPrimarySkill } from '../../../game/heroes/hero-experience.js'
import { PRIMARY_SKILLS } from '../../../game/heroes/primary-skills.js'
import {
  describeSecondarySkill,
  offerSecondarySkills
} from '../../../game/heroes/secondary-skills.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import {
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_HERO_EXPERIENCE_GAINED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CONFIRMED,
  APP_UI_NOTICE_OPENED,
  APP_UI_RESTORE_COMPLETED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { initialsOf } from '../presentation/secondary-skill-icon.js'

const LEVEL_UP_SUBJECT = 'hero.levelUp'

function primarySkillName(key) {
  return PRIMARY_SKILLS.find((skill) => skill.key === key).name
}

function skillChoice(offer, definitions) {
  const { name, levelName, title } = describeSecondarySkill(offer, definitions)
  return { id: offer.skill, label: title, caption: [levelName, name], initials: initialsOf(name) }
}

// A hero's levels, one at a time: each rolls a primary skill by the hero class's chances and
// offers secondary skills to pick from, and the next level waits for the pick. The rolls and the
// pick are logged as facts, so a reload replays them instead of rolling again.
export const registerHeroLevelsModule = defineModule(
  ({ emit, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}

    function openLevelUpPopup(hero, { level, primarySkill, skillOffers }) {
      const heroClass = definitions.heroClasses?.[hero.heroClass] ?? null
      emit(APP_UI_NOTICE_OPENED, {
        title: `${hero.name} has gained a level.`,
        message: `${hero.name} is now a level ${level} ${heroClass?.name ?? ''}.`,
        details: [`+1 ${primarySkillName(primarySkill)}`],
        choices: skillOffers.map((offer) => skillChoice(offer, definitions)),
        subject: { kind: LEVEL_UP_SUBJECT, heroId: hero.id }
      })
    }

    function levelUpOnce(heroId) {
      const hero = heroById(state.get(), heroId)
      if (!hero || hero.level >= levelForExperience(hero.experience)) {
        return
      }

      const heroClass = definitions.heroClasses?.[hero.heroClass] ?? null
      const level = hero.level + 1
      const levelUp = {
        level,
        primarySkill: rollPrimarySkill({ heroClass, level, roll: random() }),
        skillOffers: offerSecondarySkills({
          secondarySkills: hero.secondarySkills,
          weights: heroClass?.secondarySkillWeights,
          random
        })
      }
      emit(APP_FACT_HERO_LEVELED_UP, { heroId, ...levelUp })
      openLevelUpPopup(hero, levelUp)
    }

    function learnPickedSkill(heroId, choice) {
      const offer = heroById(state.get(), heroId)?.pendingLevelUp?.skillOffers.find(
        ({ skill }) => skill === choice
      )
      if (offer) {
        emit(APP_FACT_HERO_SECONDARY_SKILL_LEARNED, { heroId, ...offer })
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
          type: APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
          handler: (event) => {
            const { heroId, amount } = event.detail
            if (!heroById(state.get(), heroId)) {
              return
            }

            emit(APP_FACT_HERO_EXPERIENCE_GAINED, { heroId, amount })
            levelUpOnce(heroId)
          }
        },
        {
          type: APP_UI_INTERACTION_MODAL_CONFIRMED,
          handler: (event) => {
            const { choice, subject } = event.detail
            if (subject?.kind !== LEVEL_UP_SUBJECT) {
              return
            }

            learnPickedSkill(subject.heroId, choice)
            levelUpOnce(subject.heroId)
          }
        },
        // A level-up whose popup was open when the page closed shows again, as do levels gained
        // and not yet taken.
        {
          type: APP_UI_RESTORE_COMPLETED,
          handler: () => {
            for (const heroId of Object.keys(state.get().heroDetails)) {
              const hero = heroById(state.get(), heroId)
              if (hero.pendingLevelUp) {
                openLevelUpPopup(hero, hero.pendingLevelUp)
              } else {
                levelUpOnce(heroId)
              }
            }
          }
        }
      ]
    }
  },
  {
    id: 'hero-levels',
    phase: 'domain',
    consumes: [
      APP_FACT_WORLD_READY,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
      APP_UI_INTERACTION_MODAL_CONFIRMED,
      APP_UI_RESTORE_COMPLETED
    ],
    produces: [
      APP_FACT_HERO_EXPERIENCE_GAINED,
      APP_FACT_HERO_LEVELED_UP,
      APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
      APP_UI_NOTICE_OPENED
    ]
  }
)

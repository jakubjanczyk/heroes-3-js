import { findHero } from '../../../game/domain/entity-queries.js'
import { levelForExperience, rollPrimarySkill } from '../../../game/heroes/hero-experience.js'
import { PRIMARY_SKILLS } from '../../../game/heroes/primary-skills.js'
import {
  APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
  APP_FACT_HERO_EXPERIENCE_GAINED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'

function primarySkillName(key) {
  return PRIMARY_SKILLS.find((skill) => skill.key === key).name
}

// The hero's experience and levels. Each level gained rolls a primary skill by the hero class's
// chances and shows a Heroes 3 level-up popup. The rolls are logged as facts, so a reload
// replays the same skills instead of rolling again.
export const registerHeroLevelsModule = defineModule(
  ({ emit, config }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let experience = 0
    let heroName = ''
    let heroClass = null

    return {
      subscriptions: [
        {
          type: APP_FACT_WORLD_READY,
          handler: (event) => {
            const { scenario, definitions } = event.detail
            experience = findHero(scenario.entities)?.experience ?? 0
            heroName = definitions?.hero?.name ?? ''
            heroClass = definitions?.heroClasses?.[definitions?.hero?.heroClass] ?? null
          }
        },
        {
          type: APP_FACT_HERO_EXPERIENCE_GAINED,
          handler: (event) => {
            experience += event.detail.amount
          }
        },
        {
          type: APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED,
          handler: (event) => {
            const levelBefore = levelForExperience(experience)
            emit(APP_FACT_HERO_EXPERIENCE_GAINED, { amount: event.detail.amount })

            for (let level = levelBefore + 1; level <= levelForExperience(experience); level += 1) {
              const primarySkill = rollPrimarySkill({ heroClass, level, roll: random() })
              emit(APP_FACT_HERO_LEVELED_UP, { level, primarySkill })
              emit(APP_UI_NOTICE_OPENED, {
                title: `${heroName} has gained a level.`,
                message: `${heroName} is now a level ${level} ${heroClass.name}.`,
                details: [`+1 ${primarySkillName(primarySkill)}`]
              })
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
      APP_FACT_HERO_EXPERIENCE_GAINED,
      APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED
    ],
    produces: [APP_FACT_HERO_EXPERIENCE_GAINED, APP_FACT_HERO_LEVELED_UP, APP_UI_NOTICE_OPENED]
  }
)

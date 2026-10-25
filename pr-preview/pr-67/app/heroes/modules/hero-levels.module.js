import { levelForExperience, rollPrimarySkill } from '../../../game/heroes/hero-experience.js'
import { PRIMARY_SKILLS } from '../../../game/heroes/primary-skills.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
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

// A hero's levels. Each level gained rolls a primary skill by the hero class's chances and shows a
// Heroes 3 level-up popup. The rolls are logged as facts, so a reload replays the same skills
// instead of rolling again.
export const registerHeroLevelsModule = defineModule(
  ({ emit, config, state }) => {
    const random = typeof config?.random === 'function' ? config.random : Math.random
    let definitions = {}

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
            const hero = heroById(state.get(), heroId)
            if (!hero) {
              return
            }

            const heroClass = definitions.heroClasses?.[hero.heroClass] ?? null
            const levelBefore = levelForExperience(hero.experience)
            const levelAfter = levelForExperience(hero.experience + amount)
            emit(APP_FACT_HERO_EXPERIENCE_GAINED, { heroId, amount })

            for (let level = levelBefore + 1; level <= levelAfter; level += 1) {
              const primarySkill = rollPrimarySkill({ heroClass, level, roll: random() })
              emit(APP_FACT_HERO_LEVELED_UP, { heroId, level, primarySkill })
              emit(APP_UI_NOTICE_OPENED, {
                title: `${hero.name} has gained a level.`,
                message: `${hero.name} is now a level ${level} ${heroClass.name}.`,
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
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED],
    produces: [APP_FACT_HERO_EXPERIENCE_GAINED, APP_FACT_HERO_LEVELED_UP, APP_UI_NOTICE_OPENED]
  }
)

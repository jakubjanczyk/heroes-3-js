import {
  PICTURES_PER_SCHOLAR_WINDOW,
  SCHOLAR,
  scholarMessage,
  scholarTeaching
} from '../../../game/heroes/scholar.js'
import { describeSecondarySkill } from '../../../game/heroes/secondary-skills.js'
import { heroById } from '../../../game/heroes/state/hero-details.js'
import {
  APP_COMMAND_HEROES_SPELLS_TEACH_REQUESTED,
  APP_FACT_HERO_SPELLS_LEARNED,
  APP_FACT_WORLD_READY,
  APP_UI_NOTICE_OPENED
} from '../../events.js'
import { defineModule } from '../../modules/shared/module-runtime.js'
import { initialsOf } from '../presentation/secondary-skill-icon.js'

function inWindows(pictures) {
  const windows = []
  for (let start = 0; start < pictures.length; start += PICTURES_PER_SCHOLAR_WINDOW) {
    windows.push(pictures.slice(start, start + PICTURES_PER_SCHOLAR_WINDOW))
  }
  return windows
}

// Two heroes meeting teach each other spells when one of them has Scholar.
export const registerScholarModule = defineModule(
  ({ emit, emitAll, state }) => {
    let definitions = {}

    const spellName = (spellId) => definitions.spells?.[spellId]?.name ?? spellId

    function spellPicture(spellId) {
      const name = spellName(spellId)
      return { label: name, caption: [name], isSpellScroll: true }
    }

    function scholarPicture(level) {
      const skill = describeSecondarySkill({ skill: SCHOLAR, level }, definitions)
      return { label: skill.title, caption: [skill.title], initials: initialsOf(skill.name) }
    }

    function showMessages({ scholar, other, level, learned, taught }) {
      const message = scholarMessage({
        scholarName: scholar.name,
        otherName: other.name,
        learnedNames: learned.map(spellName),
        taughtNames: taught.map(spellName)
      })
      const pictures = [scholarPicture(level), ...[...learned, ...taught].map(spellPicture)]
      inWindows(pictures).forEach((rewards, index) => {
        emit(APP_UI_NOTICE_OPENED, { title: null, message: index === 0 ? message : '', rewards })
      })
    }

    function teach({ left, right }) {
      const teaching = scholarTeaching({
        walker: heroById(state.get(), left),
        met: heroById(state.get(), right),
        spells: definitions.spells
      })
      if (!teaching || (teaching.learned.length === 0 && teaching.taught.length === 0)) {
        return
      }
      const { scholar, other, learned, taught } = teaching
      emitAll(
        [
          { heroId: scholar.id, spells: learned },
          { heroId: other.id, spells: taught }
        ]
          .filter(({ spells }) => spells.length > 0)
          .map((detail) => ({ type: APP_FACT_HERO_SPELLS_LEARNED, detail }))
      )
      showMessages(teaching)
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
          type: APP_COMMAND_HEROES_SPELLS_TEACH_REQUESTED,
          handler: (event) => teach(event.detail.heroIds)
        }
      ]
    }
  },
  {
    id: 'scholar',
    phase: 'domain',
    consumes: [APP_FACT_WORLD_READY, APP_COMMAND_HEROES_SPELLS_TEACH_REQUESTED],
    produces: [APP_FACT_HERO_SPELLS_LEARNED, APP_UI_NOTICE_OPENED]
  }
)

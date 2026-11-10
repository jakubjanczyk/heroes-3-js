import { PRIMARY_SKILLS } from '../../../game/heroes/primary-skills.js'
import { describeSecondarySkill } from '../../../game/heroes/secondary-skills.js'
import { getChestExperiencePicture } from './adventure-sprites.js'
import { moraleOrLuckPictureUrl } from './morale-and-luck.js'
import { primarySkillPictureUrl } from './primary-skill-icons.js'
import { getResourceSpriteStyle } from './resource-sprites.js'
import { initialsOf } from './secondary-skill-icon.js'

const signed = (value) => (value > 0 ? `+${value}` : String(value))

const MORALE_AND_LUCK = Object.freeze([
  { key: 'morale', name: 'Morale' },
  { key: 'luck', name: 'Luck' }
])

// The pictures under a map object's message, one per thing the hero gains. Movement points and
// upgraded creatures have none.
const PICTURES_BY_GAIN = Object.freeze({
  experience: ({ amount }) => [
    {
      label: `${amount} Experience`,
      amount,
      caption: [String(amount)],
      picture: getChestExperiencePicture()
    }
  ],
  primarySkills: ({ primarySkills }) =>
    PRIMARY_SKILLS.filter(({ key }) => primarySkills[key]).map(({ key, name }) => ({
      label: `+${primarySkills[key]} ${name}`,
      amount: primarySkills[key],
      caption: [`+${primarySkills[key]}`],
      picture: primarySkillPictureUrl(key)
    })),
  secondarySkill: ({ skill, level }, definitions) => {
    const learned = describeSecondarySkill({ skill, level }, definitions)
    return [
      {
        label: learned.title,
        caption: [learned.levelName, learned.name],
        initials: initialsOf(learned.name)
      }
    ]
  },
  battleBonus: (bonus) =>
    MORALE_AND_LUCK.filter(({ key }) => bonus[key]).map(({ key, name }) => ({
      label: `${signed(bonus[key])} ${name}`,
      amount: bonus[key],
      caption: [signed(bonus[key])],
      picture: moraleOrLuckPictureUrl(key)
    })),
  resources: ({ resources }, definitions) =>
    Object.entries(resources).map(([resourceType, amount]) => ({
      label: `${amount} ${definitions.resources?.[resourceType]?.name ?? resourceType}`,
      amount,
      picture: getResourceSpriteStyle(resourceType).backgroundImage
    }))
})

export function describeGains(gains, definitions = {}) {
  return gains.flatMap((gain) => PICTURES_BY_GAIN[gain.type]?.(gain, definitions) ?? [])
}

import { describeRecruit } from './creature-recruitment.js'

export const ONLY_VISITING_HEROES = 'Only visiting heroes may use the Blacksmith.'

export const warMachineSoldIn = (definitions, townType) =>
  definitions?.towns?.[townType]?.blacksmith ?? null

const hasWarMachine = (hero, artifactId) =>
  Object.values(hero?.artifacts?.worn ?? {}).includes(artifactId)

// The recruit window's offer: the war machine, one available unless the hero already has one.
export function describeBlacksmith({ artifactId, hero, definitions, treasury }) {
  const artifact = definitions.artifacts[artifactId]
  const available = hasWarMachine(hero, artifactId) ? 0 : 1
  const recruit = describeRecruit({
    creature: artifact.creature,
    monsters: definitions.monsters,
    resources: definitions.resources,
    available,
    treasury
  })
  return {
    available,
    recruits: [{ ...recruit, creature: artifactId, name: artifact.name }]
  }
}

export const warMachineCost = (artifactId, definitions) =>
  definitions.monsters[definitions.artifacts[artifactId].creature].cost ?? {}

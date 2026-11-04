import { APP_FACT_ENTITY_REMOVED } from '../../events.js'

// An outcome that takes its entity off the map also emits the generic removal fact,
// committed together with the outcome's own facts (on modal close when it has a modal).
function withEntityRemoval(effects, outcome) {
  if (!effects || !outcome.removesEntity) {
    return effects
  }

  const removal = { type: APP_FACT_ENTITY_REMOVED, detail: { entityId: outcome.entityId } }
  if (effects.factsOnModalClosed) {
    return { ...effects, factsOnModalClosed: [...effects.factsOnModalClosed, removal] }
  }

  return { ...effects, facts: [...(effects.facts ?? []), removal] }
}

export function getInteractionEffects(outcome, outcomeEffects = {}) {
  return withEntityRemoval(outcomeEffects[outcome?.kind]?.(outcome) ?? null, outcome)
}

// The spells rolled for each town's Mage Guild: { [townId]: { [level]: spellIds } }.
export const mageGuildsSlice = {
  key: 'mageGuilds',
  initial: () => ({}),
  on: {
    'fact.mageGuild.spellsRolled': (mageGuilds, { entityId, level, spells }) => ({
      ...mageGuilds,
      [entityId]: { ...mageGuilds[entityId], [level]: spells }
    })
  }
}

export function mageGuildSpellsOf(state, townId) {
  return state.mageGuilds[townId] ?? {}
}

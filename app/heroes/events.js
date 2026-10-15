export const HEROES_COMMAND_END_TURN_REQUESTED = 'command.turn.end.requested';
export const HEROES_COMMAND_MUSIC_TOGGLE_REQUESTED = 'command.music.toggle.requested';

export const HEROES_FACT_TURN_ENDED = 'fact.turn.ended';
export const HEROES_FACT_MONSTER_DEFEATED = 'fact.monster.defeated';
export const HEROES_FACT_RESOURCE_COLLECTED = 'fact.resource.collected';
export const HEROES_FACT_TOWN_VISITED = 'fact.town.visited';

export const HEROES_UI_MUSIC_STATE_CHANGED = 'ui.music.state.changed';

export const HEROES_PERSISTED_FACT_TYPES = Object.freeze([
  HEROES_FACT_TURN_ENDED,
  HEROES_FACT_MONSTER_DEFEATED,
  HEROES_FACT_RESOURCE_COLLECTED,
  HEROES_FACT_TOWN_VISITED
]);

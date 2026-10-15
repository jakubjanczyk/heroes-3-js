export const APP_COMMAND_END_TURN_REQUESTED = 'command.turn.end.requested';
export const APP_COMMAND_MUSIC_TOGGLE_REQUESTED = 'command.music.toggle.requested';

export const APP_FACT_TURN_ENDED = 'fact.turn.ended';
export const APP_FACT_MONSTER_DEFEATED = 'fact.monster.defeated';
export const APP_FACT_RESOURCE_COLLECTED = 'fact.resource.collected';
export const APP_FACT_TOWN_VISITED = 'fact.town.visited';

export const APP_UI_MUSIC_STATE_CHANGED = 'ui.music.state.changed';

export const PERSISTED_FACT_TYPES = Object.freeze([
  APP_FACT_TURN_ENDED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED
]);

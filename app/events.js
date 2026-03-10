export const APP_COMMAND_APP_START = 'command.app.start';
export const APP_COMMAND_TILE_CLICKED = 'command.tile.clicked';
export const APP_COMMAND_MOVE_REQUESTED = 'command.move.requested';
export const APP_COMMAND_END_TURN_REQUESTED = 'command.turn.end.requested';
export const APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED =
  'command.turn.spendMovementPoints.requested';
export const APP_COMMAND_RESET_SESSION_REQUESTED = 'command.session.reset.requested';
export const APP_COMMAND_MUSIC_TOGGLE_REQUESTED = 'command.music.toggle.requested';
export const APP_COMMAND_CAMERA_PAN_BY = 'command.camera.panBy';
export const APP_COMMAND_CAMERA_CENTER_ON_TILE = 'command.camera.centerOnTile';

export const APP_FACT_WORLD_READY = 'fact.world.ready';
export const APP_FACT_WORLD_LOAD_FAILED = 'fact.world.load.failed';
export const APP_FACT_MOVE_STARTED = 'fact.move.started';
export const APP_FACT_MOVE_FINISHED = 'fact.move.finished';
export const APP_FACT_HERO_MOVED = 'fact.hero.moved';
export const APP_FACT_MOVEMENT_POINTS_CHANGED = 'fact.hero.movementPoints.changed';
export const APP_FACT_TURN_ENDED = 'fact.turn.ended';
export const APP_FACT_MONSTER_DEFEATED = 'fact.monster.defeated';
export const APP_FACT_RESOURCE_COLLECTED = 'fact.resource.collected';
export const APP_FACT_RESOURCE_COLLECTION_BLOCKING_CHANGED =
  'fact.resource.collection.blocking.changed';
export const APP_FACT_TOWN_VISITED = 'fact.town.visited';
export const APP_FACT_PREVIEW_TARGET_SELECTED = 'fact.preview.target.selected';
export const APP_FACT_PREVIEW_CLEARED = 'fact.preview.cleared';

export const APP_UI_PREVIEW_UPDATED = 'ui.preview.updated';
export const APP_UI_MUSIC_STATE_CHANGED = 'ui.music.state.changed';
export const APP_UI_INTERACTION_MODAL_OPENED = 'ui.interaction.modal.opened';
export const APP_UI_INTERACTION_MODAL_CLOSED = 'ui.interaction.modal.closed';
export const APP_UI_CAMERA_UPDATED = 'ui.camera.updated';
export const APP_UI_WORLD_MOTION_UPDATED = 'ui.world.motion.updated';
export const APP_UI_ENTITY_FADE_OUT_REQUESTED = 'ui.entity.fadeOut.requested';
export const APP_UI_RESOURCE_COLLECTION_STARTED = 'ui.resource.collection.started';

const APP_PERSISTED_FACT_TYPES = new Set([
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_TURN_ENDED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_PREVIEW_CLEARED
]);

export function shouldPersistFactEvent(type) {
  return APP_PERSISTED_FACT_TYPES.has(type);
}

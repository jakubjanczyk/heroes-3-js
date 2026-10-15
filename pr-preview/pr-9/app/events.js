export const APP_COMMAND_APP_START = 'command.app.start';
export const APP_COMMAND_TILE_CLICKED = 'command.tile.clicked';
export const APP_COMMAND_MOVE_REQUESTED = 'command.move.requested';
export const APP_COMMAND_ROUTE_REQUESTED = 'command.route.requested';
export const APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED =
  'command.turn.spendMovementPoints.requested';
export const APP_COMMAND_RESET_SESSION_REQUESTED = 'command.session.reset.requested';
export const APP_COMMAND_CAMERA_PAN_BY = 'command.camera.panBy';
export const APP_COMMAND_CAMERA_CENTER_ON_TILE = 'command.camera.centerOnTile';

export const APP_FACT_WORLD_READY = 'fact.world.ready';
export const APP_FACT_WORLD_LOAD_FAILED = 'fact.world.load.failed';
export const APP_FACT_MOVE_STARTED = 'fact.move.started';
export const APP_FACT_MOVE_FINISHED = 'fact.move.finished';
export const APP_FACT_HERO_MOVED = 'fact.hero.moved';
export const APP_FACT_ROUTE_PLANNED = 'fact.route.planned';
export const APP_FACT_MOVEMENT_POINTS_CHANGED = 'fact.hero.movementPoints.changed';
export const APP_FACT_ENTITY_REMOVED = 'fact.entity.removed';
export const APP_FACT_PREVIEW_TARGET_SELECTED = 'fact.preview.target.selected';
export const APP_FACT_PREVIEW_CLEARED = 'fact.preview.cleared';

export const APP_UI_PREVIEW_UPDATED = 'ui.preview.updated';
export const APP_UI_INTERACTION_MODAL_OPENED = 'ui.interaction.modal.opened';
export const APP_UI_INTERACTION_MODAL_CLOSED = 'ui.interaction.modal.closed';
export const APP_UI_CAMERA_UPDATED = 'ui.camera.updated';
export const APP_UI_WORLD_MOTION_UPDATED = 'ui.world.motion.updated';
export const APP_UI_RESTORE_STARTED = 'ui.restore.started';
export const APP_UI_RESTORE_COMPLETED = 'ui.restore.completed';

const APP_PERSISTED_FACT_TYPES = Object.freeze([
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_PREVIEW_CLEARED
]);

// Saved facts are the core ones plus the ones the game's content adds.
export function createFactPersistencePolicy(contentFactTypes = []) {
  const persistedTypes = new Set([...APP_PERSISTED_FACT_TYPES, ...contentFactTypes]);
  return (type) => persistedTypes.has(type);
}

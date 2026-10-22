export const APP_COMMAND_APP_START = 'command.app.start'
export const APP_COMMAND_TILE_CLICKED = 'command.tile.clicked'
export const APP_COMMAND_MOVE_REQUESTED = 'command.move.requested'
export const APP_COMMAND_MOVE_CONTINUE_REQUESTED = 'command.move.continue.requested'
export const APP_COMMAND_ROUTE_REQUESTED = 'command.route.requested'
export const APP_COMMAND_TURN_SPEND_MOVEMENT_POINTS_REQUESTED =
  'command.turn.spendMovementPoints.requested'
export const APP_COMMAND_RESET_SESSION_REQUESTED = 'command.session.reset.requested'
export const APP_COMMAND_CAMERA_PAN_BY = 'command.camera.panBy'
export const APP_COMMAND_CAMERA_CENTER_ON_TILE = 'command.camera.centerOnTile'
export const APP_COMMAND_END_TURN_REQUESTED = 'command.turn.end.requested'
export const APP_COMMAND_MUSIC_TOGGLE_REQUESTED = 'command.music.toggle.requested'
export const APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED = 'command.hero.experience.gain.requested'
export const APP_COMMAND_BATTLE_AUTO_COMBAT_REQUESTED = 'command.battle.autoCombat.requested'
export const APP_COMMAND_BATTLE_STACK_MOVE_REQUESTED = 'command.battle.stackMove.requested'
export const APP_COMMAND_BATTLE_STACK_ATTACK_REQUESTED = 'command.battle.stackAttack.requested'
export const APP_COMMAND_BATTLE_STACK_SHOOT_REQUESTED = 'command.battle.stackShoot.requested'
export const APP_COMMAND_BATTLE_STACK_WAIT_REQUESTED = 'command.battle.stackWait.requested'
export const APP_COMMAND_BATTLE_STACK_DEFEND_REQUESTED = 'command.battle.stackDefend.requested'
export const APP_COMMAND_BATTLE_RETREAT_REQUESTED = 'command.battle.retreat.requested'
export const APP_COMMAND_BATTLE_RESULTS_CLOSE_REQUESTED = 'command.battle.resultsClose.requested'
export const APP_COMMAND_TOWN_LEAVE_REQUESTED = 'command.town.leave.requested'
export const APP_COMMAND_TOWN_OPEN_REQUESTED = 'command.town.open.requested'
export const APP_COMMAND_TOWN_BUILD_REQUESTED = 'command.town.build.requested'
export const APP_COMMAND_TOWN_RECRUIT_REQUESTED = 'command.town.recruit.requested'

export const APP_FACT_WORLD_READY = 'fact.world.ready'
export const APP_FACT_WORLD_LOAD_FAILED = 'fact.world.load.failed'
export const APP_FACT_MOVE_STARTED = 'fact.move.started'
export const APP_FACT_MOVE_FINISHED = 'fact.move.finished'
// What the hero still does where it stopped once the interaction under way is over.
export const APP_FACT_INTERACTIONS_QUEUED = 'fact.interactions.queued'
// The hero interacts with an entity now: right as it stops, or once what was queued before is over.
export const APP_FACT_INTERACTION_REACHED = 'fact.interaction.reached'
export const APP_FACT_HERO_MOVED = 'fact.hero.moved'
export const APP_FACT_ROUTE_PLANNED = 'fact.route.planned'
export const APP_FACT_MOVEMENT_POINTS_CHANGED = 'fact.hero.movementPoints.changed'
export const APP_FACT_ENTITY_REMOVED = 'fact.entity.removed'
export const APP_FACT_PREVIEW_TARGET_SELECTED = 'fact.preview.target.selected'
export const APP_FACT_PREVIEW_CLEARED = 'fact.preview.cleared'
export const APP_FACT_TURN_ENDED = 'fact.turn.ended'
export const APP_FACT_BATTLE_STARTED = 'fact.battle.started'
// The battle is over and its results window is open; it ends when the player closes the window.
export const APP_FACT_BATTLE_FINISHED = 'fact.battle.finished'
export const APP_FACT_BATTLE_ENDED = 'fact.battle.ended'
export const APP_FACT_BATTLE_STACK_MOVED = 'fact.battle.stack.moved'
export const APP_FACT_BATTLE_STACK_ATTACKED = 'fact.battle.stack.attacked'
export const APP_FACT_BATTLE_STACK_SHOT = 'fact.battle.stack.shot'
export const APP_FACT_BATTLE_TURN_ENDED = 'fact.battle.turn.ended'
export const APP_FACT_BATTLE_STACK_WAITED = 'fact.battle.stack.waited'
export const APP_FACT_BATTLE_STACK_DEFENDED = 'fact.battle.stack.defended'
export const APP_FACT_BATTLE_AUTO_COMBAT_CHANGED = 'fact.battle.autoCombat.changed'
export const APP_FACT_MONSTER_DEFEATED = 'fact.monster.defeated'
export const APP_FACT_MONSTER_COUNT_CHANGED = 'fact.monster.count.changed'
export const APP_FACT_RESOURCE_COLLECTED = 'fact.resource.collected'
export const APP_FACT_TOWN_VISITED = 'fact.town.visited'
export const APP_FACT_TOWN_OPENED = 'fact.town.opened'
export const APP_FACT_TOWN_LEFT = 'fact.town.left'
export const APP_FACT_TOWN_CAPTURED = 'fact.town.captured'
export const APP_FACT_TOWN_BUILDING_BUILT = 'fact.town.building.built'
// Creatures bought from a town's dwelling, leaving fewer there to buy.
export const APP_FACT_TOWN_CREATURES_RECRUITED = 'fact.town.creatures.recruited'
export const APP_FACT_TOWN_GARRISON_CHANGED = 'fact.town.garrison.changed'
export const APP_FACT_MINE_CAPTURED = 'fact.mine.captured'
export const APP_FACT_INCOME_COLLECTED = 'fact.income.collected'
export const APP_FACT_RESOURCES_SPENT = 'fact.resources.spent'
export const APP_FACT_TREASURE_CHEST_OPENED = 'fact.treasureChest.opened'
export const APP_FACT_HERO_EXPERIENCE_GAINED = 'fact.hero.experience.gained'
export const APP_FACT_HERO_LEVELED_UP = 'fact.hero.leveledUp'
export const APP_FACT_HERO_ARMY_CHANGED = 'fact.hero.army.changed'

export const APP_UI_PREVIEW_UPDATED = 'ui.preview.updated'
export const APP_UI_INTERACTION_MODAL_OPENED = 'ui.interaction.modal.opened'
export const APP_UI_NOTICE_OPENED = 'ui.notice.opened'
export const APP_UI_INTERACTION_MODAL_CLOSED = 'ui.interaction.modal.closed'
export const APP_UI_CAMERA_UPDATED = 'ui.camera.updated'
export const APP_UI_TILE_HOVERED = 'ui.tile.hovered'
export const APP_UI_MAP_EDGE_SCROLLED = 'ui.map.edgeScrolled'
export const APP_UI_TILE_INFO_REQUESTED = 'ui.tile.info.requested'
export const APP_UI_TILE_INFO_DISMISSED = 'ui.tile.info.dismissed'
export const APP_UI_WORLD_MOTION_UPDATED = 'ui.world.motion.updated'
export const APP_UI_RESTORE_STARTED = 'ui.restore.started'
export const APP_UI_RESTORE_COMPLETED = 'ui.restore.completed'
export const APP_UI_MUSIC_STATE_CHANGED = 'ui.music.state.changed'
export const APP_UI_SYSTEM_OPTIONS_OPENED = 'ui.systemOptions.opened'
export const APP_UI_SYSTEM_OPTIONS_CLOSED = 'ui.systemOptions.closed'
// A screen such as the battle covers the adventure map, which ignores the player until it closes.
export const APP_UI_ADVENTURE_MAP_COVERED = 'ui.adventureMap.covered'
export const APP_UI_ADVENTURE_MAP_UNCOVERED = 'ui.adventureMap.uncovered'
// The battle as the player sees it: where the stacks stand, whose turn it is and where it can go.
export const APP_UI_BATTLE_UPDATED = 'ui.battle.updated'
export const APP_UI_TOWN_UPDATED = 'ui.town.updated'
// With a town selected instead of the hero, clicking the map does not move the hero.
export const APP_UI_TOWN_SELECTED = 'ui.town.selected'
export const APP_UI_HERO_SELECTED = 'ui.hero.selected'
// A message box over the town screen, such as there being no room in the garrison for recruits.
export const APP_UI_TOWN_MESSAGE_OPENED = 'ui.town.message.opened'

const APP_PERSISTED_FACT_TYPES = new Set([
  APP_FACT_HERO_MOVED,
  APP_FACT_MOVEMENT_POINTS_CHANGED,
  APP_FACT_ENTITY_REMOVED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_INTERACTIONS_QUEUED,
  APP_FACT_TURN_ENDED,
  APP_FACT_BATTLE_STARTED,
  APP_FACT_BATTLE_FINISHED,
  APP_FACT_BATTLE_ENDED,
  APP_FACT_BATTLE_STACK_MOVED,
  APP_FACT_BATTLE_STACK_ATTACKED,
  APP_FACT_BATTLE_STACK_SHOT,
  APP_FACT_BATTLE_TURN_ENDED,
  APP_FACT_BATTLE_STACK_WAITED,
  APP_FACT_BATTLE_STACK_DEFENDED,
  APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_MONSTER_COUNT_CHANGED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_TOWN_OPENED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_CREATURES_RECRUITED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_MINE_CAPTURED,
  APP_FACT_TREASURE_CHEST_OPENED,
  APP_FACT_HERO_EXPERIENCE_GAINED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_HERO_ARMY_CHANGED
])

export function shouldPersistFactEvent(type) {
  return APP_PERSISTED_FACT_TYPES.has(type)
}

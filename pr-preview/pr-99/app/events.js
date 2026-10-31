export const APP_COMMAND_APP_START = 'command.app.start'
export const APP_COMMAND_GAME_SETUP_REQUESTED = 'command.game.setup.requested'
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
export const APP_COMMAND_HERO_SELECT_REQUESTED = 'command.hero.select.requested'
export const APP_COMMAND_HERO_EXPERIENCE_GAIN_REQUESTED = 'command.hero.experience.gain.requested'
export const APP_COMMAND_HERO_STACK_MOVE_REQUESTED = 'command.hero.stackMove.requested'
export const APP_COMMAND_HERO_STACK_SPLIT_REQUESTED = 'command.hero.stackSplit.requested'
// Each names a place as a worn slot, `{ slot: 'WEAPON' }`, or a backpack frame, `{ backpack: 0 }`.
export const APP_COMMAND_HERO_ARTIFACT_TAKE_REQUESTED = 'command.hero.artifactTake.requested'
export const APP_COMMAND_HERO_ARTIFACT_PUT_REQUESTED = 'command.hero.artifactPut.requested'
export const APP_COMMAND_HERO_ARTIFACT_PUT_BACK_REQUESTED = 'command.hero.artifactPutBack.requested'
export const APP_COMMAND_HERO_BACKPACK_SCROLL_REQUESTED = 'command.hero.backpackScroll.requested'
// A right-click on an artifact that can be assembled into a combination, or taken apart.
export const APP_COMMAND_HERO_ARTIFACT_COMBINATION_REQUESTED =
  'command.hero.artifactCombination.requested'
// Between two heroes on the exchange screen; each names the heroes as `heroIds: { left, right }`
// and the armies as 'left' and 'right'.
export const APP_COMMAND_HEROES_STACK_MOVE_REQUESTED = 'command.heroes.stackMove.requested'
export const APP_COMMAND_HEROES_STACK_SPLIT_REQUESTED = 'command.heroes.stackSplit.requested'
export const APP_COMMAND_HEROES_STACK_SEND_REQUESTED = 'command.heroes.stackSend.requested'
export const APP_COMMAND_HEROES_ARMY_SEND_REQUESTED = 'command.heroes.armySend.requested'
export const APP_COMMAND_HEROES_ARMIES_SWAP_REQUESTED = 'command.heroes.armiesSwap.requested'
// With `side`, the hero clicked on; places as for one hero.
export const APP_COMMAND_HEROES_ARTIFACT_TAKE_REQUESTED = 'command.heroes.artifactTake.requested'
export const APP_COMMAND_HEROES_ARTIFACT_PUT_REQUESTED = 'command.heroes.artifactPut.requested'
export const APP_COMMAND_HEROES_ARTIFACT_PUT_BACK_REQUESTED =
  'command.heroes.artifactPutBack.requested'
export const APP_COMMAND_HEROES_BACKPACK_SCROLL_REQUESTED =
  'command.heroes.backpackScroll.requested'
export const APP_COMMAND_HEROES_ARTIFACTS_SEND_REQUESTED = 'command.heroes.artifactsSend.requested'
export const APP_COMMAND_HEROES_ARTIFACTS_SWAP_REQUESTED = 'command.heroes.artifactsSwap.requested'
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
export const APP_COMMAND_DWELLING_RECRUIT_REQUESTED = 'command.dwelling.recruit.requested'
// A hero entered a bonus object or a resource generator.
export const APP_COMMAND_MAP_OBJECT_VISIT_REQUESTED = 'command.mapObject.visit.requested'
export const APP_COMMAND_TOWN_STACK_MOVE_REQUESTED = 'command.town.stackMove.requested'
export const APP_COMMAND_TOWN_STACK_SPLIT_REQUESTED = 'command.town.stackSplit.requested'
export const APP_COMMAND_TAVERN_OPEN_REQUESTED = 'command.tavern.open.requested'
export const APP_COMMAND_TAVERN_HIRE_REQUESTED = 'command.tavern.hire.requested'
export const APP_COMMAND_TOWN_GARRISON_STACK_MOVE_REQUESTED =
  'command.town.garrisonStackMove.requested'

export const APP_FACT_WORLD_READY = 'fact.world.ready'
export const APP_FACT_WORLD_LOAD_FAILED = 'fact.world.load.failed'
export const APP_FACT_MOVE_STARTED = 'fact.move.started'
export const APP_FACT_MOVE_FINISHED = 'fact.move.finished'
// What the hero still does where it stopped once the interaction under way is over.
export const APP_FACT_INTERACTIONS_QUEUED = 'fact.interactions.queued'
// The hero interacts with an entity now: right as it stops, or once what was queued before is over.
export const APP_FACT_INTERACTION_REACHED = 'fact.interaction.reached'
export const APP_FACT_HERO_MOVED = 'fact.hero.moved'
export const APP_FACT_HERO_SELECTED = 'fact.hero.selected'
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
// Bad morale: the stack loses its turn.
export const APP_FACT_BATTLE_STACK_FROZE = 'fact.battle.stack.froze'
export const APP_FACT_BATTLE_AUTO_COMBAT_CHANGED = 'fact.battle.autoCombat.changed'
export const APP_FACT_MONSTER_DEFEATED = 'fact.monster.defeated'
export const APP_FACT_MONSTER_COUNT_CHANGED = 'fact.monster.count.changed'
export const APP_FACT_RESOURCE_COLLECTED = 'fact.resource.collected'
export const APP_FACT_ARTIFACT_PICKED_UP = 'fact.artifact.pickedUp'
export const APP_FACT_ARTIFACT_GUARDS_CHANGED = 'fact.artifact.guards.changed'
export const APP_FACT_TOWN_VISITED = 'fact.town.visited'
export const APP_FACT_TOWN_OPENED = 'fact.town.opened'
export const APP_FACT_TOWN_LEFT = 'fact.town.left'
export const APP_FACT_TOWN_CAPTURED = 'fact.town.captured'
export const APP_FACT_TOWN_BUILDING_BUILT = 'fact.town.building.built'
// Creatures bought from a town's dwelling, leaving fewer there to buy.
export const APP_FACT_TOWN_CREATURES_RECRUITED = 'fact.town.creatures.recruited'
export const APP_FACT_TOWN_GARRISON_CHANGED = 'fact.town.garrison.changed'
export const APP_FACT_MINE_CAPTURED = 'fact.mine.captured'
export const APP_FACT_DWELLING_FLAGGED = 'fact.dwelling.flagged'
export const APP_FACT_DWELLING_CREATURES_RECRUITED = 'fact.dwelling.creatures.recruited'
export const APP_FACT_DWELLING_GUARDS_CHANGED = 'fact.dwelling.guards.changed'
export const APP_FACT_RESOURCES_SPENT = 'fact.resources.spent'
export const APP_FACT_RESOURCES_GAINED = 'fact.resources.gained'
// A hero of the player entered the object, whether or not it gave them anything.
export const APP_FACT_MAP_OBJECT_VISITED = 'fact.mapObject.visited'
// The values a map object rolls once per game or once per week, such as a Witch Hut's skill.
export const APP_FACT_MAP_OBJECT_VALUES_ROLLED = 'fact.mapObject.values.rolled'
export const APP_FACT_HERO_BONUS_OBJECT_VISITED = 'fact.hero.bonusObject.visited'
export const APP_FACT_HERO_PRIMARY_SKILLS_GAINED = 'fact.hero.primarySkills.gained'
export const APP_FACT_HERO_BATTLE_BONUS_GAINED = 'fact.hero.battleBonus.gained'
// Movement points the hero gets now and at the start of each day until the week ends.
export const APP_FACT_HERO_WEEK_BONUS_GAINED = 'fact.hero.weekBonus.gained'
export const APP_FACT_TREASURE_CHEST_OPENED = 'fact.treasureChest.opened'
// What the chests the scenario leaves to chance hold, rolled once per game.
export const APP_FACT_TREASURE_CHESTS_ROLLED = 'fact.treasureChests.rolled'
export const APP_FACT_HERO_EXPERIENCE_GAINED = 'fact.hero.experience.gained'
export const APP_FACT_HERO_LEVELED_UP = 'fact.hero.leveledUp'
export const APP_FACT_HERO_SECONDARY_SKILL_LEARNED = 'fact.hero.secondarySkill.learned'
export const APP_FACT_HERO_ARMY_CHANGED = 'fact.hero.army.changed'
export const APP_FACT_HERO_ARTIFACTS_CHANGED = 'fact.hero.artifacts.changed'
// A hero hired in a town's tavern, who comes onto the map at the town's entrance.
export const APP_FACT_HERO_HIRED = 'fact.hero.hired'
// The heroes a player's taverns offer this week, and the barkeep's rumour.
export const APP_FACT_TAVERN_HEROES_OFFERED = 'fact.tavern.heroesOffered'

export const APP_UI_PREVIEW_UPDATED = 'ui.preview.updated'
export const APP_UI_INTERACTION_MODAL_OPENED = 'ui.interaction.modal.opened'
export const APP_UI_NOTICE_OPENED = 'ui.notice.opened'
export const APP_UI_INTERACTION_MODAL_CONFIRMED = 'ui.interaction.modal.confirmed'
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
// The player clicked the selected hero on the map, when the map takes clicks.
export const APP_UI_SELECTED_HERO_CLICKED = 'ui.selectedHero.clicked'
export const APP_UI_HERO_SCREEN_OPEN_REQUESTED = 'ui.heroScreen.openRequested'
export const APP_UI_SPELL_BOOK_OPEN_REQUESTED = 'ui.spellBook.openRequested'
// A hero walked onto another of the player's heroes: `heroId` came to `otherHeroId`.
export const APP_UI_HERO_EXCHANGE_OPEN_REQUESTED = 'ui.heroExchange.openRequested'
// A message box over the town screen, such as there being no room in the garrison for recruits.
export const APP_UI_TOWN_MESSAGE_OPENED = 'ui.town.message.opened'
export const APP_UI_DWELLING_RECRUIT_OPEN_REQUESTED = 'ui.dwelling.recruit.openRequested'
export const APP_UI_DWELLING_RECRUIT_UPDATED = 'ui.dwelling.recruit.updated'
export const APP_UI_TAVERN_UPDATED = 'ui.tavern.updated'
export const APP_UI_DEV_FOG_OF_WAR_CHANGED = 'ui.dev.fogOfWar.changed'

const APP_PERSISTED_FACT_TYPES = new Set([
  APP_FACT_HERO_MOVED,
  APP_FACT_HERO_SELECTED,
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
  APP_FACT_BATTLE_STACK_FROZE,
  APP_FACT_BATTLE_AUTO_COMBAT_CHANGED,
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_MONSTER_COUNT_CHANGED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_ARTIFACT_PICKED_UP,
  APP_FACT_ARTIFACT_GUARDS_CHANGED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_TOWN_OPENED,
  APP_FACT_TOWN_LEFT,
  APP_FACT_TOWN_CAPTURED,
  APP_FACT_TOWN_BUILDING_BUILT,
  APP_FACT_TOWN_CREATURES_RECRUITED,
  APP_FACT_TOWN_GARRISON_CHANGED,
  APP_FACT_RESOURCES_SPENT,
  APP_FACT_MINE_CAPTURED,
  APP_FACT_DWELLING_FLAGGED,
  APP_FACT_DWELLING_CREATURES_RECRUITED,
  APP_FACT_DWELLING_GUARDS_CHANGED,
  APP_FACT_RESOURCES_GAINED,
  APP_FACT_MAP_OBJECT_VISITED,
  APP_FACT_MAP_OBJECT_VALUES_ROLLED,
  APP_FACT_HERO_BONUS_OBJECT_VISITED,
  APP_FACT_HERO_PRIMARY_SKILLS_GAINED,
  APP_FACT_HERO_BATTLE_BONUS_GAINED,
  APP_FACT_HERO_WEEK_BONUS_GAINED,
  APP_FACT_TREASURE_CHEST_OPENED,
  APP_FACT_TREASURE_CHESTS_ROLLED,
  APP_FACT_HERO_EXPERIENCE_GAINED,
  APP_FACT_HERO_LEVELED_UP,
  APP_FACT_HERO_SECONDARY_SKILL_LEARNED,
  APP_FACT_HERO_ARMY_CHANGED,
  APP_FACT_HERO_ARTIFACTS_CHANGED,
  APP_FACT_HERO_HIRED,
  APP_FACT_TAVERN_HEROES_OFFERED
])

export function shouldPersistFactEvent(type) {
  return APP_PERSISTED_FACT_TYPES.has(type)
}

import { heroesContent } from '../../game/heroes/content.js'
import { heroesOutcomeEffects, heroesOutcomeEvents } from './interaction-outcomes.js'
import { registerAdventureCursorModule } from './modules/adventure-cursor.module.js'
import { registerBattleModule } from './modules/battle.module.js'
import { registerBattleViewModule } from './modules/battle-view.module.js'
import { registerHeroLevelsModule } from './modules/hero-levels.module.js'
import { registerHeroPanelModule } from './modules/hero-panel.module.js'
import { registerHudModule } from './modules/hud.module.js'
import { registerInfoPopupModule } from './modules/info-popup.module.js'
import { registerMinesModule } from './modules/mines.module.js'
import { registerMinimapViewModule } from './modules/minimap-view.module.js'
import { registerMusicModule } from './modules/music.module.js'
import { registerOwnerFlagViewModule } from './modules/owner-flag-view.module.js'
import { registerStatusBarModule } from './modules/status-bar.module.js'
import { registerSystemOptionsModule } from './modules/system-options.module.js'
import { registerTownModule } from './modules/town.module.js'
import { registerTownHallViewModule } from './modules/town-hall-view.module.js'
import { registerTownListModule } from './modules/town-list.module.js'
import { registerTownScreenViewModule } from './modules/town-screen-view.module.js'
import { registerTurnModule } from './modules/turn.module.js'
import { getEntityFadeOutSpec, getEntityLayerStyle } from './presentation/entities/registry.js'

export const heroesAppContent = Object.freeze({
  ...heroesContent,
  outcomeEffects: heroesOutcomeEffects,
  outcomeEvents: heroesOutcomeEvents,
  entityPresentation: Object.freeze({
    getEntityStyle: getEntityLayerStyle,
    getFadeOutSpec: getEntityFadeOutSpec
  }),
  modules: Object.freeze([
    registerTurnModule,
    registerMinesModule,
    registerHeroLevelsModule,
    registerBattleModule,
    registerTownModule,
    registerOwnerFlagViewModule,
    registerMinimapViewModule,
    registerHudModule,
    registerStatusBarModule,
    registerAdventureCursorModule,
    registerInfoPopupModule,
    registerHeroPanelModule,
    registerTownListModule,
    registerSystemOptionsModule,
    registerBattleViewModule,
    registerTownScreenViewModule,
    registerTownHallViewModule,
    registerMusicModule
  ])
})

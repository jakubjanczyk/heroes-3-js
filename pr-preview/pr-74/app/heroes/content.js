import { heroesContent } from '../../game/heroes/content.js'
import { APP_FACT_MONSTER_DEFEATED } from '../events.js'
import { heroesOutcomeEffects, heroesOutcomeEvents } from './interaction-outcomes.js'
import { registerAdventureCursorModule } from './modules/adventure-cursor.module.js'
import { registerBattleModule } from './modules/battle.module.js'
import { registerBattleViewModule } from './modules/battle-view.module.js'
import { registerDwellingRecruitViewModule } from './modules/dwelling-recruit-view.module.js'
import { registerDwellingsModule } from './modules/dwellings.module.js'
import { registerHeroArmyModule } from './modules/hero-army.module.js'
import { registerHeroExchangeViewModule } from './modules/hero-exchange-view.module.js'
import { registerHeroLevelsModule } from './modules/hero-levels.module.js'
import { registerHeroPanelModule } from './modules/hero-panel.module.js'
import { registerHeroScreenViewModule } from './modules/hero-screen-view.module.js'
import { registerHudModule } from './modules/hud.module.js'
import { registerInfoBoxModule } from './modules/info-box.module.js'
import { registerInfoPopupModule } from './modules/info-popup.module.js'
import { registerMinesModule } from './modules/mines.module.js'
import { registerMinimapViewModule } from './modules/minimap-view.module.js'
import { registerMusicModule } from './modules/music.module.js'
import { registerOwnerFlagViewModule } from './modules/owner-flag-view.module.js'
import { registerStatusBarModule } from './modules/status-bar.module.js'
import { registerSystemOptionsModule } from './modules/system-options.module.js'
import { registerTavernModule } from './modules/tavern.module.js'
import { registerTavernViewModule } from './modules/tavern-view.module.js'
import { registerTownModule } from './modules/town.module.js'
import { registerTownFortViewModule } from './modules/town-fort-view.module.js'
import { registerTownHallViewModule } from './modules/town-hall-view.module.js'
import { registerTownListModule } from './modules/town-list.module.js'
import { registerTownRecruitViewModule } from './modules/town-recruit-view.module.js'
import { registerTownScreenViewModule } from './modules/town-screen-view.module.js'
import { registerTurnModule } from './modules/turn.module.js'
import { getEntityFadeOutSpec, getEntityLayerStyle } from './presentation/entities/registry.js'

export const heroesAppContent = Object.freeze({
  ...heroesContent,
  outcomeEffects: heroesOutcomeEffects,
  outcomeEvents: heroesOutcomeEvents,
  // The next of the hero's queued interactions waits for the battle under way to be won.
  queuedInteractionsResumeOn: APP_FACT_MONSTER_DEFEATED,
  entityPresentation: Object.freeze({
    getEntityStyle: getEntityLayerStyle,
    getFadeOutSpec: getEntityFadeOutSpec
  }),
  modules: Object.freeze([
    registerTurnModule,
    registerMinesModule,
    registerDwellingsModule,
    registerHeroLevelsModule,
    registerHeroArmyModule,
    registerBattleModule,
    registerTownModule,
    registerTavernModule,
    registerOwnerFlagViewModule,
    registerMinimapViewModule,
    registerHudModule,
    registerStatusBarModule,
    registerAdventureCursorModule,
    registerInfoPopupModule,
    registerHeroPanelModule,
    registerInfoBoxModule,
    registerTownListModule,
    registerSystemOptionsModule,
    registerBattleViewModule,
    registerTownScreenViewModule,
    registerTownHallViewModule,
    registerTownFortViewModule,
    registerTownRecruitViewModule,
    registerDwellingRecruitViewModule,
    registerTavernViewModule,
    registerHeroScreenViewModule,
    registerHeroExchangeViewModule,
    registerMusicModule
  ])
})

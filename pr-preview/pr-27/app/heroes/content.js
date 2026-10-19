import { heroesContent } from '../../game/heroes/content.js'
import { heroesOutcomeEffects } from './interaction-outcomes.js'
import { registerHeroLevelsModule } from './modules/hero-levels.module.js'
import { registerHeroPanelModule } from './modules/hero-panel.module.js'
import { registerHudModule } from './modules/hud.module.js'
import { registerInfoPopupModule } from './modules/info-popup.module.js'
import { registerMineFlagViewModule } from './modules/mine-flag-view.module.js'
import { registerMinesModule } from './modules/mines.module.js'
import { registerMinimapViewModule } from './modules/minimap-view.module.js'
import { registerMusicModule } from './modules/music.module.js'
import { registerStatusBarModule } from './modules/status-bar.module.js'
import { registerSystemOptionsModule } from './modules/system-options.module.js'
import { registerTurnModule } from './modules/turn.module.js'
import { getEntityFadeOutSpec, getEntityLayerStyle } from './presentation/entities/registry.js'

export const heroesAppContent = Object.freeze({
  ...heroesContent,
  outcomeEffects: heroesOutcomeEffects,
  entityPresentation: Object.freeze({
    getEntityStyle: getEntityLayerStyle,
    getFadeOutSpec: getEntityFadeOutSpec
  }),
  modules: Object.freeze([
    registerTurnModule,
    registerMinesModule,
    registerHeroLevelsModule,
    registerMineFlagViewModule,
    registerMinimapViewModule,
    registerHudModule,
    registerStatusBarModule,
    registerInfoPopupModule,
    registerHeroPanelModule,
    registerSystemOptionsModule,
    registerMusicModule
  ])
})

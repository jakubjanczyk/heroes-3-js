import { heroesContent } from '../../game/heroes/content.js';
import { HEROES_PERSISTED_FACT_TYPES } from './events.js';
import { heroesOutcomeEffects } from './interaction-outcomes.js';
import { registerHudModule } from './modules/hud.module.js';
import { registerMinimapViewModule } from './modules/minimap-view.module.js';
import { registerMusicModule } from './modules/music.module.js';
import { registerTurnModule } from './modules/turn.module.js';
import { getEntityFadeOutSpec, getEntityLayerStyle } from './presentation/entities/registry.js';

export const heroesAppContent = Object.freeze({
  ...heroesContent,
  outcomeEffects: heroesOutcomeEffects,
  persistedFactTypes: HEROES_PERSISTED_FACT_TYPES,
  entityPresentation: Object.freeze({
    getEntityStyle: getEntityLayerStyle,
    getFadeOutSpec: getEntityFadeOutSpec
  }),
  modules: Object.freeze([registerTurnModule, registerMinimapViewModule, registerHudModule, registerMusicModule])
});

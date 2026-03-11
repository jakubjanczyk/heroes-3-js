import { registerCameraModule } from './camera.module.js';
import { registerEntityViewModule } from './entity-view.module.js';
import { registerHudModule } from './hud.module.js';
import { registerInteractionModalModule } from './interaction-modal.module.js';
import { registerInteractionModule } from './interaction.module.js';
import { registerMinimapViewModule } from './minimap-view.module.js';
import { registerMovementModule } from './movement.module.js';
import { registerMusicModule } from './music.module.js';
import { registerPreviewModule } from './preview.module.js';
import { registerPreviewViewModule } from './preview-view.module.js';
import { registerResourceCollectionBlockingModule } from './resource-collection-blocking.module.js';
import { registerTerrainViewModule } from './terrain-view.module.js';
import { registerTurnModule } from './turn.module.js';
import { registerWorldModule } from './world.module.js';
import { registerWorldViewModule } from './world-view.module.js';

const DOMAIN_MODULES = [
  registerWorldModule,
  registerTurnModule,
  registerMovementModule,
  registerInteractionModule,
  registerResourceCollectionBlockingModule,
  registerPreviewModule,
  registerCameraModule
];

const VIEW_MODULES = [
  registerTerrainViewModule,
  registerEntityViewModule,
  registerPreviewViewModule,
  registerWorldViewModule,
  registerMinimapViewModule,
  registerInteractionModalModule,
  registerHudModule,
  registerMusicModule
];

const ALL_MODULES = [...DOMAIN_MODULES, ...VIEW_MODULES];

export function listModuleMetadata() {
  return ALL_MODULES
    .map((registerModule) => registerModule.meta)
    .filter((meta) => Boolean(meta?.id));
}

export function registerModules({ bus, env, config }) {
  const runtime = { bus, env, config };
  const disposers = ALL_MODULES
    .map((registerModule) => registerModule(runtime))
    .filter((dispose) => typeof dispose === 'function');

  return () => {
    for (let index = disposers.length - 1; index >= 0; index -= 1) {
      disposers[index]();
    }
  };
}

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
import { registerTerrainViewModule } from './terrain-view.module.js';
import { registerTurnModule } from './turn.module.js';
import { registerWorldModule } from './world.module.js';

export function registerModules({ bus, env, config }) {
  registerWorldModule({ bus, env, config });
  registerTurnModule({ bus, env, config });
  registerMovementModule({ bus, env, config });
  registerInteractionModule({ bus, env, config });
  registerPreviewModule({ bus, env, config });
  registerCameraModule({ bus, env, config });

  registerTerrainViewModule({ bus, env, config });
  registerEntityViewModule({ bus, env, config });
  registerPreviewViewModule({ bus, env, config });
  registerMinimapViewModule({ bus, env, config });
  registerInteractionModalModule({ bus, env, config });
  registerHudModule({ bus, env, config });
  registerMusicModule({ bus, env, config });
}

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
import { registerWorldViewModule } from './world-view.module.js';

const PHASE_ORDER = Object.freeze({
  domain: 0,
  view: 1
});

const MODULES = [
  registerWorldModule,
  registerTurnModule,
  registerMovementModule,
  registerInteractionModule,
  registerPreviewModule,
  registerCameraModule,
  registerTerrainViewModule,
  registerEntityViewModule,
  registerPreviewViewModule,
  registerWorldViewModule,
  registerMinimapViewModule,
  registerInteractionModalModule,
  registerHudModule,
  registerMusicModule
];

function getModuleId(meta, index) {
  if (typeof meta?.id === 'string' && meta.id.length > 0) {
    return meta.id;
  }

  throw new Error(`Invalid module metadata: missing id at index ${index}`);
}

function getModulePhase(meta, id) {
  const phase = meta?.phase;
  if (phase === 'domain' || phase === 'view') {
    return phase;
  }

  throw new Error(`Invalid module metadata: module "${id}" has unsupported phase "${phase}"`);
}

function assertModuleMetadata(modules) {
  const seenIds = new Set();

  for (let index = 0; index < modules.length; index += 1) {
    const registerModule = modules[index];
    const meta = registerModule?.meta;
    const id = getModuleId(meta, index);
    getModulePhase(meta, id);

    if (seenIds.has(id)) {
      throw new Error(`Invalid module metadata: duplicate id "${id}"`);
    }

    seenIds.add(id);

    if (!Array.isArray(meta?.consumes) || !Array.isArray(meta?.produces)) {
      throw new Error(
        `Invalid module metadata: module "${id}" must define consumes and produces arrays`
      );
    }
  }
}

function orderModulesByPhase(modules) {
  return modules
    .map((registerModule, index) => ({
      registerModule,
      index,
      phase: getModulePhase(registerModule?.meta, getModuleId(registerModule?.meta, index))
    }))
    .sort((left, right) => {
      const phaseDiff = PHASE_ORDER[left.phase] - PHASE_ORDER[right.phase];
      if (phaseDiff !== 0) {
        return phaseDiff;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.registerModule);
}

assertModuleMetadata(MODULES);
const ORDERED_MODULES = orderModulesByPhase(MODULES);

export function listModuleMetadata() {
  return ORDERED_MODULES.map((registerModule) => registerModule.meta);
}

export function registerModules({ bus, env, config }) {
  const runtime = { bus, env, config };
  const disposers = ORDERED_MODULES
    .map((registerModule) => registerModule(runtime))
    .filter((dispose) => typeof dispose === 'function');

  return () => {
    for (let index = disposers.length - 1; index >= 0; index -= 1) {
      disposers[index]();
    }
  };
}

import { describe, expect, test } from 'vitest';

import {
  APP_UI_CAMERA_UPDATED,
  APP_UI_RESTORE_COMPLETED,
  APP_UI_RESTORE_STARTED,
  APP_UI_WORLD_MOTION_UPDATED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerWorldViewModule } from './world-view.module.js';

describe('world view module', () => {
  test('applies world transform and world motion classes from UI events', () => {
    const bus = createFakeBus();
    const styleCalls = [];
    const worldElement = {
      dataset: {},
      style: {
        setProperty(name, value) {
          styleCalls.push([name, value]);
          this[name] = value;
        }
      }
    };

    registerWorldViewModule({
      bus,
      env: {
        document: {
          querySelector(selector) {
            if (selector !== '.world') {
              return null;
            }

            return worldElement;
          }
        }
      }
    });

    bus.emit(APP_UI_WORLD_MOTION_UPDATED, {
      followHero: true,
      cameraStepDurationMs: 240
    });
    bus.emit(APP_UI_RESTORE_STARTED, {});
    expect(worldElement.style.transition).toBe('none');
    bus.emit(APP_UI_WORLD_MOTION_UPDATED, {
      followHero: false
    });
    bus.emit(APP_UI_CAMERA_UPDATED, {
      offset: { x: -120, y: -80 }
    });
    bus.emit(APP_UI_RESTORE_COMPLETED, {});

    expect(styleCalls).toEqual([['--camera-step-duration', '240ms']]);
    expect(worldElement.dataset.followHero).toBe('false');
    expect(worldElement.style.transform).toBe('translate(-120px, -80px)');
    expect(worldElement.style.transition).toBe('');
  });
});

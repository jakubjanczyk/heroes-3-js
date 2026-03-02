import { describe, expect, test } from 'vitest';

import { APP_UI_CAMERA_UPDATED, APP_UI_WORLD_MOTION_UPDATED } from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerWorldViewModule } from './world-view.module.js';

describe('world view module', () => {
  test('applies world transform and world motion classes from UI events', () => {
    const bus = createFakeBus();
    const classListCalls = [];
    const styleCalls = [];
    const worldElement = {
      classList: {
        add(className) {
          classListCalls.push(['add', className]);
        },
        remove(className) {
          classListCalls.push(['remove', className]);
        }
      },
      style: {
        transform: '',
        setProperty(name, value) {
          styleCalls.push([name, value]);
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
    bus.emit(APP_UI_WORLD_MOTION_UPDATED, {
      followHero: false
    });
    bus.emit(APP_UI_CAMERA_UPDATED, {
      offset: { x: -120, y: -80 }
    });

    expect(styleCalls).toEqual([['--camera-step-duration', '240ms']]);
    expect(classListCalls).toEqual([
      ['add', 'world--following-hero'],
      ['remove', 'world--following-hero']
    ]);
    expect(worldElement.style.transform).toBe('translate(-120px, -80px)');
  });
});

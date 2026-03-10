import { describe, expect, test } from 'vitest';

import {
  INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
  INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
  INTERACTION_OUTCOME_KIND_TOWN_VISITED,
  MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
  MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
  MOVEMENT_INTERACTION_KIND_TOWN_VISIT
} from '../../game/domain/interaction-kinds.js';
import {
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_MOVE_FINISHED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_WORLD_READY,
  APP_UI_INTERACTION_MODAL_CLOSED,
  APP_UI_INTERACTION_MODAL_OPENED
} from '../events.js';
import { createFakeBus } from '../../tests/test-utils/fake-bus.js';
import { registerInteractionModule } from './interaction.module.js';

describe('interaction module', () => {
  test('opens modal on monster combat and finalizes defeat after modal close', async () => {
    const bus = createFakeBus();
    const resolveCalls = [];
    const finalizeCalls = [];

    registerInteractionModule(
      {
        bus,
        config: {
          monsterDefeatFadeOutMs: 0,
          interactionSleep: async () => {}
        }
      },
      {
        createInteractionSystem: () => ({
          resolveArrivalAtDestination({ destinationTile }) {
            resolveCalls.push(destinationTile);
            return {
              kind: INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
              entityId: 'monster-1',
              entityType: 'SKELETON',
              tile: destinationTile,
              modal: {
                title: 'Interaction',
                message: 'Skeleton defeated'
              }
            };
          },
          finalizeMonsterDefeat({ entityId }) {
            finalizeCalls.push(entityId);
            return true;
          }
        })
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      occupancy: {},
      definitions: {}
    });
    bus.emit(APP_FACT_MOVE_FINISHED, {
      targetTile: { x: 1, y: 0 },
      interaction: {
        kind: MOVEMENT_INTERACTION_KIND_MONSTER_COMBAT,
        entityId: 'monster-1',
        targetTile: { x: 1, y: 0 }
      }
    });

    expect(resolveCalls).toEqual([{ x: 1, y: 0 }]);
    expect(bus.emitted).toContainEqual({
      type: APP_UI_INTERACTION_MODAL_OPENED,
      detail: {
        interactionKind: INTERACTION_OUTCOME_KIND_MONSTER_DEFEATED,
        entityId: 'monster-1',
        entityType: 'SKELETON',
        title: 'Interaction',
        message: 'Skeleton defeated'
      }
    });

    expect(bus.emitted.find((entry) => entry.type === APP_FACT_MONSTER_DEFEATED)).toBeFalsy();

    bus.emit(APP_UI_INTERACTION_MODAL_CLOSED, {});
    await Promise.resolve();

    expect(finalizeCalls).toEqual(['monster-1']);
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_MONSTER_DEFEATED,
      detail: {
        entityId: 'monster-1',
        entityType: 'SKELETON',
        tile: { x: 1, y: 0 }
      }
    });
  });

  test('does not resolve interactions when move finishes before hero reaches target', () => {
    const bus = createFakeBus();
    let resolveCalls = 0;

    registerInteractionModule(
      { bus },
      {
        createInteractionSystem: () => ({
          resolveArrivalAtDestination() {
            resolveCalls += 1;
            return null;
          }
        })
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      occupancy: {},
      definitions: {}
    });
    bus.emit(APP_FACT_MOVE_FINISHED, {
      targetTile: { x: 2, y: 0 }
    });

    expect(resolveCalls).toBe(0);
    expect(bus.emitted.find((entry) => entry.type === APP_FACT_MONSTER_DEFEATED)).toBeFalsy();
    expect(
      bus.emitted.find((entry) => entry.type === APP_UI_INTERACTION_MODAL_OPENED)
    ).toBeFalsy();
  });

  test('fades and finalizes resource collection without opening modal', async () => {
    const bus = createFakeBus();
    const resolveCalls = [];
    const finalizeCalls = [];
    const hero = { id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } };

    registerInteractionModule(
      {
        bus,
        config: {
          resourceCollectFadeOutMs: 0,
          interactionSleep: async () => {}
        }
      },
      {
        createInteractionSystem: () => ({
          resolveArrivalAtDestination({ destinationTile }) {
            resolveCalls.push(destinationTile);
            return {
              kind: INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED,
              entityId: 'resource-1',
              entityType: 'GOLD_PILE',
              amount: 100,
              tile: destinationTile,
              resourceName: 'Gold pile'
            };
          },
          finalizeResourceCollection({ entityId }) {
            finalizeCalls.push(entityId);
            return true;
          }
        })
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: {
        entities: [hero]
      },
      occupancy: {},
      definitions: {}
    });
    bus.emit(APP_FACT_MOVE_FINISHED, {
      targetTile: { x: 1, y: 0 },
      interaction: {
        kind: MOVEMENT_INTERACTION_KIND_RESOURCE_COLLECT,
        entityId: 'resource-1',
        targetTile: { x: 1, y: 0 }
      }
    });
    await Promise.resolve();

    expect(resolveCalls).toEqual([{ x: 1, y: 0 }]);
    expect(finalizeCalls).toEqual(['resource-1']);
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_RESOURCE_COLLECTED,
      detail: {
        entityId: 'resource-1',
        entityType: 'GOLD_PILE',
        amount: 100,
        tile: { x: 1, y: 0 }
      }
    });
    expect(
      bus.emitted.find(
        (entry) =>
          entry.type === APP_UI_INTERACTION_MODAL_OPENED &&
          entry.detail?.interactionKind === INTERACTION_OUTCOME_KIND_RESOURCE_COLLECTED
      )
    ).toBeFalsy();
  });

  test('opens modal and emits town visited fact for town visit interaction', () => {
    const bus = createFakeBus();

    registerInteractionModule(
      { bus },
      {
        createInteractionSystem: () => ({
          resolveArrivalAtDestination({ destinationTile }) {
            return {
              kind: INTERACTION_OUTCOME_KIND_TOWN_VISITED,
              entityId: 'town-1',
              entityType: 'CASTLE',
              tile: destinationTile,
              modal: {
                title: 'Interaction',
                message: 'Castle visited'
              }
            };
          }
        })
      }
    );

    bus.emit(APP_FACT_WORLD_READY, {
      scenario: {
        entities: [{ id: 'hero-1', kind: 'HERO', tile: { x: 0, y: 0 } }]
      },
      occupancy: {},
      definitions: {}
    });
    bus.emit(APP_FACT_MOVE_FINISHED, {
      targetTile: { x: 1, y: 0 },
      interaction: {
        kind: MOVEMENT_INTERACTION_KIND_TOWN_VISIT,
        entityId: 'town-1',
        targetTile: { x: 1, y: 0 }
      }
    });

    expect(bus.emitted).toContainEqual({
      type: APP_UI_INTERACTION_MODAL_OPENED,
      detail: {
        interactionKind: INTERACTION_OUTCOME_KIND_TOWN_VISITED,
        entityId: 'town-1',
        entityType: 'CASTLE',
        title: 'Interaction',
        message: 'Castle visited'
      }
    });
    expect(bus.emitted).toContainEqual({
      type: APP_FACT_TOWN_VISITED,
      detail: {
        entityId: 'town-1',
        entityType: 'CASTLE',
        tile: { x: 1, y: 0 }
      }
    });
  });

});

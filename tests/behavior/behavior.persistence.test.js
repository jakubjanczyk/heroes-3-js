// @vitest-environment jsdom
import { describe, expect, test } from 'vitest';

import {
  clickEndTurn,
  closeInteractionModal,
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectInteractionModalClosed,
  expectInteractionModalOpen,
  expectMonsterNotPresent,
  expectMonsterPresent,
  expectMovementPoints,
  expectNoPreview,
  expectPreviewNotOverLimitTargetAt,
  expectPreviewOverLimitTargetAt,
  expectPreviewTargetAt,
  expectResourceNotPresent,
  expectResourceTotal,
  expectTownPresent,
  flushMicrotasks,
  setupMovementBehaviorApp
} from './behavior.utils.js';
import {
  APP_FACT_MONSTER_DEFEATED,
  APP_FACT_PREVIEW_CLEARED,
  APP_FACT_PREVIEW_TARGET_SELECTED,
  APP_FACT_RESOURCE_COLLECTED,
  APP_FACT_TOWN_VISITED,
  APP_FACT_TURN_ENDED
} from '../../app/events.js';

function createMemoryEventLog() {
  const entries = [];

  return {
    async init() {},
    async record(event) {
      entries.push({
        id: entries.length + 1,
        v: 1,
        type: event.type,
        detail: event.detail,
        at: Date.now()
      });
    },
    getAll() {
      return [...entries];
    },
    async reset() {
      entries.length = 0;
    },
    hasExistingSession() {
      return entries.length > 0;
    }
  };
}

describe('session persistence behavior', () => {
  test('given hero moved and interactions resolved when app reloads then final world and HUD state are restored without replaying notifications', async () => {
    const eventLog = createMemoryEventLog();

    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 6,
        height: 1,
        tiles: [0, 0, 0, 0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } },
          { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 3, y: 0 } }
        ],
        definitions: {
          monsters: {
            SKELETON: { name: 'Skeleton' }
          },
          resources: {
            GOLD_PILE: { name: 'Gold pile', amount: 100 }
          }
        }
      },
      appConfig: {
        interactionModalTransitionMs: 0,
        monsterDefeatFadeOutMs: 0,
        resourceCollectFadeOutMs: 0
      }
    };

    const firstSession = await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();
    await closeInteractionModal(firstSession.user);
    await flushMicrotasks();

    confirmTileClickByDispatch(3, 0);
    await flushMicrotasks();

    const firstSessionHero = expectHeroAt(2, 0);
    expectMonsterNotPresent('monster-1');
    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
    expectMovementPoints(11);
    expectInteractionModalClosed();

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    const reloadedHero = expectHeroAt(2, 0);
    expectMonsterNotPresent('monster-1');
    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
    expectMovementPoints(11);
    expectInteractionModalClosed();
    expect(reloadedHero).not.toBe(firstSessionHero);
    expect(eventLog.hasExistingSession()).toBe(true);
    expect(eventLog.getAll().length).toBeGreaterThan(0);
  });

  test('given a preview path is selected when app reloads then selected path target is restored', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 5,
        height: 1,
        tiles: [0, 0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    dispatchTileClick(3, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectPreviewTargetAt(3, 0);
    expect(eventLog.hasExistingSession()).toBe(true);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectPreviewTargetAt(3, 0);
  });

  test('given hero has zero remaining movement points when app reloads then MP stays at zero', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 20,
        height: 1,
        tiles: new Array(20).fill(0),
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
  });

  test('given turn already advanced when app reloads then next end turn continues from restored turn number', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 4,
        height: 1,
        tiles: [0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    const firstSession = await setupMovementBehaviorApp(sharedAppOptions);
    await clickEndTurn(firstSession.user);
    await flushMicrotasks();

    let turnFacts = eventLog
      .getAll()
      .filter((entry) => entry.type === APP_FACT_TURN_ENDED)
      .map((entry) => entry.detail.turnNumber);
    expect(turnFacts).toEqual([2]);

    const secondSession = await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    await clickEndTurn(secondSession.user);
    await flushMicrotasks();

    turnFacts = eventLog
      .getAll()
      .filter((entry) => entry.type === APP_FACT_TURN_ENDED)
      .map((entry) => entry.detail.turnNumber);
    expect(turnFacts).toEqual([2, 3]);
  });

  test('given preview was selected then cleared before reload when app reloads then preview remains cleared', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 6,
        height: 1,
        tiles: [0, 0, 0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    dispatchTileClick(3, 0);
    await flushMicrotasks();
    expectPreviewTargetAt(3, 0);

    dispatchTileClick(0, 0);
    await flushMicrotasks();
    expectNoPreview();

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();
    expectHeroAt(2, 0);
    expectMovementPoints(13);
    expectNoPreview();

    const previewFacts = eventLog
      .getAll()
      .filter(
        (entry) =>
          entry.type === APP_FACT_PREVIEW_TARGET_SELECTED || entry.type === APP_FACT_PREVIEW_CLEARED
      )
      .map((entry) => entry.type);
    expect(previewFacts.slice(0, 2)).toEqual([
      APP_FACT_PREVIEW_TARGET_SELECTED,
      APP_FACT_PREVIEW_CLEARED
    ]);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);
    expectNoPreview();
  });

  test('given low movement points with an over-limit preview when app reloads then target and over-limit marker are restored', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 20,
        height: 1,
        tiles: new Array(20).fill(0),
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(10, 0);
    await flushMicrotasks();
    expectHeroAt(10, 0);
    expectMovementPoints(5);

    dispatchTileClick(17, 0);
    await flushMicrotasks();
    expectPreviewTargetAt(17, 0);
    expectPreviewOverLimitTargetAt(17, 0);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(10, 0);
    expectMovementPoints(5);
    expectPreviewTargetAt(17, 0);
    expectPreviewOverLimitTargetAt(17, 0);
  });

  test('given a restored preview target when player clicks the same tile after reload then movement starts from that restored selection', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 6,
        height: 1,
        tiles: [0, 0, 0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    dispatchTileClick(3, 0);
    await flushMicrotasks();
    expectPreviewTargetAt(3, 0);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(15);
    expectPreviewTargetAt(3, 0);

    dispatchTileClick(3, 0);
    await flushMicrotasks();

    expectHeroAt(3, 0);
    expectMovementPoints(12);
    expectNoPreview();
  });

  test('given monster interaction modal is open when app reloads then monster remains and modal does not reopen', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } }
        ]
      },
      appConfig: {
        interactionModalTransitionMs: 0,
        monsterDefeatFadeOutMs: 0
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(14);
    expectMonsterPresent('monster-1');
    expectInteractionModalOpen('Monster defeated');
    expect(
      eventLog.getAll().filter((entry) => entry.type === APP_FACT_MONSTER_DEFEATED)
    ).toHaveLength(0);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(14);
    expectMonsterPresent('monster-1');
    expectInteractionModalClosed();
    expect(
      eventLog.getAll().filter((entry) => entry.type === APP_FACT_MONSTER_DEFEATED)
    ).toHaveLength(0);
  });

  test('given town modal is open when app reloads then visited town state is preserved without reopening modal', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 8,
        height: 7,
        tiles: new Array(56).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 4, y: 5 } },
          { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }
        ],
        definitions: {
          towns: {
            CASTLE: { name: 'Castle' }
          }
        }
      },
      appConfig: {
        interactionModalTransitionMs: 0
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(4, 3);
    await flushMicrotasks();

    expectHeroAt(4, 3);
    expectMovementPoints(13);
    expectTownPresent('town-1');
    expectInteractionModalOpen('Castle visited');
    expect(eventLog.getAll().filter((entry) => entry.type === APP_FACT_TOWN_VISITED)).toHaveLength(1);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(4, 3);
    expectMovementPoints(13);
    expectTownPresent('town-1');
    expectInteractionModalClosed();
    expect(eventLog.getAll().filter((entry) => entry.type === APP_FACT_TOWN_VISITED)).toHaveLength(1);
  });

  test('given resources are collected across sessions when app reloads multiple times then totals and removals stay cumulative', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 5,
        height: 1,
        tiles: [0, 0, 0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 1, y: 0 } },
          { id: 'resource-2', kind: 'RESOURCE', type: 'WOOD_PILE', tile: { x: 3, y: 0 } }
        ],
        definitions: {
          resources: {
            GOLD_PILE: { name: 'Gold pile', amount: 100 },
            WOOD_PILE: { name: 'Wood pile', amount: 5 }
          }
        }
      },
      appConfig: {
        resourceCollectFadeOutMs: 0
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(14);
    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
    expectResourceTotal('Wood pile', 0);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(14);
    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
    expectResourceTotal('Wood pile', 0);

    confirmTileClickByDispatch(3, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(11);
    expectResourceNotPresent('resource-2');
    expectResourceTotal('Gold pile', 100);
    expectResourceTotal('Wood pile', 5);
    expect(eventLog.getAll().filter((entry) => entry.type === APP_FACT_RESOURCE_COLLECTED)).toHaveLength(2);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(11);
    expectResourceNotPresent('resource-1');
    expectResourceNotPresent('resource-2');
    expectResourceTotal('Gold pile', 100);
    expectResourceTotal('Wood pile', 5);
  });

  test('given movement already spent before reload when player moves again after reload then hero position and MP continue from restored state', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 8,
        height: 1,
        tiles: new Array(8).fill(0),
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);

    confirmTileClickByDispatch(5, 0);
    await flushMicrotasks();

    expectHeroAt(5, 0);
    expectMovementPoints(10);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(5, 0);
    expectMovementPoints(10);
  });

  test('given over-limit preview is restored when player ends turn after reload then same preview becomes affordable and can be confirmed', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 20,
        height: 1,
        tiles: new Array(20).fill(0),
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(10, 0);
    await flushMicrotasks();

    dispatchTileClick(17, 0);
    await flushMicrotasks();

    expectHeroAt(10, 0);
    expectMovementPoints(5);
    expectPreviewTargetAt(17, 0);
    expectPreviewOverLimitTargetAt(17, 0);

    const secondSession = await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(10, 0);
    expectMovementPoints(5);
    expectPreviewTargetAt(17, 0);
    expectPreviewOverLimitTargetAt(17, 0);

    await clickEndTurn(secondSession.user);
    await flushMicrotasks();

    expectMovementPoints(15);
    expectPreviewTargetAt(17, 0);
    expectPreviewNotOverLimitTargetAt(17, 0);

    dispatchTileClick(17, 0);
    await flushMicrotasks();

    expectHeroAt(17, 0);
    expectMovementPoints(8);
    expectNoPreview();
  });

  test('given persisted facts exist when app reloads repeatedly without new actions then replay does not append duplicate persisted facts', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 6,
        height: 1,
        tiles: [0, 0, 0, 0, 0, 0],
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();
    dispatchTileClick(4, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);
    expectPreviewTargetAt(4, 0);

    const entryCountBeforeReload = eventLog.getAll().length;
    expect(entryCountBeforeReload).toBeGreaterThan(0);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();
    expectHeroAt(2, 0);
    expectMovementPoints(13);
    expectPreviewTargetAt(4, 0);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();
    expectHeroAt(2, 0);
    expectMovementPoints(13);
    expectPreviewTargetAt(4, 0);

    expect(eventLog.getAll()).toHaveLength(entryCountBeforeReload);
  });

  test('given hero has zero MP and restored over-limit preview when player confirms same target after reload then hero still cannot move', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 20,
        height: 1,
        tiles: new Array(20).fill(0),
        entities: [{ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }]
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(15, 0);
    await flushMicrotasks();
    expectHeroAt(15, 0);
    expectMovementPoints(0);

    dispatchTileClick(16, 0);
    await flushMicrotasks();
    expectPreviewTargetAt(16, 0);
    expectPreviewOverLimitTargetAt(16, 0);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectPreviewTargetAt(16, 0);
    expectPreviewOverLimitTargetAt(16, 0);

    dispatchTileClick(16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);
    expectPreviewTargetAt(16, 0);
    expectPreviewOverLimitTargetAt(16, 0);
  });

  test('given monster was defeated before reload when app reloads then hero can path through that tile in restored world state', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 4,
        height: 1,
        tiles: [0, 0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } }
        ]
      },
      appConfig: {
        interactionModalTransitionMs: 0,
        monsterDefeatFadeOutMs: 0
      }
    };

    const firstSession = await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();
    await closeInteractionModal(firstSession.user);
    await flushMicrotasks();

    expectMonsterNotPresent('monster-1');
    expectHeroAt(0, 0);
    expectMovementPoints(14);

    await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectMonsterNotPresent('monster-1');
    expectHeroAt(0, 0);
    expectMovementPoints(14);

    confirmTileClickByDispatch(3, 0);
    await flushMicrotasks();

    expectHeroAt(3, 0);
    expectMovementPoints(11);
  });

  test('given monster modal was open at reload when player attacks again after reload then interaction can still resolve and persist defeat', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 3,
        height: 1,
        tiles: [0, 0, 0],
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } },
          { id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } }
        ]
      },
      appConfig: {
        interactionModalTransitionMs: 0,
        monsterDefeatFadeOutMs: 0
      }
    };

    await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectInteractionModalOpen('Monster defeated');
    expect(eventLog.getAll().filter((entry) => entry.type === APP_FACT_MONSTER_DEFEATED)).toHaveLength(0);

    const secondSession = await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectInteractionModalClosed();
    expectMonsterPresent('monster-1');
    expectMovementPoints(14);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectInteractionModalOpen('Monster defeated');
    await closeInteractionModal(secondSession.user);
    await flushMicrotasks();

    expectMonsterNotPresent('monster-1');
    expectMovementPoints(13);
    expect(eventLog.getAll().filter((entry) => entry.type === APP_FACT_MONSTER_DEFEATED)).toHaveLength(1);
  });

  test('given town was visited before reload when hero leaves and re-enters after reload then a new town visit is recorded', async () => {
    const eventLog = createMemoryEventLog();
    const sharedAppOptions = {
      eventLog,
      loadGameOptions: {
        width: 8,
        height: 7,
        tiles: new Array(56).fill(0),
        entities: [
          { id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 4, y: 5 } },
          { id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 4, y: 3 } }
        ],
        definitions: {
          towns: {
            CASTLE: { name: 'Castle' }
          }
        }
      },
      appConfig: {
        interactionModalTransitionMs: 0
      }
    };

    const firstSession = await setupMovementBehaviorApp(sharedAppOptions);

    confirmTileClickByDispatch(4, 3);
    await flushMicrotasks();
    expectInteractionModalOpen('Castle visited');
    await closeInteractionModal(firstSession.user);
    await flushMicrotasks();

    expect(eventLog.getAll().filter((entry) => entry.type === APP_FACT_TOWN_VISITED)).toHaveLength(1);
    expectHeroAt(4, 3);

    const secondSession = await setupMovementBehaviorApp(sharedAppOptions);
    await flushMicrotasks();

    expectHeroAt(4, 3);
    expectInteractionModalClosed();

    confirmTileClickByDispatch(4, 4);
    await flushMicrotasks();
    expectHeroAt(4, 4);

    confirmTileClickByDispatch(4, 3);
    await flushMicrotasks();

    expectInteractionModalOpen('Castle visited');
    await closeInteractionModal(secondSession.user);
    await flushMicrotasks();

    expect(eventLog.getAll().filter((entry) => entry.type === APP_FACT_TOWN_VISITED)).toHaveLength(2);
    expectHeroAt(4, 3);
  });
});

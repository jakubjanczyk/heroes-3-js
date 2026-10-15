// @vitest-environment jsdom
import { describe, test } from 'vitest';

import { aHero, aMonster, aResource, aScenario, aTown } from './builders.js';
import {
  clickEndTurn,
  closeInteractionModal,
  confirmTileClickByDispatch,
  createMemoryEventLog,
  dispatchTileClick,
  expectHeroAt,
  expectInteractionModalClosed,
  expectInteractionModalOpen,
  expectMonsterDefeating,
  expectMonsterNotPresent,
  expectMonsterPresent,
  expectMovementPoints,
  expectNoPreview,
  expectPreviewNotOverLimitTargetAt,
  expectPreviewOverLimitTargetAt,
  expectPreviewTargetAt,
  expectResourceCollecting,
  expectResourceNotPresent,
  expectResourceTotal,
  expectTownPresent,
  flushMicrotasks,
  setupMovementBehaviorApp
} from './behavior.utils.js';

function createSession(scenario, appConfig = {}) {
  return {
    eventLog: createMemoryEventLog(),
    loadGameOptions: scenario.build(),
    appConfig
  };
}

async function reload(sessionOptions) {
  const session = await setupMovementBehaviorApp(sessionOptions);
  await flushMicrotasks();
  return session;
}

const skeletonDefinitions = { monsters: { SKELETON: { name: 'Skeleton' } } };
const goldDefinitions = { resources: { GOLD_PILE: { name: 'Gold pile', amount: 100 } } };
const castleDefinitions = { towns: { CASTLE: { name: 'Castle' } } };

describe('session persistence behavior', () => {
  test('given hero moved and interactions resolved when app reloads then final world and HUD state are restored without replaying notifications', async () => {
    const session = createSession(
      aScenario()
        .withEntities(aHero(), aMonster().at(1, 0), aResource().at(3, 0))
        .withDefinitions({ ...skeletonDefinitions, ...goldDefinitions }),
      { interactionModalTransitionMs: 0, fadeOutMsByKind: { MONSTER: 0, RESOURCE: 0 } }
    );

    const firstSession = await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();
    await closeInteractionModal(firstSession.user);
    await flushMicrotasks();

    confirmTileClickByDispatch(3, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMonsterNotPresent('monster-1');
    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
    expectMovementPoints(11);
    expectInteractionModalClosed();

    await reload(session);

    expectHeroAt(2, 0);
    expectMonsterNotPresent('monster-1');
    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
    expectMovementPoints(11);
    expectInteractionModalClosed();
  });

  test('given a preview path is selected when app reloads then selected path target is restored', async () => {
    const session = createSession(aScenario().withSize(5));

    await setupMovementBehaviorApp(session);

    dispatchTileClick(3, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectPreviewTargetAt(3, 0);

    await reload(session);

    expectHeroAt(0, 0);
    expectPreviewTargetAt(3, 0);
  });

  test('given hero has zero remaining movement points when app reloads then MP stays at zero', async () => {
    const session = createSession(aScenario().withSize(20));

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(16, 0);
    await flushMicrotasks();

    expectHeroAt(15, 0);
    expectMovementPoints(0);

    await reload(session);

    expectHeroAt(15, 0);
    expectMovementPoints(0);
  });

  test('given preview was selected then cleared before reload when app reloads then preview remains cleared', async () => {
    const session = createSession(aScenario());

    await setupMovementBehaviorApp(session);

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

    await reload(session);

    expectHeroAt(2, 0);
    expectMovementPoints(13);
    expectNoPreview();
  });

  test('given low movement points with an over-limit preview when app reloads then target and over-limit marker are restored', async () => {
    const session = createSession(aScenario().withSize(20));

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(10, 0);
    await flushMicrotasks();
    expectHeroAt(10, 0);
    expectMovementPoints(5);

    dispatchTileClick(17, 0);
    await flushMicrotasks();
    expectPreviewTargetAt(17, 0);
    expectPreviewOverLimitTargetAt(17, 0);

    await reload(session);

    expectHeroAt(10, 0);
    expectMovementPoints(5);
    expectPreviewTargetAt(17, 0);
    expectPreviewOverLimitTargetAt(17, 0);
  });

  test('given a restored preview target when player clicks the same tile after reload then movement starts from that restored selection', async () => {
    const session = createSession(aScenario());

    await setupMovementBehaviorApp(session);

    dispatchTileClick(3, 0);
    await flushMicrotasks();
    expectPreviewTargetAt(3, 0);

    await reload(session);

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
    const session = createSession(
      aScenario().withSize(3).withEntities(aHero(), aMonster().at(1, 0)),
      { interactionModalTransitionMs: 0, fadeOutMsByKind: { MONSTER: 0 } }
    );

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(14);
    expectMonsterPresent('monster-1');
    expectInteractionModalOpen('Monster defeated');

    await reload(session);

    expectHeroAt(0, 0);
    expectMovementPoints(14);
    expectMonsterPresent('monster-1');
    expectInteractionModalClosed();
  });

  test('given town modal is open when app reloads then visited town state is preserved without reopening modal', async () => {
    const session = createSession(
      aScenario()
        .withSize(8, 7)
        .withEntities(aHero().at(4, 5), aTown().at(4, 3))
        .withDefinitions(castleDefinitions),
      { interactionModalTransitionMs: 0 }
    );

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(4, 3);
    await flushMicrotasks();

    expectHeroAt(4, 3);
    expectMovementPoints(13);
    expectTownPresent('town-1');
    expectInteractionModalOpen('Castle visited');

    await reload(session);

    expectHeroAt(4, 3);
    expectMovementPoints(13);
    expectTownPresent('town-1');
    expectInteractionModalClosed();
  });

  test('given resources are collected across sessions when app reloads multiple times then totals and removals stay cumulative', async () => {
    const session = createSession(
      aScenario()
        .withSize(5)
        .withEntities(
          aHero(),
          aResource().at(1, 0),
          aResource().withId('resource-2').withType('WOOD_PILE').at(3, 0)
        )
        .withDefinitions({
          resources: {
            GOLD_PILE: { name: 'Gold pile', amount: 100 },
            WOOD_PILE: { name: 'Wood pile', amount: 5 }
          }
        }),
      { fadeOutMsByKind: { RESOURCE: 0 } }
    );

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectHeroAt(0, 0);
    expectMovementPoints(14);
    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
    expectResourceTotal('Wood pile', 0);

    await reload(session);

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

    await reload(session);

    expectHeroAt(2, 0);
    expectMovementPoints(11);
    expectResourceNotPresent('resource-1');
    expectResourceNotPresent('resource-2');
    expectResourceTotal('Gold pile', 100);
    expectResourceTotal('Wood pile', 5);
  });

  test('given resource is still fading out when app reloads then resource stays collected', async () => {
    const session = createSession(
      aScenario().withSize(3).withEntities(aHero(), aResource().at(1, 0)).withDefinitions(goldDefinitions),
      { fadeOutMsByKind: { RESOURCE: 1000 } }
    );

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectResourceCollecting('resource-1');

    await reload(session);

    expectResourceNotPresent('resource-1');
    expectResourceTotal('Gold pile', 100);
  });

  test('given monster is still fading out after modal close when app reloads then monster stays defeated', async () => {
    const session = createSession(
      aScenario().withSize(3).withEntities(aHero(), aMonster().at(1, 0)),
      { interactionModalTransitionMs: 0, fadeOutMsByKind: { MONSTER: 1000 } }
    );

    const firstSession = await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();
    await closeInteractionModal(firstSession.user);
    await flushMicrotasks();

    expectMonsterDefeating('monster-1');

    await reload(session);

    expectMonsterNotPresent('monster-1');
    expectInteractionModalClosed();
  });

  test('given movement already spent before reload when player moves again after reload then hero position and MP continue from restored state', async () => {
    const session = createSession(aScenario().withSize(8));

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(2, 0);
    await flushMicrotasks();

    expectHeroAt(2, 0);
    expectMovementPoints(13);

    await reload(session);

    expectHeroAt(2, 0);
    expectMovementPoints(13);

    confirmTileClickByDispatch(5, 0);
    await flushMicrotasks();

    expectHeroAt(5, 0);
    expectMovementPoints(10);

    await reload(session);

    expectHeroAt(5, 0);
    expectMovementPoints(10);
  });

  test('given over-limit preview is restored when player ends turn after reload then same preview becomes affordable and can be confirmed', async () => {
    const session = createSession(aScenario().withSize(20));

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(10, 0);
    await flushMicrotasks();

    dispatchTileClick(17, 0);
    await flushMicrotasks();

    expectHeroAt(10, 0);
    expectMovementPoints(5);
    expectPreviewTargetAt(17, 0);
    expectPreviewOverLimitTargetAt(17, 0);

    const secondSession = await reload(session);

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

  test('given progress was saved when app reloads repeatedly without new actions then nothing is applied twice', async () => {
    const session = createSession(
      aScenario().withEntities(aHero(), aResource().at(1, 0)).withDefinitions(goldDefinitions),
      { fadeOutMsByKind: { RESOURCE: 0 } }
    );

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();
    confirmTileClickByDispatch(3, 0);
    await flushMicrotasks();
    dispatchTileClick(5, 0);
    await flushMicrotasks();

    expectHeroAt(3, 0);
    expectMovementPoints(11);
    expectResourceTotal('Gold pile', 100);
    expectPreviewTargetAt(5, 0);

    for (let reloadCount = 0; reloadCount < 3; reloadCount += 1) {
      await reload(session);

      expectHeroAt(3, 0);
      expectMovementPoints(11);
      expectResourceTotal('Gold pile', 100);
      expectPreviewTargetAt(5, 0);
    }
  });

  test('given hero has zero MP and restored over-limit preview when player confirms same target after reload then hero still cannot move', async () => {
    const session = createSession(aScenario().withSize(20));

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(15, 0);
    await flushMicrotasks();
    expectHeroAt(15, 0);
    expectMovementPoints(0);

    dispatchTileClick(16, 0);
    await flushMicrotasks();
    expectPreviewTargetAt(16, 0);
    expectPreviewOverLimitTargetAt(16, 0);

    await reload(session);

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
    const session = createSession(
      aScenario().withSize(4).withEntities(aHero(), aMonster().at(1, 0)),
      { interactionModalTransitionMs: 0, fadeOutMsByKind: { MONSTER: 0 } }
    );

    const firstSession = await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();
    await closeInteractionModal(firstSession.user);
    await flushMicrotasks();

    expectMonsterNotPresent('monster-1');
    expectHeroAt(0, 0);
    expectMovementPoints(14);

    await reload(session);

    expectMonsterNotPresent('monster-1');
    expectHeroAt(0, 0);
    expectMovementPoints(14);

    confirmTileClickByDispatch(3, 0);
    await flushMicrotasks();

    expectHeroAt(3, 0);
    expectMovementPoints(11);
  });

  test('given monster modal was open at reload when player attacks again after reload then the defeat resolves and stays after another reload', async () => {
    const session = createSession(
      aScenario().withSize(3).withEntities(aHero(), aMonster().at(1, 0)),
      { interactionModalTransitionMs: 0, fadeOutMsByKind: { MONSTER: 0 } }
    );

    await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(1, 0);
    await flushMicrotasks();

    expectInteractionModalOpen('Monster defeated');

    const secondSession = await reload(session);

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

    await reload(session);

    expectMonsterNotPresent('monster-1');
    expectMovementPoints(13);
  });

  test('given town was visited before reload when hero leaves and re-enters after reload then the town modal opens again', async () => {
    const session = createSession(
      aScenario()
        .withSize(8, 7)
        .withEntities(aHero().at(4, 5), aTown().at(4, 3))
        .withDefinitions(castleDefinitions),
      { interactionModalTransitionMs: 0 }
    );

    const firstSession = await setupMovementBehaviorApp(session);

    confirmTileClickByDispatch(4, 3);
    await flushMicrotasks();
    expectInteractionModalOpen('Castle visited');
    await closeInteractionModal(firstSession.user);
    await flushMicrotasks();

    expectHeroAt(4, 3);

    const secondSession = await reload(session);

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

    expectHeroAt(4, 3);
  });
});

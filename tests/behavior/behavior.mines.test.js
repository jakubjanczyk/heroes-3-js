// @vitest-environment jsdom
import { describe, test } from 'vitest';

import { aHero, aMine, aScenario } from './builders.js';
import {
  confirmTileClickByDispatch,
  dispatchTileClick,
  expectHeroAt,
  expectInteractionModalClosed,
  expectMineAt,
  expectMinePresent,
  expectNoPreview,
  flushMicrotasks,
  setupMovementBehaviorApp
} from './behavior.utils.js';

describe('mine interaction behavior', () => {
  test('given scenario contains all mine types when app boots then each mine is rendered', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(20)
        .withEntities(
          aHero(),
          aMine().withId('mine-1').withType('GOLD_MINE').at(2, 0),
          aMine().withId('mine-2').withType('SAWMILL').at(4, 0),
          aMine().withId('mine-3').withType('ORE_PIT').at(6, 0),
          aMine().withId('mine-4').withType('ALCHEMIST_LAB').at(8, 0),
          aMine().withId('mine-5').withType('SULFUR_DUNE').at(10, 0),
          aMine().withId('mine-6').withType('CRYSTAL_CAVERN').at(12, 0),
          aMine().withId('mine-7').withType('GEM_POND').at(14, 0)
        )
        .build()
    });

    expectMineAt(2, 0, 'mine-1');
    expectMineAt(4, 0, 'mine-2');
    expectMineAt(6, 0, 'mine-3');
    expectMineAt(8, 0, 'mine-4');
    expectMineAt(10, 0, 'mine-5');
    expectMineAt(12, 0, 'mine-6');
    expectMineAt(14, 0, 'mine-7');
  });

  test('given hero enters mine bottom-center tile when movement resolves then mine stays and no modal appears', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(6, 3)
        .withEntities(aHero().at(0, 1), aMine().at(2, 1))
        .build()
    });

    confirmTileClickByDispatch(2, 1);
    await flushMicrotasks();

    expectHeroAt(2, 1);
    expectInteractionModalClosed();
    expectMinePresent('mine-1');
  });

  test('given mine is rendered as 3x2 when player previews non-entry footprint tiles then no preview is shown', async () => {
    await setupMovementBehaviorApp({
      loadGameOptions: aScenario()
        .withSize(8, 4)
        .withEntities(aHero().at(0, 2), aMine().at(3, 2))
        .build()
    });

    dispatchTileClick(2, 1);
    await flushMicrotasks();
    expectNoPreview();

    dispatchTileClick(3, 1);
    await flushMicrotasks();
    expectNoPreview();

    dispatchTileClick(4, 1);
    await flushMicrotasks();
    expectNoPreview();

    dispatchTileClick(2, 2);
    await flushMicrotasks();
    expectNoPreview();

    dispatchTileClick(4, 2);
    await flushMicrotasks();
    expectNoPreview();
  });
});

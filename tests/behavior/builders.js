import { builder } from '@jjanczyk/object-builder';

const placeable = (entity) => ({
  at(x, y) {
    entity.tile = { x, y };
  }
});

export const aHero = () =>
  builder({ id: 'hero-1', kind: 'HERO', type: 'HERO', tile: { x: 0, y: 0 } }, placeable);

export const aMonster = () =>
  builder({ id: 'monster-1', kind: 'MONSTER', type: 'SKELETON', tile: { x: 1, y: 0 } }, placeable);

export const aResource = () =>
  builder({ id: 'resource-1', kind: 'RESOURCE', type: 'GOLD_PILE', tile: { x: 1, y: 0 } }, placeable);

export const aTown = () =>
  builder({ id: 'town-1', kind: 'TOWN', type: 'CASTLE', tile: { x: 1, y: 0 } }, placeable);

export const aScenario = () =>
  builder(
    {
      width: 6,
      height: 1,
      tiles: new Array(6).fill(0),
      entities: [aHero().build()],
      definitions: {}
    },
    (scenario) => ({
      withSize(width, height = 1) {
        scenario.width = width;
        scenario.height = height;
        scenario.tiles = new Array(width * height).fill(0);
      },
      withEntities(...entities) {
        scenario.entities = entities.map((entity) => entity.build());
      }
    })
  );

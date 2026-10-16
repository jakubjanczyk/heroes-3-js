// Tile codes used in scenario terrain. 0 and 1 keep their V1 meaning (open / blocked ground).
export const heroesTerrainTypes = Object.freeze({
  0: Object.freeze({ name: 'grass', passable: true }),
  1: Object.freeze({ name: 'rock', passable: false }),
  2: Object.freeze({ name: 'dirt', passable: true }),
  3: Object.freeze({ name: 'sand', passable: true }),
  4: Object.freeze({ name: 'snow', passable: true }),
  5: Object.freeze({ name: 'swamp', passable: true }),
  6: Object.freeze({ name: 'rough', passable: true }),
  7: Object.freeze({ name: 'subterranean', passable: true }),
  8: Object.freeze({ name: 'lava', passable: true }),
  9: Object.freeze({ name: 'water', passable: false })
})

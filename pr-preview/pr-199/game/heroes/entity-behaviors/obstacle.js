// An obstacle is placed by the bottom-right corner of its picture, which it may not block, so it
// blocks only the tiles its data lists.
export const obstacleBehavior = Object.freeze({
  kind: 'OBSTACLE',
  occupiesOwnTile: false,
  footprintOffsets: (entity, definitions) => definitions.obstacles?.[entity.type]?.blocks ?? []
})

import { typeToClass } from './shared.js'

// No pictures yet: the market shows its name across its entrance and the tiles it blocks.
export function getEntityLayerStyle({ entity, map, definitions = {} }) {
  const market = definitions.markets?.[entity.type]
  const columns = [0, ...(market?.footprint ?? []).map((offset) => offset.x)]
  const leftColumn = Math.min(...columns)
  const width = map.tileWidth * (Math.max(...columns) - leftColumn + 1)
  const height = map.tileHeight
  return {
    className: `entity entity--market entity--market-type-${typeToClass(entity.type)}`,
    width,
    height,
    offsetX: Math.round(leftColumn * map.tileWidth - map.tileWidth / 2),
    offsetY: -Math.round(height / 2),
    label: market?.name ?? null,
    dataset: { marketType: entity.type }
  }
}

# Map, Tiles & Camera
## Design & Implementation Reference

---

## Tile System

### Tile Size

Canonical tile size is defined once in `engine/map.js` and never redefined elsewhere. All coordinate math derives from these constants.

```js
const TILE_W = 64
const TILE_H = 32  // 2:1 ratio for diamond/isometric tiles
```

Sizing rationale: HoMM3 used 32×16 at 800×600. Doubling to 64×32 is comfortable on modern screens without tiles feeling oversized. The diamond visual fits inside a 64×32 bounding box — 64px wide, 32px tall.

**Do not use em/rem for tile sizing.** Those units introduce floating point unpredictability and complicate coordinate math. Use px internally everywhere. Handle zoom and scaling via CSS `transform: scale()` on the map container — the math never changes, only the visual scale does.

### Coordinate System

One canonical coordinate system: tile `{x, y}`. Everything else derives from it. Screen pixels, mouse hit detection, pathfinding, z-ordering — all convert through the same two functions. Never inline the math anywhere else.

```js
// engine/map.js — the only place this math lives
function tileToScreen(tile) {
  return {
    x: (tile.x - tile.y) * (TILE_W / 2),
    y: (tile.x + tile.y) * (TILE_H / 2)
  }
}

function screenToTile(screen) {
  // inverse — used for mouse click → tile
  return {
    x: Math.floor((screen.x / (TILE_W / 2) + screen.y / (TILE_H / 2)) / 2),
    y: Math.floor((screen.y / (TILE_H / 2) - screen.x / (TILE_W / 2)) / 2)
  }
}
```

**Origin decision:** coordinate origin (0,0) sits at top-center of the map, not top-left. For a diamond tile grid this is more natural — the first tile's diamond peak sits at the center-top. Decide this once and bake it into `tileToScreen`. Every consumer benefits automatically.

---

## Layer Stack

Five absolutely-positioned divs covering the full map area, stacked by z-index. Layers never communicate directly — only through the event bus.

```
.viewport                     ← fixed size, overflow: hidden
  .terrain-layer   z: 10      ← tile pool, virtualized, no world translation
  .world                      ← translates with camera via transform
    .object-layer  z: 20      ← static objects (trees, rocks, mines)
    .entity-layer  z: 30      ← heroes, monsters, resources, towns
    .effects-layer z: 40      ← movement trails, spell effects, highlights
  .ui-layer        z: 50      ← minimap, notifications, buttons, cursor
```

TerrainLayer sits outside `.world` because it uses a tile pool and repositions tiles itself. All other layers live inside `.world` and move with the camera transform for free.

---

## Camera

```js
// engine/camera.js
class Camera {
  constructor(viewportEl, worldEl) {
    this.viewportEl = viewportEl
    this.worldEl = worldEl
    this.x = 0  // world offset in px
    this.y = 0
  }

  moveTo(x, y) {
    const prevTileX = Math.floor(this.x / TILE_W)
    const prevTileY = Math.floor(this.y / TILE_H)

    this.x = clamp(x, 0, maxX)
    this.y = clamp(y, 0, maxY)

    // world div translates continuously — entities always in right place
    this.worldEl.style.transform = `translate(${-this.x}px, ${-this.y}px)`

    // terrain retile only fires when crossing a tile boundary, not every px
    const newTileX = Math.floor(this.x / TILE_W)
    const newTileY = Math.floor(this.y / TILE_H)
    if (newTileX !== prevTileX || newTileY !== prevTileY) {
      bus.dispatchEvent(new CustomEvent('CAMERA_TILE_CROSSED'))
    }
  }

  centerOn(tile) {
    const screen = tileToScreen(tile)
    this.moveTo(
      screen.x - this.viewportEl.clientWidth / 2,
      screen.y - this.viewportEl.clientHeight / 2
    )
  }
}
```

### Camera Movement Triggers

- **Hero moves** — camera follows hero, lerping smoothly to keep them centered
- **Edge scrolling** — mouse near viewport edge pans camera (classic RTS)
- **Arrow keys** — pan camera independently of hero
- **Minimap click** — jump camera to position
- **Middle/right mouse drag** — freeform pan

### Smooth Follow with Lerp

Hard snapping to hero position feels bad. Lerp toward target each frame:

```js
function update(dt) {
  const target = tileToScreen(hero.tile)
  const targetCamX = target.x - viewport.clientWidth / 2
  const targetCamY = target.y - viewport.clientHeight / 2

  camera.x += (targetCamX - camera.x) * 0.1
  camera.y += (targetCamY - camera.y) * 0.1
  camera.apply()
}
```

### Zoom

Zoom never touches coordinate math — it applies `transform: scale()` to the map container:

```js
mapEl.style.setProperty('--map-scale', zoomLevel)
```

```css
.map-container {
  transform: scale(var(--map-scale, 1));
  transform-origin: top left;
}
```

---

## Terrain Virtualization

The full map can be 72×144 = ~10,000 tiles. Creating one div per tile is too heavy. Instead, create a small fixed pool of divs — just enough to cover the visible viewport plus a buffer — and reuse them as the camera moves.

### Pool Size

```js
const BUFFER = 2  // extra tiles beyond each edge
const cols = Math.ceil(viewportWidth / TILE_W) + BUFFER * 2
const rows = Math.ceil(viewportHeight / TILE_H) + BUFFER * 2
// ~24×19 = ~456 divs total on a typical screen — that's all that ever exists
```

### TerrainLayer

```js
// engine/layers/terrain.js
class TerrainLayer {
  constructor(el, map, camera) {
    this.el = el
    this.map = map
    this.camera = camera
    this.tilePool = []
    this.BUFFER = 2

    this.createPool()
    bus.addEventListener('CAMERA_TILE_CROSSED', () => this.retile())
    this.retile()  // initial draw
  }

  createPool() {
    const cols = Math.ceil(viewportWidth / TILE_W) + this.BUFFER * 2
    const rows = Math.ceil(viewportHeight / TILE_H) + this.BUFFER * 2

    for (let i = 0; i < cols * rows; i++) {
      const div = document.createElement('div')
      div.style.cssText = `
        position: absolute;
        width: ${TILE_W}px;
        height: ${TILE_H}px;
      `
      this.el.appendChild(div)
      this.tilePool.push(div)
    }
  }

  retile() {
    const startX = Math.floor(this.camera.x / TILE_W) - this.BUFFER
    const startY = Math.floor(this.camera.y / TILE_H) - this.BUFFER

    const cols = Math.ceil(viewportWidth / TILE_W) + this.BUFFER * 2
    const rows = Math.ceil(viewportHeight / TILE_H) + this.BUFFER * 2

    let i = 0
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tileX = startX + col
        const tileY = startY + row
        const div = this.tilePool[i++]

        if (!this.map.inBounds({x: tileX, y: tileY})) {
          div.style.visibility = 'hidden'
          continue
        }

        const screen = tileToScreen({x: tileX, y: tileY})
        div.style.visibility = 'visible'
        div.style.transform = `translate(${screen.x}px, ${screen.y}px)`
        div.style.backgroundColor = terrainColor(this.map.getTerrain({x: tileX, y: tileY}))
        div.dataset.tile = `${tileX},${tileY}`
      }
    }
  }
}
```

### Why This Is Fast

- `retile()` fires only on tile boundary crossing, not every pixel of scroll — roughly 2-3 times per second during smooth scrolling
- `transform` updates don't trigger layout recalculation, only compositing
- ~500 string assignments per retile is imperceptible on modern hardware
- Can be wrapped in `requestAnimationFrame` if needed to guarantee it stays off critical path

### Entity and Object Layers

These do not need virtualization. At most 50-100 entities exist on a map at once. They live inside `.world` and move with the camera translate for free — no special handling needed.

---

## Minimap

The minimap is an SVG element in UILayer showing the full map at reduced scale. It is always top-down (rectangular grid), not isometric — simpler to draw and easier to read. Each tile maps to a small rect at `{x, y}` without diamond transformation.

```js
const MINI_W = 200
const MINI_H = 150
const scaleX = MINI_W / fullMapWidthPx
const scaleY = MINI_H / fullMapHeightPx
```

### Structure

Three groups inside the SVG, drawn in order:

```
<svg>
  <g class="terrain">   ← one rect per tile, drawn once on load
  <g class="entities">  ← small colored dots, updated on entity events
  <rect class="viewport"> ← viewport indicator, updated on camera move
```

### Terrain — drawn once

```js
drawTerrain() {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', x * scaleX)
      rect.setAttribute('y', y * scaleY)
      rect.setAttribute('width', Math.ceil(scaleX))
      rect.setAttribute('height', Math.ceil(scaleY))
      rect.setAttribute('fill', terrainColor(map.getTerrain({x, y})))
      this.terrainGroup.appendChild(rect)
    }
  }
}
```

### Entities — updated on events

```js
updateEntities(entities) {
  this.entityGroup.innerHTML = ''
  for (const entity of entities) {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    dot.setAttribute('x', entity.tile.x * scaleX)
    dot.setAttribute('y', entity.tile.y * scaleY)
    dot.setAttribute('width', 3)
    dot.setAttribute('height', 3)
    dot.setAttribute('fill', entityColor(entity.type))
    this.entityGroup.appendChild(dot)
  }
}
```

### Viewport indicator — updated on camera move

```js
updateViewport() {
  this.viewportRect.setAttribute('x', camera.x * scaleX)
  this.viewportRect.setAttribute('y', camera.y * scaleY)
  this.viewportRect.setAttribute('width', viewportWidth * scaleX)
  this.viewportRect.setAttribute('height', viewportHeight * scaleY)
}
```

Only the viewport rect updates every frame. Terrain is static. Entity dots update on `ENTITY_MOVED` / `ENTITY_REMOVED` events. The viewport rect is the only per-frame cost, and it's a single setAttribute call.

### Clicking the Minimap

```js
minimapEl.addEventListener('click', (e) => {
  const rect = minimapEl.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const worldX = mx / scaleX
  const worldY = my / scaleY

  camera.moveTo(worldX - viewportWidth / 2, worldY - viewportHeight / 2)
})
```

Drag-to-pan works the same way with `mousemove` while button is held.

### Event Connections

```
HERO_MOVED          → camera.centerOn(tile) → minimap.updateViewport()
CAMERA_TILE_CROSSED → minimap.updateViewport()
ENTITY_REMOVED      → minimap.updateEntities()
ENTITY_SPAWNED      → minimap.updateEntities()
```

Minimap is a UILayer concern. Camera is an engine primitive. Neither knows about the other directly — events connect them.

---

## Files

```
/engine
  map.js          ← TILE_W, TILE_H, tileToScreen, screenToTile, inBounds, getTerrain
  camera.js       ← Camera class, moveTo, centerOn, zoom
  layers/
    terrain.js    ← TerrainLayer, tile pool, virtualization
    ui.js         ← UILayer, owns minimap and cursor
```

Map and camera are engine primitives — no game imports. TerrainLayer and UILayer are engine layer implementations. None of these files import from `/game`.

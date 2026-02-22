# Tech Stack
## Browser Platform Decisions & Modern API Usage

---

## Target

Latest Chrome only. No polyfills, no transpilation for compatibility. This unlocks the full modern platform — native ESM, top-level await, Web Components, CSS Houdini, Web Workers as modules, import maps, constructable stylesheets, CSS `@layer`.

---

## JavaScript Modules

### Native ESM

No bundler needed for the core codebase. Chrome resolves relative imports natively. Folder structure becomes the module system.

```js
// engine/map.js
export function tileToScreen(tile) { ... }
export function screenToTile(screen) { ... }

// engine/layers/entity.js
import { tileToScreen } from '../map.js'
import { Entity } from '../entity.js'
```

```html
<!-- index.html — one script tag, everything else resolved by browser -->
<script type="module" src="main.js"></script>
```

No `node_modules`, no config files, no build step for application code.

### Import Maps

Avoids deep relative paths (`../../engine/map.js`) without a bundler. Define once in HTML, use clean paths everywhere:

```html
<script type="importmap">
{
  "imports": {
    "engine/": "./engine/",
    "game/":   "./game/",
    "portfolio/": "./portfolio/"
  }
}
</script>
```

```js
// anywhere in codebase — clean, absolute-feeling imports
import { tileToScreen } from 'engine/map.js'
import { Hero } from 'game/entities/hero.js'
```

Native Chrome, no tooling required.

### When a Build Step Is Acceptable

One case where a minimal build step earns its place: CSS Houdini paint worklets must be self-contained files with no external imports. If worklets are written with imports, they need bundling into a single file before registration.

```bash
# esbuild only — no config file, milliseconds, only for worklets
esbuild engine/houdini/terrain-painter.js --bundle --outfile=dist/terrain-painter.js
```

Everything else runs natively. This is the only build step that may be needed.

### Web Workers

Chrome supports module workers natively — no bundling needed:

```js
new Worker('./engine/workers/pathfinding.js', { type: 'module' })
```

The worker can use ESM imports just like any other module. Message passing maps cleanly onto the event system — worker receives tile/path data, returns results, main thread fires events.

---

## CSS Organization

No PostCSS, no CSS Modules, no Sass. The native platform handles everything needed.

### File Structure Mirrors JS Structure

```
/styles
  main.css              ← @import everything, declares @layer order
  reset.css
  theme.css             ← all custom properties (design tokens)

/engine
  /layers
    terrain.css
    entity.css
    ui.css

/game
  theme.css             ← game-specific token overrides
  /ui
    notification.css
    minimap.css
    cursor.css

/portfolio
  theme.css             ← portfolio-specific token overrides
  /ui
    nav.css
    location.css
```

### @layer for Cascade Control

Declare layer order once. Later layers win over earlier ones regardless of specificity — no more specificity wars.

```css
/* styles/main.css */
@layer reset, engine, game, ui, theme;

@import './reset.css' layer(reset);
@import './theme.css';
@import 'engine/layers/entity.css' layer(engine);
@import 'game/ui/notification.css' layer(game);
```

```css
/* engine/layers/entity.css */
@layer engine {
  .entity { position: absolute; transition: transform 140ms linear; }
}

/* game/ui/notification.css */
@layer game {
  .notification { position: fixed; bottom: 20px; }
}
```

Engine styles never accidentally override game styles. UI always wins. Explicit and predictable.

### CSS Custom Properties as Design System

All design tokens live in `theme.css` as custom properties. Accessible from both CSS and JS.

```css
/* styles/theme.css */
:root {
  --tile-w: 64px;
  --tile-h: 32px;

  --color-terrain-grass: #4a7c3f;
  --color-terrain-dirt:  #8b6914;
  --color-terrain-water: #2a4f7c;
  --color-terrain-mountain: #6b6b6b;

  --color-entity-hero:     #ffd700;
  --color-entity-monster:  #cc2222;
  --color-entity-resource: #44bb44;
  --color-entity-town:     #8888ff;

  --ui-panel-bg:   rgba(20, 16, 10, 0.9);
  --ui-border:     #8b7355;
  --ui-text:       #e8d9b0;

  --transition-entity: 140ms linear;
  --map-scale: 1;
}
```

Reading and writing from JS:

```js
// read
getComputedStyle(el).getPropertyValue('--tile-w')

// write — zoom, theme changes, etc.
document.documentElement.style.setProperty('--map-scale', 1.5)
```

Zoom, night mode, theme switching — all driven by custom property changes that cascade everywhere automatically.

### Constructable Stylesheets

For styles that should live with their JS class rather than in a separate file. Particularly useful with Web Components.

```js
class EntityLayer {
  static styles = new CSSStyleSheet()

  static {
    EntityLayer.styles.replaceSync(`
      .entity {
        position: absolute;
        transition: transform var(--transition-entity);
      }
    `)
    document.adoptedStyleSheets.push(EntityLayer.styles)
  }
}
```

Styles are co-located with the code that uses them. No class name collisions because scope is intentional.

---

## Web Components

Used for UI layer only — not for rendering layers (TerrainLayer, EntityLayer etc. stay as plain JS classes with precise DOM control).

Good candidates: notification panel, resource bar, minimap container, town screen dialog, hero info panel, any self-contained widget.

```js
// game/ui/notification-panel.js
class NotificationPanel extends HTMLElement {
  static styles = new CSSStyleSheet()

  static {
    NotificationPanel.styles.replaceSync(`
      :host {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        pointer-events: none;
      }
      .message {
        background: var(--ui-panel-bg);
        border: 1px solid var(--ui-border);
        color: var(--ui-text);
        padding: 8px 16px;
        margin-top: 4px;
        animation: fadeIn 150ms ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `)
  }

  connectedCallback() {
    this.attachShadow({ mode: 'open' })
    this.shadowRoot.adoptedStyleSheets = [NotificationPanel.styles]
    bus.addEventListener('NOTIFICATION_SHOWN', (e) => this.show(e.detail.message))
  }

  show(message) {
    const div = document.createElement('div')
    div.className = 'message'
    div.textContent = message
    this.shadowRoot.appendChild(div)
    setTimeout(() => div.remove(), 3000)
  }
}

customElements.define('notification-panel', NotificationPanel)
```

```html
<!-- index.html — same for game and portfolio -->
<notification-panel></notification-panel>
```

Shadow DOM provides style encapsulation. `connectedCallback` / `disconnectedCallback` map onto component lifecycle. Custom properties pierce the shadow boundary so global theme tokens still apply inside components.

---

## CSS Houdini

Paint worklets let CSS call custom JS painters. Tile divs declare what they are via CSS custom properties, worklets handle the actual drawing. Tile is data, painter is art — clean separation.

```js
// register once at boot
CSS.paintWorklet.addModule('./dist/terrain-painter.js')
```

```css
.tile { background: paint(terrain); }
.tile--grass    { --terrain-type: 0; --terrain-variant: 2; }
.tile--water    { --terrain-type: 1; }
.tile--mountain { --terrain-type: 2; }
```

```js
// engine/houdini/terrain-painter.js (bundled via esbuild before use)
class TerrainPainter {
  static get inputProperties() {
    return ['--terrain-type', '--terrain-variant']
  }

  paint(ctx, size, props) {
    const type = props.get('--terrain-type').toString().trim()
    const variant = props.get('--terrain-variant').toString().trim()
    // draw terrain art into ctx
  }
}

registerPaint('terrain', TerrainPainter)
```

This is the bridge between the DOM tile pool and actual visual art. The tile pool assigns CSS classes, Houdini does the painting.

---

## Technologies to Explore

Listed by fit with this project, not by novelty.

**Web Workers** — most immediately useful. Move pathfinding and eventually AI into a worker thread. Main thread never blocks. Maps cleanly onto event system — post tile data, receive path back, fire events. Chrome supports module workers natively so no bundling needed.

**CSS Houdini** — strong fit for tile painting (see above). Also useful for effects layer — custom painters for fog of war, highlight rings, spell effect overlays.

**WebRTC Data Channels** — direct path to multiplayer. Peer-to-peer game data without a relay server. Turn-based means no real-time sync complexity — just share the event log. Still need a small signaling server to establish connections.

**Web Components** — already in the stack for UI. Worth exploring deeper for the portfolio use case where each location (project, experience) is a genuinely distinct component with its own content and behavior.

**OPFS (Origin Private File System)** — lets the browser do real file I/O. Useful if you want to load original HoMM3 assets from local game files rather than hosting them. Very new, worth watching.

**WebGPU** — future of GPU access in browsers. More modern than WebGL, supports compute shaders. Not needed now, but interesting for particle effects or minimap rendering if performance ever matters.

**JS Decorators** — just landed in Chrome. Useful for declarative event wiring on entity methods. Still experimental but worth watching for the portfolio entity authoring experience.

---

## Recommended Stack Summary

```
Native ESM                  ← module system
Import maps                 ← clean import paths, no bundler
@import + @layer            ← CSS file organization and cascade control
CSS Custom Properties       ← design tokens, theme switching, zoom
Constructable Stylesheets   ← styles co-located with JS classes
Web Components              ← UI layer widgets
CSS Houdini                 ← tile and effect painting
Web Workers (type:module)   ← pathfinding, AI off main thread
esbuild (minimal, optional) ← only for bundling Houdini worklets
IndexedDB                   ← event log persistence (hand-rolled, no library)
```

No Webpack. No Vite. No Babel. No PostCSS. No CSS Modules. No libraries.

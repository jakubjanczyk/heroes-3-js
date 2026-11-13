import { execFile, spawn } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs, promisify } from 'node:util'

import { freeTilesNextTo, loadWorld, readDemoScenario } from './demo-map.mjs'

// Playwright isn't a dependency of the repo: cloud sessions have it installed globally, which only
// require() finds (through NODE_PATH).
const { chromium } = createRequire(import.meta.url)('playwright')

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: {
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  }
}

const usage = `Usage: node scripts/screenshot.mjs <steps.mjs> [--out dir] [--viewports desktop,phone] [--port 8181] [--video]

--video also records each viewport's run to <out>/<viewport>.mp4, from the moment the map shows,
and holds the page still for a second after each shot so the outcome stays on screen.

The steps module:
  // Optional: an object, or a function of the demo scenario (it may be async).
  export const scenario = (demo, { withMonsterNextToHero, freeTileNextTo }) => ({ ...demo, ... })
  export default async function ({ page, shot, viewport, tile, clickTile, walkTo, dialog,
    startBattle, battle, hex, stackHex, clickHex, clickStack, castSpell }) { ... }`

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: '/tmp/shots' },
    viewports: { type: 'string', default: 'desktop,phone' },
    port: { type: 'string', default: '8181' },
    video: { type: 'boolean', default: false }
  }
})

if (positionals.length !== 1) {
  console.error(usage)
  process.exit(1)
}

const stepsModule = await import(pathToFileURL(path.resolve(positionals[0])).href)
const viewportNames = options.viewports.split(',').map((name) => name.trim())
const unknownViewport = viewportNames.find((name) => !VIEWPORTS[name])
if (unknownViewport) {
  console.error(`Unknown viewport "${unknownViewport}"; use ${Object.keys(VIEWPORTS).join(', ')}`)
  process.exit(1)
}

async function waitForServer(url, attempts = 50) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`The static server did not answer at ${url}`)
}

const SHOT_MONSTER_ID = 'monster-shot'

function createScenarioHelpers(world) {
  const freeTileNextTo = (tile) => {
    const [free] = freeTilesNextTo(world, tile)
    if (!free) throw new Error(`No free tile next to (${tile.x}, ${tile.y})`)
    return free
  }

  // The demo hero starts walled in by objects, so the battle's monster is put right next to it.
  // `hero` changes the hero (army, primarySkills, spells, secondarySkills, ...).
  const withMonsterNextToHero = (demo, { type = 'SKELETON', count = 10, hero = {} } = {}) => {
    const demoHero = demo.entities.find(({ id }) => id === 'hero-1')
    const monster = {
      id: SHOT_MONSTER_ID,
      kind: 'MONSTER',
      type,
      count,
      tile: freeTileNextTo(demoHero.tile)
    }
    return {
      ...demo,
      fogOfWar: false,
      entities: [
        ...demo.entities.map((entity) => (entity === demoHero ? { ...entity, ...hero } : entity)),
        monster
      ]
    }
  }

  return { freeTileNextTo, withMonsterNextToHero }
}

async function loadScenario() {
  if (!stepsModule.scenario) return null
  if (typeof stepsModule.scenario !== 'function') return stepsModule.scenario
  const demo = await readDemoScenario()
  return stepsModule.scenario(demo, createScenarioHelpers(await loadWorld(demo)))
}

function createBattleHelpers(page, viewportName, scenario, walkTo) {
  const battle = () => page.getByRole('dialog', { name: 'Battle' })
  const battlefield = () => battle().getByRole('grid', { name: 'Battlefield' })
  const book = () => page.getByRole('dialog', { name: 'Spell book' })

  // Rows and columns are counted as in the behavior tests: row 1 at the top, column 1 on the
  // attacker's side.
  const hex = (row, column) =>
    battlefield()
      .locator(`[role="row"][aria-rowindex="${row}"]`)
      .locator(`[role="gridcell"][aria-colindex="${column + 1}"]`)
  const stackHex = (name) =>
    battlefield()
      .getByRole('gridcell')
      .filter({ has: page.getByRole('img', { name, exact: true }) })
      .first()

  // The hex takes the pointer, not the stack drawn on it, and a hex out of reach is
  // aria-disabled though the game still takes the click (to cast or shoot), hence force.
  const press = (locator) =>
    viewportName === 'phone' ? locator.tap({ force: true }) : locator.click({ force: true })
  const clickHex = (row, column) => press(hex(row, column))
  const clickStack = (name) => press(stackHex(name))

  async function startBattle(monsterId = SHOT_MONSTER_ID) {
    const monster = scenario?.entities.find(({ id }) => id === monsterId)
    if (!monster) throw new Error(`No ${monsterId} on the map: use withMonsterNextToHero`)
    await walkTo(monster.tile.x, monster.tile.y)
    await battlefield().waitFor()
    await page.waitForTimeout(500)
  }

  // Opens the battle's spell book, turns pages until the spell shows and casts it on a stack
  // (by its name, "Skeletons") or a hex ({ row, column }). The hero needs the spell points.
  async function castSpell(name, { on } = {}) {
    await press(battle().getByRole('button', { name: 'Cast spell' }))
    await book().waitFor()
    const spell = book().getByRole('button', { name, exact: true })
    for (let turned = 0; (await spell.count()) === 0; turned += 1) {
      if (turned > 10) throw new Error(`"${name}" isn't in the hero's spell book`)
      await press(book().getByRole('button', { name: 'Next page', exact: true }))
    }
    await press(spell)
    if (typeof on === 'string') await clickStack(on)
    else if (on) await clickHex(on.row, on.column)
    await page.waitForTimeout(500)
  }

  return { battle, hex, stackHex, clickHex, clickStack, startBattle, castSpell }
}

function createHelpers(page, viewportName, scenario) {
  let shotCount = 0
  const tile = (x, y) => page.locator(`.terrain-tile[data-x="${x}"][data-y="${y}"]`)

  // Tiles off screen can't take a real click, so the click is dispatched, as the behavior tests do.
  const clickTile = (x, y) => tile(x, y).dispatchEvent('click')

  const dialog = () => page.getByRole('dialog').last()

  const heroTile = (heroId) =>
    page.evaluate((heroId) => {
      const hero = document.querySelector(`.entity--hero[data-entity-id="${heroId}"]`)
      return hero ? `${hero.dataset.tileX},${hero.dataset.tileY}` : null
    }, heroId)

  // Done once a dialog opens or the hero has stood still for a second: a pickup, a monster or a
  // blocked step stops the hero before the clicked tile.
  async function walkTo(x, y, heroId = 'hero-1') {
    await clickTile(x, y)
    await clickTile(x, y)
    let lastTile = await heroTile(heroId)
    let stillFor = 0
    for (let waited = 0; waited < 60_000 && stillFor < 1000; waited += 250) {
      await page.waitForTimeout(250)
      if ((await page.getByRole('dialog').count()) > 0) break
      const tileNow = await heroTile(heroId)
      stillFor = tileNow === lastTile ? stillFor + 250 : 0
      lastTile = tileNow
    }
    return lastTile
  }

  async function shot(name) {
    shotCount += 1
    const file = path.join(
      options.out,
      `${viewportName}-${String(shotCount).padStart(2, '0')}-${name}.png`
    )
    await page.screenshot({ path: file })
    console.log(file)
    if (options.video) await page.waitForTimeout(1000)
    return file
  }

  return {
    tile,
    clickTile,
    dialog,
    walkTo,
    shot,
    ...createBattleHelpers(page, viewportName, scenario, walkTo)
  }
}

// Playwright records VP8 WebM, which Safari on a phone doesn't play, so the run is re-encoded to
// H.264 MP4, without the blank page and loading screen before the map shows.
async function saveVideo(page, viewportName, mapShownAfterMs) {
  const webm = path.join(options.out, `${viewportName}.webm`)
  const mp4 = path.join(options.out, `${viewportName}.mp4`)
  await page.video().saveAs(webm)
  await page.video().delete()
  await promisify(execFile)('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    String((mapShownAfterMs + 300) / 1000),
    '-i',
    webm,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-vf',
    'pad=ceil(iw/2)*2:ceil(ih/2)*2',
    '-movflags',
    '+faststart',
    mp4
  ])
  await rm(webm)
  console.log(mp4)
}

async function run(browser, baseUrl, scenario, viewportName) {
  const { viewport } = VIEWPORTS[viewportName]
  const context = await browser.newContext({
    ...VIEWPORTS[viewportName],
    ...(options.video ? { recordVideo: { dir: options.out, size: viewport } } : {})
  })
  const page = await context.newPage()
  const recordingStartedAt = Date.now()
  page.on('pageerror', (error) => console.error(`[${viewportName}] page error: ${error.message}`))
  if (scenario) {
    await page.route('**/scenarios/scenario.json', (route) => route.fulfill({ json: scenario }))
  }
  await page.goto(baseUrl)
  await page.locator('.terrain-tile').first().waitFor()
  await page.addStyleTag({ content: '.bus-dev-panel { display: none !important; }' })
  const mapShownAfterMs = Date.now() - recordingStartedAt
  try {
    await stepsModule.default({
      page,
      viewport: viewportName,
      ...createHelpers(page, viewportName, scenario)
    })
  } catch (error) {
    const file = path.join(options.out, `${viewportName}-failed.png`)
    await page.screenshot({ path: file }).catch(() => {})
    console.error(`[${viewportName}] steps failed, the page at that moment is in ${file}`)
    throw error
  } finally {
    await context.close()
    if (options.video) await saveVideo(page, viewportName, mapShownAfterMs)
  }
}

await mkdir(options.out, { recursive: true })
const baseUrl = `http://127.0.0.1:${options.port}/`
const server = spawn(
  process.execPath,
  [path.join(repoRoot, 'scripts/static-server.mjs'), options.port],
  {
    stdio: 'ignore'
  }
)
let failed = false
try {
  await waitForServer(baseUrl)
  const scenario = await loadScenario()
  const browser = await chromium.launch()
  try {
    for (const viewportName of viewportNames) {
      await run(browser, baseUrl, scenario, viewportName)
    }
  } finally {
    await browser.close()
  }
} catch (error) {
  failed = true
  console.error(error)
} finally {
  server.kill()
}
process.exit(failed ? 1 : 0)

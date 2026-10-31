import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'

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

const usage = `Usage: node scripts/screenshot.mjs <steps.mjs> [--out dir] [--viewports desktop,phone] [--port 8181]

The steps module:
  export const scenario = (demo) => ({ ...demo, ... })   // optional: an object, or a function of the demo scenario
  export default async function ({ page, shot, viewport, tile, clickTile, walkTo, dialog }) { ... }`

const { values: options, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: '/tmp/shots' },
    viewports: { type: 'string', default: 'desktop,phone' },
    port: { type: 'string', default: '8181' }
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

async function loadScenario() {
  if (!stepsModule.scenario) return null
  if (typeof stepsModule.scenario !== 'function') return stepsModule.scenario
  const demo = JSON.parse(await readFile(path.join(repoRoot, 'scenarios/scenario.json'), 'utf8'))
  return stepsModule.scenario(demo)
}

function createHelpers(page, viewportName) {
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
    return file
  }

  return { tile, clickTile, dialog, walkTo, shot }
}

async function run(browser, baseUrl, scenario, viewportName) {
  const context = await browser.newContext(VIEWPORTS[viewportName])
  const page = await context.newPage()
  page.on('pageerror', (error) => console.error(`[${viewportName}] page error: ${error.message}`))
  if (scenario) {
    await page.route('**/scenarios/scenario.json', (route) => route.fulfill({ json: scenario }))
  }
  await page.goto(baseUrl)
  await page.locator('.terrain-tile').first().waitFor()
  await page.addStyleTag({ content: '.bus-dev-panel { display: none !important; }' })
  try {
    await stepsModule.default({
      page,
      viewport: viewportName,
      ...createHelpers(page, viewportName)
    })
  } catch (error) {
    const file = path.join(options.out, `${viewportName}-failed.png`)
    await page.screenshot({ path: file }).catch(() => {})
    console.error(`[${viewportName}] steps failed, the page at that moment is in ${file}`)
    throw error
  } finally {
    await context.close()
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

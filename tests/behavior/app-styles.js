import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import cascadeLayers from '@csstools/postcss-cascade-layers'
import postcss from 'postcss'
import customProperties from 'postcss-custom-properties'
import postcssImport from 'postcss-import'
import nesting from 'postcss-nesting'

const STYLES_PATH = join(import.meta.dirname, '../../styles.css')
const STYLE_ELEMENT_ID = 'app-styles'

// What browsers set that jsdom does not: Chrome's own stylesheet gives buttons the system arrow.
const BROWSER_DEFAULTS_CSS = 'button { cursor: default; }'

let appCssPromise = null

const computeStyleFromStylesheets = window.getComputedStyle

// Without the app's styles nothing is hidden or coloured by a stylesheet, only by the element's
// own style, so that is all a test reads. Working styles out from jsdom's built-in stylesheet
// takes a third of the behavior tests' time, mostly in Testing Library checking what is visible.
function readInlineStyle(element) {
  return element.style
}

window.getComputedStyle = readInlineStyle

// jsdom ignores @layer and nesting and does not resolve var(), so the real stylesheet is
// flattened before loading. Only variables declared on :root are resolved.
function getAppCss() {
  appCssPromise ??= readFile(STYLES_PATH, 'utf8').then(async (source) => {
    const result = await postcss([
      postcssImport(),
      nesting(),
      cascadeLayers(),
      customProperties({ preserve: false })
    ]).process(source, { from: STYLES_PATH })
    return result.css
  })
  return appCssPromise
}

export async function loadAppStyles() {
  if (document.getElementById(STYLE_ELEMENT_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ELEMENT_ID
  style.textContent = `${BROWSER_DEFAULTS_CSS}\n${await getAppCss()}`
  document.head.appendChild(style)
  window.getComputedStyle = computeStyleFromStylesheets
}

export function unloadAppStyles() {
  document.getElementById(STYLE_ELEMENT_ID)?.remove()
  window.getComputedStyle = readInlineStyle
}

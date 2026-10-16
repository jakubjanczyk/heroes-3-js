import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import cascadeLayers from '@csstools/postcss-cascade-layers'
import postcss from 'postcss'
import customProperties from 'postcss-custom-properties'
import postcssImport from 'postcss-import'
import nesting from 'postcss-nesting'

const STYLES_PATH = join(import.meta.dirname, '../../styles.css')
const STYLE_ELEMENT_ID = 'app-styles'

let appCssPromise = null

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
  style.textContent = await getAppCss()
  document.head.appendChild(style)
}

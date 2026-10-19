// Pixel art kept in the source as rows of palette keys, drawn at the scale of the resource
// sprites. '.' is a transparent pixel; every other key is an [r, g, b, a] colour.

export function isJsdomRuntime() {
  const userAgent = globalThis.navigator?.userAgent
  return typeof userAgent === 'string' && userAgent.toLowerCase().includes('jsdom')
}

function toRgba(rows, palette) {
  const width = rows[0].length
  const rgba = new Uint8ClampedArray(width * rows.length * 4)
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x += 1) {
      const colour = palette[row[x]]
      if (colour) {
        rgba.set(colour, (y * width + x) * 4)
      }
    }
  })
  return rgba
}

// A PNG data URL of the art scaled up without smoothing, or null where there is no canvas (tests).
export function renderPixelArt({ rows, palette, scale }) {
  const document = globalThis.document
  if (isJsdomRuntime() || !document?.createElement) {
    return null
  }

  const width = rows[0].length
  const height = rows.length
  const source = document.createElement('canvas')
  source.width = width
  source.height = height
  const sourceContext = source.getContext?.('2d')
  if (!sourceContext) {
    return null
  }
  sourceContext.putImageData(new ImageData(toRgba(rows, palette), width, height), 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  context.imageSmoothingEnabled = false
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

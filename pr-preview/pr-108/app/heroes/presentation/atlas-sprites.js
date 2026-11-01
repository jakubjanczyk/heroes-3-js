// Draws sprites out of an atlas: one RGBA image with a table of where each sprite sits in it
// (u0/v0 its top left corner as a fraction of the atlas, w/h its size in pixels). Each sprite
// becomes a PNG data URL, scaled up without smoothing.

function isJsdomRuntime() {
  const userAgent = globalThis.navigator?.userAgent
  return typeof userAgent === 'string' && userAgent.toLowerCase().includes('jsdom')
}

export function createAtlasSprites({ width, height, sprites, rgba, scale }) {
  const dataUrlByKey = new Map()
  let atlasContext = null

  function scaled(value) {
    return Math.max(1, Math.round(value * scale))
  }

  function getAtlasContext() {
    if (atlasContext || isJsdomRuntime()) {
      return atlasContext
    }

    const canvas = globalThis.document?.createElement?.('canvas')
    if (!canvas) {
      return null
    }

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext?.('2d')
    if (!context) {
      return null
    }

    const imageData = context.createImageData(width, height)
    imageData.data.set(rgba)
    context.putImageData(imageData, 0, 0)
    atlasContext = context
    return atlasContext
  }

  function createDataUrl(sprite) {
    const context = getAtlasContext()
    const canvas = context && globalThis.document?.createElement?.('canvas')
    if (!canvas) {
      return null
    }

    canvas.width = scaled(sprite.w)
    canvas.height = scaled(sprite.h)

    const spriteContext = canvas.getContext?.('2d')
    if (!spriteContext) {
      return null
    }

    spriteContext.imageSmoothingEnabled = false
    spriteContext.drawImage(
      context.canvas,
      Math.round(sprite.u0 * width),
      Math.round(sprite.v0 * height),
      sprite.w,
      sprite.h,
      0,
      0,
      canvas.width,
      canvas.height
    )
    return canvas.toDataURL('image/png')
  }

  // The sprite's size once scaled and its picture, or null for a key the atlas does not have.
  // The picture is null where there is no canvas to draw it with (tests).
  return function getSpriteStyle(key) {
    const sprite = sprites[key]
    if (!sprite) {
      return null
    }

    if (!dataUrlByKey.has(key)) {
      dataUrlByKey.set(key, createDataUrl(sprite))
    }

    return {
      width: scaled(sprite.w),
      height: scaled(sprite.h),
      backgroundImage: dataUrlByKey.get(key)
    }
  }
}

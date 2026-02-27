import {
  RESOURCE_ATLAS_HEIGHT,
  RESOURCE_ATLAS_RGBA,
  RESOURCE_ATLAS_SPRITES,
  RESOURCE_ATLAS_WIDTH
} from './homm3-resource-atlas.js';

const RESOURCE_TYPE_TO_SPRITE_KEY = {
  GOLD_PILE: 'gold',
  WOOD_PILE: 'wood',
  ORE_PILE: 'ore',
  MERCURY_PILE: 'mercury',
  SULFUR_PILE: 'sulfur',
  CRYSTAL_PILE: 'crystal',
  GEMS_PILE: 'gems'
};

const RESOURCE_RENDER_SCALE = 1.25;

function getScaledDimension(value) {
  return Math.max(1, Math.round(value * RESOURCE_RENDER_SCALE));
}

const resourceSpriteDataUrlByType = new Map();

function isJsdomRuntime() {
  const userAgent = globalThis.navigator?.userAgent;
  return typeof userAgent === 'string' && userAgent.toLowerCase().includes('jsdom');
}

function getSpriteForResourceType(resourceType) {
  const spriteKey = RESOURCE_TYPE_TO_SPRITE_KEY[resourceType];
  if (!spriteKey) {
    return null;
  }

  return RESOURCE_ATLAS_SPRITES[spriteKey] ?? null;
}

function getAtlasCanvasContext() {
  if (isJsdomRuntime()) {
    return null;
  }

  const canvas = globalThis.document?.createElement?.('canvas');
  if (!canvas) {
    return null;
  }

  canvas.width = RESOURCE_ATLAS_WIDTH;
  canvas.height = RESOURCE_ATLAS_HEIGHT;

  const context = canvas.getContext?.('2d');
  if (!context) {
    return null;
  }

  const imageData = context.createImageData(RESOURCE_ATLAS_WIDTH, RESOURCE_ATLAS_HEIGHT);
  imageData.data.set(RESOURCE_ATLAS_RGBA);
  context.putImageData(imageData, 0, 0);
  return context;
}

function createResourceSpriteDataUrl(resourceType) {
  const sprite = getSpriteForResourceType(resourceType);
  if (!sprite) {
    return null;
  }

  const atlasContext = getAtlasCanvasContext();
  if (!atlasContext) {
    return null;
  }

  const canvas = globalThis.document?.createElement?.('canvas');
  if (!canvas) {
    return null;
  }

  const scaledWidth = getScaledDimension(sprite.w);
  const scaledHeight = getScaledDimension(sprite.h);

  canvas.width = scaledWidth;
  canvas.height = scaledHeight;

  const context = canvas.getContext?.('2d');
  if (!context) {
    return null;
  }

  context.imageSmoothingEnabled = false;

  const sourceX = Math.round(sprite.u0 * RESOURCE_ATLAS_WIDTH);
  const sourceY = Math.round(sprite.v0 * RESOURCE_ATLAS_HEIGHT);
  context.drawImage(
    atlasContext.canvas,
    sourceX,
    sourceY,
    sprite.w,
    sprite.h,
    0,
    0,
    scaledWidth,
    scaledHeight
  );
  return canvas.toDataURL('image/png');
}

export function getResourceSpriteStyle(resourceType) {
  const sprite = getSpriteForResourceType(resourceType);
  const fallbackSize = { width: 30, height: 25 };
  if (!sprite) {
    return {
      ...fallbackSize,
      backgroundImage: null
    };
  }

  if (!resourceSpriteDataUrlByType.has(resourceType)) {
    resourceSpriteDataUrlByType.set(resourceType, createResourceSpriteDataUrl(resourceType));
  }

  return {
    width: getScaledDimension(sprite.w),
    height: getScaledDimension(sprite.h),
    backgroundImage: resourceSpriteDataUrlByType.get(resourceType) ?? null
  };
}

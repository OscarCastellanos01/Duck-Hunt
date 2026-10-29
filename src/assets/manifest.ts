export type ImageKey =
  | 'bgBlue'
  | 'cloud1'
  | 'cloud2'
  | 'treeOak'
  | 'treePine'
  | 'grass1'
  | 'grass2'
  | 'curtain'
  | 'duckCommon'
  | 'duckFast'
  | 'duckGolden'
  | 'crosshair'
  | 'bulletIcon'
  | 'bulletEmptyIcon'
  | 'duckIcon'

export interface AssetManifest {
  images: Record<ImageKey, string>
}

const baseManifest: AssetManifest = {
  images: {
    bgBlue: '/assets/PNG/Stall/bg_blue.png',
    cloud1: '/assets/PNG/Stall/cloud1.png',
    cloud2: '/assets/PNG/Stall/cloud2.png',
    treeOak: '/assets/PNG/Stall/tree_oak.png',
    treePine: '/assets/PNG/Stall/tree_pine.png',
    grass1: '/assets/PNG/Stall/grass1.png',
    grass2: '/assets/PNG/Stall/grass2.png',
    curtain: '/assets/PNG/Stall/curtain_straight.png',
    duckCommon: '/assets/PNG/Objects/duck_brown.png',
    duckFast: '/assets/PNG/Objects/duck_white.png',
    duckGolden: '/assets/PNG/Objects/duck_yellow.png',
    crosshair: '/assets/PNG/HUD/crosshair_red_large.png',
    bulletIcon: '/assets/PNG/HUD/icon_bullet_gold_short.png',
    bulletEmptyIcon: '/assets/PNG/HUD/icon_bullet_empty_short.png',
    duckIcon: '/assets/PNG/HUD/icon_duck.png',
  },
}

const localOverrides = import.meta.glob<{ default: Partial<AssetManifest['images']> }>(
  './manifest.local.ts',
  { eager: true },
)

const merged = Object.values(localOverrides).reduce<AssetManifest['images']>(
  (images, module) => ({ ...images, ...module.default }),
  baseManifest.images,
)

export const ASSET_MANIFEST: AssetManifest = { images: merged }

export const IMAGE_KEYS = Object.keys(ASSET_MANIFEST.images) as ImageKey[]

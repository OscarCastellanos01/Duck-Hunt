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

export type AudioKey =
  | 'shoot'
  | 'empty'
  | 'hit'
  | 'hitGolden'
  | 'reload'
  | 'roundClear'
  | 'gameOver'
  | 'select'
  | 'record'

export interface AssetManifest {
  images: Record<ImageKey, string>
  audio: Record<AudioKey, string>
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
  audio: {
    shoot: '/audio/shoot.wav',
    empty: '/audio/empty.wav',
    hit: '/audio/hit.wav',
    hitGolden: '/audio/hitGolden.wav',
    reload: '/audio/reload.wav',
    roundClear: '/audio/roundClear.wav',
    gameOver: '/audio/gameOver.wav',
    select: '/audio/select.wav',
    record: '/audio/record.wav',
  },
}

interface ManifestOverride {
  images?: Partial<AssetManifest['images']>
  audio?: Partial<AssetManifest['audio']>
}

const localOverrides = import.meta.glob<{ default: ManifestOverride }>('./manifest.local.ts', {
  eager: true,
})

export const ASSET_MANIFEST: AssetManifest = Object.values(localOverrides).reduce<AssetManifest>(
  (manifest, module) => ({
    images: { ...manifest.images, ...module.default.images },
    audio: { ...manifest.audio, ...module.default.audio },
  }),
  baseManifest,
)

export const IMAGE_KEYS = Object.keys(ASSET_MANIFEST.images) as ImageKey[]
export const AUDIO_KEYS = Object.keys(ASSET_MANIFEST.audio) as AudioKey[]

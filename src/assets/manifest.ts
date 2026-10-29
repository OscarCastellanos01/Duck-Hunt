export type ImageKey =
  | 'wall'
  | 'curtainTop'
  | 'curtainSide'
  | 'water1'
  | 'water2'
  | 'stick'
  | 'duckYellow'
  | 'duckBrown'
  | 'duckGolden'
  | 'duckDecoy'
  | 'targetBull'
  | 'rifle'
  | 'holeBrown'
  | 'holeBlue'
  | 'crosshair'
  | 'bulletIcon'
  | 'bulletEmptyIcon'
  | 'duckIcon'
  | 'textReady'
  | 'textGo'
  | 'textTimeUp'
  | 'textGameOver'

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
  | 'penalty'
  | 'tick'

export interface AssetManifest {
  images: Record<ImageKey, string>
  audio: Record<AudioKey, string>
}

const baseManifest: AssetManifest = {
  images: {
    wall: '/assets/PNG/Stall/bg_wood.png',
    curtainTop: '/assets/PNG/Stall/curtain_straight.png',
    curtainSide: '/assets/PNG/Stall/curtain.png',
    water1: '/assets/PNG/Stall/water1.png',
    water2: '/assets/PNG/Stall/water2.png',
    stick: '/assets/PNG/Objects/stick_wood.png',
    duckYellow: '/assets/PNG/Objects/duck_yellow.png',
    duckBrown: '/assets/PNG/Objects/duck_brown.png',
    duckGolden: '/assets/PNG/Objects/duck_target_yellow.png',
    duckDecoy: '/assets/PNG/Objects/duck_back.png',
    targetBull: '/assets/PNG/Objects/target_colored.png',
    rifle: '/assets/PNG/Objects/rifle.png',
    holeBrown: '/assets/PNG/Objects/shot_brown_large.png',
    holeBlue: '/assets/PNG/Objects/shot_blue_small.png',
    crosshair: '/assets/PNG/HUD/crosshair_red_large.png',
    bulletIcon: '/assets/PNG/HUD/icon_bullet_gold_short.png',
    bulletEmptyIcon: '/assets/PNG/HUD/icon_bullet_empty_short.png',
    duckIcon: '/assets/PNG/HUD/icon_duck.png',
    textReady: '/assets/PNG/HUD/text_ready.png',
    textGo: '/assets/PNG/HUD/text_go.png',
    textTimeUp: '/assets/PNG/HUD/text_timeup.png',
    textGameOver: '/assets/PNG/HUD/text_gameover.png',
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
    penalty: '/audio/penalty.wav',
    tick: '/audio/tick.wav',
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

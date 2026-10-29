import type { OneEuroParams, Settings, SmoothingPreset } from '@/core/types'

export const APP_NAME = 'duck-gesture'

export const SETTINGS_STORAGE_KEY = 'duck-gesture:settings'
export const HIGH_SCORE_STORAGE_KEY = 'duck-gesture:high-score'

export const SMOOTHING_PRESETS: Record<SmoothingPreset, OneEuroParams> = {
  precise: { minCutoff: 1.5, beta: 20, dCutoff: 1 },
  balanced: { minCutoff: 1, beta: 10, dCutoff: 1 },
  smooth: { minCutoff: 0.6, beta: 5, dCutoff: 1 },
}

export const DEFAULT_SETTINGS: Settings = {
  gestureMode: 'thumb',
  thumbSensitivity: 0.6,
  recoilSensitivity: 0.5,
  cooldownMs: 250,
  smoothingPreset: 'balanced',
  oneEuro: SMOOTHING_PRESETS.balanced,
  mirror: true,
  cameraId: null,
  showPreview: true,
  showDebug: false,
  inputMode: 'camera',
  musicVolume: 0.5,
  sfxVolume: 0.8,
}

export const COOLDOWN_RANGE_MS = { min: 100, max: 1000 }
export const SENSITIVITY_RANGE = { min: 0, max: 1 }
export const VOLUME_RANGE = { min: 0, max: 1 }
export const ONE_EURO_RANGE = {
  minCutoff: { min: 0.01, max: 10 },
  beta: { min: 0, max: 100 },
  dCutoff: { min: 0.01, max: 10 },
}

export const CAMERA_CONSTRAINTS = { width: 640, height: 480, frameRate: 60 }

export const MEDIAPIPE_CONFIG = {
  wasmPath: '/mediapipe/wasm',
  modelPath: '/models/hand_landmarker.task',
  numHands: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
}

export const AIM_REGION = { minX: 0.15, maxX: 0.85, minY: 0.15, maxY: 0.85 }

export const POSE_THRESHOLDS = {
  indexExtendEnter: 0.3,
  indexExtendHold: 0.15,
  curlEnter: 0.05,
  curlHold: 0.2,
  thumbExtendEnter: 0.65,
  enterFrames: 3,
  exitFrames: 3,
}

export const THUMB_THRESHOLDS = {
  dropMin: 0.2,
  dropMax: 0.5,
  windowMs: 500,
  rearmFraction: 0.5,
  smoothing: 0.6,
  confirmFrames: 2,
}

export const RECOIL_THRESHOLDS = {
  windowMs: 120,
  speedSlow: 4,
  speedFast: 1.5,
  aimLookbackMs: 120,
}

export const HISTORY_CAPACITY = 64
export const TRACKING_FREEZE_MS = 300

export const DEBUG_CONFIG = {
  fixtureDurationMs: 3000,
  overlayRefreshMs: 250,
  statsWindow: 120,
}

export const GAME_CONFIG = {
  width: 960,
  height: 540,
  durationMs: 60_000,
  magazineSize: 6,
  reloadMs: 1100,
  hitboxScale: 1.25,
  aimAssistPx: 16,
  streakStep: 0.25,
  maxMultiplier: 4,
  readyMs: 1100,
  goMs: 600,
  timeUpMs: 1800,
  lowTimeMs: 10_000,
  shakeDurationMs: 80,
  shakeIntensity: 0.004,
  flashAlpha: 0.2,
  flashMs: 90,
  floatingTextMs: 800,
  holeLifetimeMs: 2500,
  spawnMargin: 90,
}

export type TargetType = 'duck' | 'mallard' | 'bullseye' | 'golden' | 'decoy'

export interface TargetSpec {
  texture: string
  points: number
  speed: number
  scale: number
  timeBonusMs: number
}

export const TARGET_TYPES: Record<TargetType, TargetSpec> = {
  duck: { texture: 'duckYellow', points: 100, speed: 1, scale: 1, timeBonusMs: 0 },
  mallard: { texture: 'duckBrown', points: 150, speed: 1.4, scale: 0.9, timeBonusMs: 0 },
  bullseye: { texture: 'targetBull', points: 100, speed: 0.7, scale: 0.9, timeBonusMs: 0 },
  golden: { texture: 'duckGolden', points: 300, speed: 1.9, scale: 0.8, timeBonusMs: 3000 },
  decoy: { texture: 'duckDecoy', points: -150, speed: 1, scale: 1, timeBonusMs: 0 },
}

export const BULLSEYE_RINGS = [
  { maxRatio: 0.3, points: 200 },
  { maxRatio: 0.65, points: 100 },
  { maxRatio: 1, points: 50 },
]

export const LANES = [
  { waterY: 250, direction: 1, speed: 90, scale: 0.8 },
  { waterY: 335, direction: -1, speed: 125, scale: 0.95 },
  { waterY: 420, direction: 1, speed: 165, scale: 1.1 },
] as const

export const TARGET_LAYOUT = {
  stickHeight: 56,
  stickSink: 22,
  stickWidth: 30,
  targetOverlap: 6,
  popupHideDepth: 130,
  popupRiseMs: 260,
  popupStayMs: 1300,
  popupFallMs: 200,
  spacingMin: 260,
  spacingMax: 460,
  popupMarginX: 160,
  knockAngleDeg: 75,
  knockDropPx: 30,
  knockMs: 420,
}

export const DIFFICULTY_CONFIG = {
  speedGain: 0.6,
  decoyBase: 0.12,
  decoyMax: 0.22,
  goldenChance: 0.03,
  bullseyeChance: 0.15,
  mallardChance: 0.2,
  popupStartMs: 2400,
  popupEndMs: 1200,
}

export const POPUP_WEIGHTS = { golden: 0.08, decoy: 0.2, bullseye: 0.45 }

export const RIFLE_CONFIG = {
  x: 560,
  baseY: 620,
  scale: 0.9,
  barrelLeanRad: 0.253,
  kickPx: 14,
  kickMs: 90,
}

export const FX_CONFIG = {
  feathersPerHit: 14,
  goldenExtraSparks: 10,
  dustPerMiss: 6,
  particleLifespanMs: 700,
  lightHintDelayMs: 3000,
  tints: {
    duck: 0xffd23f,
    mallard: 0x8b5a2b,
    bullseye: 0xff7a2f,
    golden: 0xffd23f,
    decoy: 0x9fb8bd,
  },
}

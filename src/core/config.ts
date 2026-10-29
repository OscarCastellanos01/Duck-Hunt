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
  ammoPerWave: 3,
  wavesPerRound: 5,
  roundQuota: 0.6,
  introMs: 1500,
  waveEndMs: 1200,
  spawnStaggerMs: 500,
  escapeDelayMs: 700,
  hitboxScale: 1.3,
  aimAssistPx: 18,
  streakStep: 0.25,
  maxMultiplier: 3,
  roundClearBonus: 500,
  shakeDurationMs: 80,
  shakeIntensity: 0.004,
  flashAlpha: 0.25,
  flashMs: 90,
  floatingTextMs: 800,
  playBounds: { left: 0, right: 960, top: 60, bottom: 400 },
  spawnMargin: 80,
  fallSpeed: 520,
  groundY: 470,
  duckSpriteFacesLeft: true,
}

export type DuckType = 'common' | 'fast' | 'golden'

export const DUCK_TYPES: Record<DuckType, { points: number; speed: number; scale: number }> = {
  common: { points: 100, speed: 1, scale: 1 },
  fast: { points: 200, speed: 1.5, scale: 0.85 },
  golden: { points: 500, speed: 2, scale: 0.7 },
}

export const DIFFICULTY_CONFIG = {
  baseSpeed: 180,
  speedPerRound: 0.12,
  maxSpeedMultiplier: 2.5,
  fastChanceBase: 0.1,
  fastChancePerRound: 0.05,
  fastChanceMax: 0.5,
  goldenChanceBase: 0.03,
  goldenChancePerRound: 0.01,
  goldenChanceMax: 0.15,
  secondDuckRound: 3,
  thirdDuckRound: 6,
  waveDurationBaseMs: 7000,
  waveDurationPerRoundMs: 300,
  waveDurationMinMs: 4000,
  unpredictabilityPerRound: 0.15,
  unpredictabilityMax: 0.9,
  turnIntervalSlowMs: 2500,
  turnIntervalFastMs: 900,
  wobbleAmplitudeMin: 8,
  wobbleAmplitudeMax: 30,
  wobbleFrequencyMin: 1.5,
  wobbleFrequencyMax: 4,
  launchAngleMaxRad: 0.6,
  escapeSpeed: 420,
}

export const DUCK_ANIMATION = {
  flapRate: 16,
  flapSquash: 0.08,
  flapStretch: 0.04,
  escapeFlapMultiplier: 1.6,
  tiltMaxDeg: 22,
  tiltFactor: 0.4,
  tiltSmoothing: 0.15,
  escapeTiltDeg: -25,
  stunMs: 180,
  stunScale: 1.2,
  stunTint: 0xff7070,
}

export const FX_CONFIG = {
  feathersPerHit: 14,
  goldenExtraSparks: 10,
  dustPerMiss: 6,
  confettiCount: 24,
  particleLifespanMs: 700,
  perfectBannerMs: 900,
  lightHintDelayMs: 3000,
  featherTints: { common: 0x8b5a2b, fast: 0xffffff, golden: 0xffd23f },
  confettiTints: [0xff5252, 0xffd23f, 0x6fe37a, 0x4aa3ff, 0xffffff],
}

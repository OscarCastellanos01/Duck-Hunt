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
  thumbSensitivity: 0.5,
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
  indexExtendEnter: 0.35,
  indexExtendHold: 0.2,
  curlEnter: -0.05,
  curlHold: 0.1,
  thumbExtendEnter: 0.75,
  enterFrames: 3,
  exitFrames: 3,
}

export const THUMB_THRESHOLDS = {
  fireMin: 0.45,
  fireMax: 0.65,
  rearmGap: 0.1,
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

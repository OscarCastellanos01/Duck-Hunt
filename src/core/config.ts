import type { OneEuroParams, Settings, SmoothingPreset } from '@/core/types'

export const APP_NAME = 'duck-gesture'

export const SETTINGS_STORAGE_KEY = 'duck-gesture:settings'
export const HIGH_SCORE_STORAGE_KEY = 'duck-gesture:high-score'

export const SMOOTHING_PRESETS: Record<SmoothingPreset, OneEuroParams> = {
  precise: { minCutoff: 2.5, beta: 0.05, dCutoff: 1 },
  balanced: { minCutoff: 1.2, beta: 0.02, dCutoff: 1 },
  smooth: { minCutoff: 0.6, beta: 0.008, dCutoff: 1 },
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
  beta: { min: 0, max: 1 },
  dCutoff: { min: 0.01, max: 10 },
}

import {
  COOLDOWN_RANGE_MS,
  DEFAULT_SETTINGS,
  ONE_EURO_RANGE,
  SENSITIVITY_RANGE,
  SETTINGS_STORAGE_KEY,
  SMOOTHING_PRESETS,
  VOLUME_RANGE,
} from '@/core/config'
import type { GestureMode, InputMode, OneEuroParams, Settings, SmoothingPreset } from '@/core/types'

type Range = { min: number; max: number }
type Listener = (settings: Settings) => void

const GESTURE_MODES: readonly GestureMode[] = ['thumb', 'recoil', 'both']
const INPUT_MODES: readonly InputMode[] = ['camera', 'mouse']
const SMOOTHING_PRESET_NAMES = Object.keys(SMOOTHING_PRESETS) as SmoothingPreset[]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const pickNumber = (value: unknown, range: Range, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= range.min && value <= range.max
    ? value
    : fallback

const pickBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const pickOption = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback

const pickOneEuro = (value: unknown, fallback: OneEuroParams): OneEuroParams => {
  if (!isRecord(value)) return { ...fallback }
  return {
    minCutoff: pickNumber(value.minCutoff, ONE_EURO_RANGE.minCutoff, fallback.minCutoff),
    beta: pickNumber(value.beta, ONE_EURO_RANGE.beta, fallback.beta),
    dCutoff: pickNumber(value.dCutoff, ONE_EURO_RANGE.dCutoff, fallback.dCutoff),
  }
}

export const sanitizeSettings = (raw: unknown): Settings => {
  const defaults = DEFAULT_SETTINGS
  if (!isRecord(raw)) return { ...defaults, oneEuro: { ...defaults.oneEuro } }
  return {
    gestureMode: pickOption(raw.gestureMode, GESTURE_MODES, defaults.gestureMode),
    thumbSensitivity: pickNumber(
      raw.thumbSensitivity,
      SENSITIVITY_RANGE,
      defaults.thumbSensitivity,
    ),
    recoilSensitivity: pickNumber(
      raw.recoilSensitivity,
      SENSITIVITY_RANGE,
      defaults.recoilSensitivity,
    ),
    cooldownMs: pickNumber(raw.cooldownMs, COOLDOWN_RANGE_MS, defaults.cooldownMs),
    smoothingPreset: pickOption(
      raw.smoothingPreset,
      SMOOTHING_PRESET_NAMES,
      defaults.smoothingPreset,
    ),
    oneEuro: pickOneEuro(raw.oneEuro, defaults.oneEuro),
    mirror: pickBoolean(raw.mirror, defaults.mirror),
    cameraId: typeof raw.cameraId === 'string' ? raw.cameraId : defaults.cameraId,
    showPreview: pickBoolean(raw.showPreview, defaults.showPreview),
    showDebug: pickBoolean(raw.showDebug, defaults.showDebug),
    inputMode: pickOption(raw.inputMode, INPUT_MODES, defaults.inputMode),
    musicVolume: pickNumber(raw.musicVolume, VOLUME_RANGE, defaults.musicVolume),
    sfxVolume: pickNumber(raw.sfxVolume, VOLUME_RANGE, defaults.sfxVolume),
  }
}

export class SettingsStore {
  private current: Settings
  private listeners = new Set<Listener>()

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
    this.current = this.load()
  }

  get(): Settings {
    return this.current
  }

  update(patch: Partial<Settings>): void {
    this.current = sanitizeSettings({ ...this.current, ...patch })
    this.persist()
    for (const listener of this.listeners) listener(this.current)
  }

  applyPreset(preset: SmoothingPreset): void {
    this.update({ smoothingPreset: preset, oneEuro: { ...SMOOTHING_PRESETS[preset] } })
  }

  reset(): void {
    this.update(sanitizeSettings(null))
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private load(): Settings {
    try {
      const raw = this.storage?.getItem(SETTINGS_STORAGE_KEY)
      return sanitizeSettings(raw ? JSON.parse(raw) : null)
    } catch {
      return sanitizeSettings(null)
    }
  }

  private persist(): void {
    try {
      this.storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.current))
    } catch {
      return
    }
  }
}

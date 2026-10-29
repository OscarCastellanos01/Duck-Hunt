import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/core/config'
import { SettingsStore, sanitizeSettings } from '@/core/settings'

const memoryStorage = (initial?: string) => {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(SETTINGS_STORAGE_KEY, initial)
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe('settings', () => {
  it('uses defaults when nothing is stored', () => {
    expect(new SettingsStore(memoryStorage()).get()).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to defaults when the stored JSON is corrupt', () => {
    expect(new SettingsStore(memoryStorage('{no es json')).get()).toEqual(DEFAULT_SETTINGS)
  })

  it('replaces only the invalid fields', () => {
    const result = sanitizeSettings({ gestureMode: 'laser', cooldownMs: 400, mirror: 'si' })
    expect(result.gestureMode).toBe(DEFAULT_SETTINGS.gestureMode)
    expect(result.cooldownMs).toBe(400)
    expect(result.mirror).toBe(DEFAULT_SETTINGS.mirror)
  })

  it('rejects out-of-range numbers', () => {
    expect(sanitizeSettings({ sfxVolume: 5 }).sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume)
    expect(sanitizeSettings({ cooldownMs: Number.NaN }).cooldownMs).toBe(
      DEFAULT_SETTINGS.cooldownMs,
    )
  })

  it('persists and notifies changes live', () => {
    const storage = memoryStorage()
    const store = new SettingsStore(storage)
    const listener = vi.fn()
    store.subscribe(listener)
    store.update({ gestureMode: 'both' })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(new SettingsStore(storage).get().gestureMode).toBe('both')
  })

  it('applies a smoothing preset', () => {
    const store = new SettingsStore(memoryStorage())
    store.applyPreset('smooth')
    expect(store.get().smoothingPreset).toBe('smooth')
    expect(store.get().oneEuro.minCutoff).toBeLessThan(DEFAULT_SETTINGS.oneEuro.minCutoff)
  })
})

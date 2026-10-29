import { describe, expect, it } from 'vitest'
import { HIGH_SCORE_STORAGE_KEY } from '@/core/config'
import { HighScoreStore } from '@/core/highScore'

const memoryStorage = (initial?: string) => {
  const data = new Map<string, string>()
  if (initial !== undefined) data.set(HIGH_SCORE_STORAGE_KEY, initial)
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  }
}

describe('HighScoreStore', () => {
  it('starts at zero without stored data', () => {
    expect(new HighScoreStore(memoryStorage()).get()).toBe(0)
  })

  it('ignores corrupt stored values', () => {
    expect(new HighScoreStore(memoryStorage('abc')).get()).toBe(0)
    expect(new HighScoreStore(memoryStorage('-5')).get()).toBe(0)
    expect(new HighScoreStore(memoryStorage('12.5')).get()).toBe(0)
  })

  it('only records higher scores and persists them', () => {
    const storage = memoryStorage()
    const store = new HighScoreStore(storage)
    expect(store.submit(300)).toBe(true)
    expect(store.submit(200)).toBe(false)
    expect(store.submit(300)).toBe(false)
    expect(new HighScoreStore(storage).get()).toBe(300)
  })

  it('works without storage', () => {
    const store = new HighScoreStore(null)
    expect(store.submit(50)).toBe(true)
    expect(store.get()).toBe(50)
  })
})

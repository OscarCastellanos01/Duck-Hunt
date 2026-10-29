import { describe, expect, it } from 'vitest'
import { SMOOTHING_PRESETS } from '@/core/config'
import { OneEuroFilter } from '@/gestures/oneEuroFilter'

const jitterSequence = (filter: OneEuroFilter, steps: number): number[] =>
  Array.from({ length: steps }, (_, i) => filter.filter(0.5 + (i % 2 === 0 ? 0.01 : -0.01), i * 16))

const spread = (values: number[]): number => Math.max(...values) - Math.min(...values)

describe('OneEuroFilter', () => {
  it('returns the first value unchanged', () => {
    expect(new OneEuroFilter(SMOOTHING_PRESETS.balanced).filter(0.3, 0)).toBe(0.3)
  })

  it('attenuates jitter around a stationary point', () => {
    const output = jitterSequence(new OneEuroFilter(SMOOTHING_PRESETS.balanced), 60).slice(20)
    expect(spread(output)).toBeLessThan(0.02)
  })

  it('smoother presets attenuate jitter more', () => {
    const smooth = jitterSequence(new OneEuroFilter(SMOOTHING_PRESETS.smooth), 60).slice(20)
    const precise = jitterSequence(new OneEuroFilter(SMOOTHING_PRESETS.precise), 60).slice(20)
    expect(spread(smooth)).toBeLessThan(spread(precise))
  })

  it('follows fast movement closely', () => {
    const filter = new OneEuroFilter(SMOOTHING_PRESETS.balanced)
    let last = 0
    for (let i = 0; i < 30; i++) last = filter.filter(i * 0.03, i * 16)
    expect(Math.abs(last - 29 * 0.03)).toBeLessThan(0.1)
  })

  it('starts over after a reset', () => {
    const filter = new OneEuroFilter(SMOOTHING_PRESETS.balanced)
    filter.filter(0, 0)
    filter.filter(0, 16)
    filter.reset()
    expect(filter.filter(0.9, 32)).toBe(0.9)
  })
})

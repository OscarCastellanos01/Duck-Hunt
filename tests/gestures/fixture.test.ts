import { describe, expect, it } from 'vitest'
import { fixtureToSteps, parseFixture, serializeFrame } from '@/gestures/fixture'
import { makeHand } from '../helpers/handFactory'

describe('fixture', () => {
  it('round-trips recorded frames', () => {
    const hand = makeHand({ aspect: 4 / 3 })
    const file = {
      version: 1,
      aspect: hand.aspect,
      frames: [serializeFrame(hand, 0), serializeFrame(null, 16)],
    }
    const steps = fixtureToSteps(parseFixture(JSON.parse(JSON.stringify(file))))
    expect(steps).toHaveLength(2)
    expect(steps[0]?.frame?.landmarks).toHaveLength(21)
    expect(steps[0]?.frame?.landmarks[8]?.x).toBeCloseTo(hand.landmarks[8]?.x ?? 0, 10)
    expect(steps[1]?.frame).toBeNull()
  })

  it('rejects malformed fixtures', () => {
    expect(() => parseFixture(null)).toThrow()
    expect(() => parseFixture({ version: 2, aspect: 1, frames: [] })).toThrow()
    expect(() =>
      parseFixture({ version: 1, aspect: 1, frames: [{ t: 0, landmarks: [[0, 0, 0]] }] }),
    ).toThrow()
  })
})

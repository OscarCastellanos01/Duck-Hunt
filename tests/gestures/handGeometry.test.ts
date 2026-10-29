import { describe, expect, it } from 'vitest'
import {
  FINGERS,
  fingerExtension,
  handSize,
  mapAimPoint,
  normalizedDistance,
  thumbSpread,
} from '@/gestures/handGeometry'
import { makeHand, openHand } from '@/debug/syntheticHand'

describe('handGeometry', () => {
  it('measures hand size as wrist to middle base distance', () => {
    expect(handSize(makeHand({ size: 0.2 }))).toBeCloseTo(0.2, 5)
    expect(handSize(makeHand({ size: 0.1 }))).toBeCloseTo(0.1, 5)
  })

  it('normalized distances do not depend on hand size or aspect ratio', () => {
    const near = makeHand({ size: 0.3, aspect: 1 })
    const far = makeHand({ size: 0.1, aspect: 16 / 9 })
    expect(thumbSpread(near)).toBeCloseTo(thumbSpread(far), 5)
    expect(normalizedDistance(near, 0, 8)).toBeCloseTo(normalizedDistance(far, 0, 8), 5)
  })

  it('reports positive extension for extended fingers and negative for curled ones', () => {
    const hand = makeHand()
    expect(fingerExtension(hand, FINGERS.index)).toBeGreaterThan(0.35)
    expect(fingerExtension(hand, FINGERS.middle)).toBeLessThan(-0.05)
    expect(fingerExtension(openHand(), FINGERS.pinky)).toBeGreaterThan(0.35)
  })

  it('reduces the thumb spread when the thumb drops', () => {
    expect(thumbSpread(makeHand({ thumbDrop: 1 }))).toBeLessThan(thumbSpread(makeHand()))
  })

  it('mirrors and clamps the aim point', () => {
    const out = { x: 0, y: 0 }
    mapAimPoint(0.1, 0.5, true, out)
    expect(out.x).toBe(1)
    mapAimPoint(0.1, 0.5, false, out)
    expect(out.x).toBe(0)
    mapAimPoint(0.5, 0.5, true, out)
    expect(out.x).toBeCloseTo(0.5, 5)
    expect(out.y).toBeCloseTo(0.5, 5)
  })
})

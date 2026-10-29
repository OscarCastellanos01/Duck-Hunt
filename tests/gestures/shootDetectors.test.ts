import { describe, expect, it } from 'vitest'
import type { AimPoint, HandFrame, ShootEvent } from '@/core/types'
import {
  CombinedDetector,
  RecoilDetector,
  type GestureSample,
  type ShootDetector,
  ThumbDropDetector,
} from '@/gestures/shootDetectors'
import { FRAME_INTERVAL_MS, makeHand } from '../helpers/handFactory'

const run = (
  detector: ShootDetector,
  frames: HandFrame[],
  aimOf: (index: number) => AimPoint = () => ({ x: 0.5, y: 0.5 }),
): ShootEvent[] => {
  const shots: ShootEvent[] = []
  frames.forEach((frame, index) => {
    const out: ShootEvent = { x: 0, y: 0, t: 0 }
    const sample: GestureSample = { frame, aim: aimOf(index) }
    if (detector.update(sample, out)) shots.push(out)
  })
  return shots
}

const thumbSequence = (drops: number[]): HandFrame[] =>
  drops.map((thumbDrop, i) => makeHand({ thumbDrop, t: i * FRAME_INTERVAL_MS }))

describe('ThumbDropDetector', () => {
  it('fires once when the thumb drops', () => {
    const frames = thumbSequence([0, 0, 0, 0.4, 0.8, 1, 1, 1])
    expect(run(new ThumbDropDetector(0.5), frames)).toHaveLength(1)
  })

  it('reports the aim position at the moment of the shot', () => {
    const frames = thumbSequence([0, 0, 1, 1])
    const shots = run(new ThumbDropDetector(0.5), frames, (i) => ({ x: i / 10, y: 0.2 }))
    expect(shots).toHaveLength(1)
    expect(shots[0]?.x).toBeCloseTo(0.2, 5)
    expect(shots[0]?.t).toBe(2 * FRAME_INTERVAL_MS)
  })

  it('ignores a slow thumb movement', () => {
    const slow = thumbSequence(Array.from({ length: 120 }, (_, i) => i / 119))
    expect(run(new ThumbDropDetector(0.5), slow)).toHaveLength(0)
  })

  it('does not fire if the thumb starts down', () => {
    expect(run(new ThumbDropDetector(0.5), thumbSequence([1, 1, 1, 1]))).toHaveLength(0)
  })

  it('needs the thumb to rise again to rearm', () => {
    const detector = new ThumbDropDetector(0.5)
    const frames = thumbSequence([0, 1, 1, 0.9, 1, 0, 0, 1])
    expect(run(detector, frames)).toHaveLength(2)
  })

  it('lower sensitivity requires a deeper drop', () => {
    const shallow = thumbSequence([0, 0, 0.5, 0.5, 0.5])
    expect(run(new ThumbDropDetector(1), shallow)).toHaveLength(1)
    expect(run(new ThumbDropDetector(0), shallow)).toHaveLength(0)
  })
})

const risingHand = (totalRise: number, steps: number): HandFrame[] =>
  Array.from({ length: 10 + steps + 4 }, (_, i) => {
    const progress = Math.min(1, Math.max(0, (i - 10) / steps))
    return makeHand({ y: 0.8 - totalRise * progress, t: i * FRAME_INTERVAL_MS })
  })

describe('RecoilDetector', () => {
  it('fires on a fast upward impulse', () => {
    expect(run(new RecoilDetector(0.5), risingHand(0.1, 6))).toHaveLength(1)
  })

  it('ignores slow upward movement', () => {
    expect(run(new RecoilDetector(0.5), risingHand(0.1, 60))).toHaveLength(0)
  })

  it('ignores a downward impulse', () => {
    expect(run(new RecoilDetector(0.5), risingHand(-0.1, 6))).toHaveLength(0)
  })

  it('takes the shot position from before the impulse', () => {
    const frames = risingHand(0.1, 6)
    const aimOf = (index: number): AimPoint => ({ x: 0.5, y: 1 - index / 100 })
    const shots = run(new RecoilDetector(0.5), frames, aimOf)
    expect(shots).toHaveLength(1)
    const shot = shots[0]
    const firedAtIndex = Math.round((shot?.t ?? 0) / FRAME_INTERVAL_MS)
    expect(shot?.y).toBeGreaterThan(aimOf(firedAtIndex).y)
    expect(shot?.y).toBeCloseTo(aimOf(firedAtIndex - 8).y, 1)
  })

  it('higher sensitivity detects gentler impulses', () => {
    const gentle = risingHand(0.06, 8)
    expect(run(new RecoilDetector(1), gentle)).toHaveLength(1)
    expect(run(new RecoilDetector(0), gentle)).toHaveLength(0)
  })
})

describe('CombinedDetector', () => {
  it('fires from either detector', () => {
    const detector = () =>
      new CombinedDetector([new ThumbDropDetector(0.5), new RecoilDetector(0.5)])
    expect(run(detector(), thumbSequence([0, 0, 1, 1]))).toHaveLength(1)
    expect(run(detector(), risingHand(0.1, 6))).toHaveLength(1)
  })
})

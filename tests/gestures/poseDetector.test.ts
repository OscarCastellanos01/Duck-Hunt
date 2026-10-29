import { describe, expect, it } from 'vitest'
import { POSE_THRESHOLDS } from '@/core/config'
import type { HandFrame } from '@/core/types'
import { PoseDetector } from '@/gestures/poseDetector'
import { makeHand, openHand } from '@/debug/syntheticHand'

const feed = (detector: PoseDetector, frame: HandFrame | null, count: number) => {
  for (let i = 0; i < count; i++) detector.update(frame)
}

describe('PoseDetector', () => {
  it('requires consecutive frames before entering the gun pose', () => {
    const detector = new PoseDetector()
    feed(detector, makeHand(), POSE_THRESHOLDS.enterFrames - 1)
    expect(detector.pose).toBe('none')
    detector.update(makeHand())
    expect(detector.pose).toBe('gun')
  })

  it('does not enter the pose with an open hand or a fist', () => {
    const detector = new PoseDetector()
    feed(detector, openHand(), 10)
    expect(detector.pose).toBe('none')
    feed(detector, makeHand({ index: 'curled' }), 10)
    expect(detector.pose).toBe('none')
  })

  it('ignores single-frame glitches while in the pose', () => {
    const detector = new PoseDetector()
    feed(detector, makeHand(), 5)
    detector.update(openHand())
    feed(detector, makeHand(), 3)
    expect(detector.pose).toBe('gun')
  })

  it('leaves the pose after consecutive non-matching frames', () => {
    const detector = new PoseDetector()
    feed(detector, makeHand(), 5)
    feed(detector, openHand(), POSE_THRESHOLDS.exitFrames)
    expect(detector.pose).toBe('none')
  })

  it('keeps the pose when the thumb drops', () => {
    const detector = new PoseDetector()
    feed(detector, makeHand(), 5)
    feed(detector, makeHand({ thumbDrop: 1 }), 10)
    expect(detector.pose).toBe('gun')
  })

  it('requires the thumb to be extended to enter the pose', () => {
    const detector = new PoseDetector()
    feed(detector, makeHand({ thumbDrop: 1 }), 10)
    expect(detector.pose).toBe('none')
  })

  it('resets to none when tracking is lost', () => {
    const detector = new PoseDetector()
    feed(detector, makeHand(), 5)
    detector.reset()
    expect(detector.pose).toBe('none')
  })

  it('tolerates landmark noise', () => {
    const detector = new PoseDetector()
    for (let i = 0; i < 30; i++) detector.update(makeHand({ noise: 0.04 }))
    expect(detector.pose).toBe('gun')
  })
})

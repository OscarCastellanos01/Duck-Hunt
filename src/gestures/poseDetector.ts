import { POSE_THRESHOLDS } from '@/core/config'
import type { HandFrame, Pose } from '@/core/types'
import { FINGERS, fingerExtension, thumbSpread } from '@/gestures/handGeometry'

export interface PoseMetrics {
  index: number
  middle: number
  ring: number
  pinky: number
  thumb: number
}

export const createPoseMetrics = (): PoseMetrics => ({
  index: 0,
  middle: 0,
  ring: 0,
  pinky: 0,
  thumb: 0,
})

export const computePoseMetrics = (frame: HandFrame, out: PoseMetrics): PoseMetrics => {
  out.index = fingerExtension(frame, FINGERS.index)
  out.middle = fingerExtension(frame, FINGERS.middle)
  out.ring = fingerExtension(frame, FINGERS.ring)
  out.pinky = fingerExtension(frame, FINGERS.pinky)
  out.thumb = thumbSpread(frame)
  return out
}

export const meetsEnterCriteria = (m: PoseMetrics): boolean =>
  m.index >= POSE_THRESHOLDS.indexExtendEnter &&
  m.middle <= POSE_THRESHOLDS.curlEnter &&
  m.ring <= POSE_THRESHOLDS.curlEnter &&
  m.pinky <= POSE_THRESHOLDS.curlEnter &&
  m.thumb >= POSE_THRESHOLDS.thumbExtendEnter

export const meetsHoldCriteria = (m: PoseMetrics): boolean =>
  m.index >= POSE_THRESHOLDS.indexExtendHold &&
  m.middle <= POSE_THRESHOLDS.curlHold &&
  m.ring <= POSE_THRESHOLDS.curlHold &&
  m.pinky <= POSE_THRESHOLDS.curlHold

export class PoseDetector {
  private current: Pose = 'none'
  private streak = 0
  private readonly metrics = createPoseMetrics()

  get pose(): Pose {
    return this.current
  }

  reset(): void {
    this.current = 'none'
    this.streak = 0
  }

  update(frame: HandFrame | null): Pose {
    const entering = this.current === 'none'
    let matches = false
    if (frame) {
      computePoseMetrics(frame, this.metrics)
      matches = entering ? meetsEnterCriteria(this.metrics) : meetsHoldCriteria(this.metrics)
    }
    const shouldSwitch = entering ? matches : !matches
    if (!shouldSwitch) {
      this.streak = 0
      return this.current
    }
    this.streak += 1
    const required = entering ? POSE_THRESHOLDS.enterFrames : POSE_THRESHOLDS.exitFrames
    if (this.streak >= required) {
      this.current = entering ? 'gun' : 'none'
      this.streak = 0
    }
    return this.current
  }
}

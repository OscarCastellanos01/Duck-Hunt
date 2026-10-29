import { HISTORY_CAPACITY, RECOIL_THRESHOLDS, THUMB_THRESHOLDS } from '@/core/config'
import type { AimPoint, GestureMode, HandFrame, ShootEvent } from '@/core/types'
import { LM, handSize, lerp, thumbSpread } from '@/gestures/handGeometry'

export interface GestureSample {
  frame: HandFrame
  aim: AimPoint
  poseActive: boolean
}

export interface ShootDetector {
  update(sample: GestureSample, out: ShootEvent): boolean
  reset(): void
}

export class ThumbDropDetector implements ShootDetector {
  private armed = false
  private readonly fireThreshold: number
  private readonly rearmThreshold: number

  constructor(sensitivity: number) {
    this.fireThreshold = lerp(THUMB_THRESHOLDS.fireMin, THUMB_THRESHOLDS.fireMax, sensitivity)
    this.rearmThreshold = this.fireThreshold + THUMB_THRESHOLDS.rearmGap
  }

  reset(): void {
    this.armed = false
  }

  update(sample: GestureSample, out: ShootEvent): boolean {
    const spread = thumbSpread(sample.frame)
    if (!this.armed) {
      if (spread >= this.rearmThreshold) this.armed = true
      return false
    }
    if (spread > this.fireThreshold || !sample.poseActive) return false
    this.armed = false
    out.x = sample.aim.x
    out.y = sample.aim.y
    out.t = sample.frame.t
    return true
  }
}

interface HistoryEntry {
  t: number
  handY: number
  aimX: number
  aimY: number
}

export class RecoilDetector implements ShootDetector {
  private readonly history: HistoryEntry[] = Array.from({ length: HISTORY_CAPACITY }, () => ({
    t: 0,
    handY: 0,
    aimX: 0,
    aimY: 0,
  }))
  private head = 0
  private count = 0
  private readonly speedThreshold: number

  constructor(sensitivity: number) {
    this.speedThreshold = lerp(
      RECOIL_THRESHOLDS.speedSlow,
      RECOIL_THRESHOLDS.speedFast,
      sensitivity,
    )
  }

  reset(): void {
    this.head = 0
    this.count = 0
  }

  update(sample: GestureSample, out: ShootEvent): boolean {
    const { frame, aim } = sample
    const base = frame.landmarks[LM.indexMcp]
    const size = handSize(frame)
    if (!base || size <= 0) return false
    this.push(frame.t, base.y / size, aim)
    if (!sample.poseActive) return false

    const windowStart = this.findAtOrBefore(frame.t - RECOIL_THRESHOLDS.windowMs)
    if (!windowStart) return false
    const elapsedSeconds = (frame.t - windowStart.t) / 1000
    if (elapsedSeconds <= 0) return false
    const upwardSpeed = (windowStart.handY - base.y / size) / elapsedSeconds
    if (upwardSpeed < this.speedThreshold) return false

    const past = this.findAtOrBefore(frame.t - RECOIL_THRESHOLDS.aimLookbackMs) ?? windowStart
    out.x = past.aimX
    out.y = past.aimY
    out.t = frame.t
    this.reset()
    return true
  }

  private push(t: number, handY: number, aim: AimPoint): void {
    const entry = this.history[this.head]
    if (!entry) return
    entry.t = t
    entry.handY = handY
    entry.aimX = aim.x
    entry.aimY = aim.y
    this.head = (this.head + 1) % HISTORY_CAPACITY
    this.count = Math.min(this.count + 1, HISTORY_CAPACITY)
  }

  private findAtOrBefore(t: number): HistoryEntry | null {
    for (let i = 2; i <= this.count; i++) {
      const entry = this.history[(this.head - i + HISTORY_CAPACITY * 2) % HISTORY_CAPACITY]
      if (entry && entry.t <= t) return entry
    }
    return null
  }
}

export class CombinedDetector implements ShootDetector {
  private readonly scratch: ShootEvent = { x: 0, y: 0, t: 0 }

  constructor(private readonly detectors: ShootDetector[]) {}

  reset(): void {
    for (const detector of this.detectors) detector.reset()
  }

  update(sample: GestureSample, out: ShootEvent): boolean {
    let fired = false
    for (const detector of this.detectors) {
      if (!detector.update(sample, this.scratch) || fired) continue
      fired = true
      out.x = this.scratch.x
      out.y = this.scratch.y
      out.t = this.scratch.t
    }
    return fired
  }
}

export const createDetector = (
  mode: GestureMode,
  thumbSensitivity: number,
  recoilSensitivity: number,
): ShootDetector => {
  const thumb = new ThumbDropDetector(thumbSensitivity)
  const recoil = new RecoilDetector(recoilSensitivity)
  if (mode === 'thumb') return thumb
  if (mode === 'recoil') return recoil
  return new CombinedDetector([thumb, recoil])
}

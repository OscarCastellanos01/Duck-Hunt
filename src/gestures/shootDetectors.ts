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

interface SpreadEntry {
  t: number
  spread: number
}

export class ThumbDropDetector implements ShootDetector {
  private readonly history: SpreadEntry[] = Array.from({ length: HISTORY_CAPACITY }, () => ({
    t: 0,
    spread: 0,
  }))
  private head = 0
  private count = 0
  private armed = true
  private trough = 0
  private readonly requiredDrop: number

  constructor(sensitivity: number) {
    this.requiredDrop = lerp(THUMB_THRESHOLDS.dropMax, THUMB_THRESHOLDS.dropMin, sensitivity)
  }

  reset(): void {
    this.head = 0
    this.count = 0
    this.armed = true
  }

  update(sample: GestureSample, out: ShootEvent): boolean {
    const spread = thumbSpread(sample.frame)
    const now = sample.frame.t
    this.push(now, spread)
    if (!this.armed) {
      this.trough = Math.min(this.trough, spread)
      const rearmAt = this.trough + this.requiredDrop * THUMB_THRESHOLDS.rearmFraction
      if (spread >= rearmAt) this.armed = true
      return false
    }
    if (this.recentPeak(now) - spread < this.requiredDrop) return false
    this.armed = false
    this.trough = spread
    out.x = sample.aim.x
    out.y = sample.aim.y
    out.t = now
    return true
  }

  private push(t: number, spread: number): void {
    const entry = this.history[this.head]
    if (!entry) return
    entry.t = t
    entry.spread = spread
    this.head = (this.head + 1) % HISTORY_CAPACITY
    this.count = Math.min(this.count + 1, HISTORY_CAPACITY)
  }

  private recentPeak(now: number): number {
    const cutoff = now - THUMB_THRESHOLDS.windowMs
    let peak = 0
    for (let i = 1; i <= this.count; i++) {
      const entry = this.history[(this.head - i + HISTORY_CAPACITY * 2) % HISTORY_CAPACITY]
      if (!entry || entry.t < cutoff) break
      if (entry.spread > peak) peak = entry.spread
    }
    return peak
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

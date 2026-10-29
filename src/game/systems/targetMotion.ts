import { GAME_CONFIG, TARGET_LAYOUT } from '@/core/config'
import type { SpawnRequest } from '@/game/systems/spawner'

export type MotionPhase = 'moving' | 'rising' | 'up' | 'falling' | 'done'

const HITTABLE_RISE_PROGRESS = 0.5

export class TargetMotion {
  x: number
  offsetY: number
  phase: MotionPhase
  private readonly vx: number
  private phaseElapsedMs = 0

  constructor(request: SpawnRequest) {
    this.x = request.x
    this.vx = request.vx
    if (request.kind === 'popup') {
      this.phase = 'rising'
      this.offsetY = TARGET_LAYOUT.popupHideDepth
    } else {
      this.phase = 'moving'
      this.offsetY = 0
    }
  }

  get hittable(): boolean {
    const hide = TARGET_LAYOUT.popupHideDepth
    if (this.phase === 'moving' || this.phase === 'up') return true
    if (this.phase === 'rising' || this.phase === 'falling') {
      return this.offsetY <= hide * (1 - HITTABLE_RISE_PROGRESS)
    }
    return false
  }

  step(dtMs: number): void {
    if (this.phase === 'done') return
    if (this.phase === 'moving') {
      this.stepLane(dtMs)
      return
    }
    this.stepPopup(dtMs)
  }

  private stepLane(dtMs: number): void {
    this.x += this.vx * (dtMs / 1000)
    const limit = GAME_CONFIG.spawnMargin * 2
    const outRight = this.vx > 0 && this.x > GAME_CONFIG.width + limit
    const outLeft = this.vx < 0 && this.x < -limit
    if (outRight || outLeft) this.phase = 'done'
  }

  private stepPopup(dtMs: number): void {
    const { popupRiseMs, popupStayMs, popupFallMs, popupHideDepth } = TARGET_LAYOUT
    this.phaseElapsedMs += dtMs
    if (this.phase === 'rising') {
      const progress = Math.min(1, this.phaseElapsedMs / popupRiseMs)
      this.offsetY = popupHideDepth * (1 - progress)
      if (progress >= 1) this.enter('up')
    } else if (this.phase === 'up') {
      if (this.phaseElapsedMs >= popupStayMs) this.enter('falling')
    } else if (this.phase === 'falling') {
      const progress = Math.min(1, this.phaseElapsedMs / popupFallMs)
      this.offsetY = popupHideDepth * progress
      if (progress >= 1) this.enter('done')
    }
  }

  private enter(phase: MotionPhase): void {
    this.phase = phase
    this.phaseElapsedMs = 0
  }
}

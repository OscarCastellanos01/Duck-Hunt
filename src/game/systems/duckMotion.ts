import { DIFFICULTY_CONFIG, GAME_CONFIG } from '@/core/config'
import type { DuckSpec, Rng } from '@/game/systems/spawner'

export type MotionState = 'flying' | 'escaping'

const MAX_TURN_RAD = 1.4
const MIN_TURN_RAD = 0.5

export class DuckMotion {
  x: number
  y: number
  vx: number
  vy: number
  state: MotionState = 'flying'
  private baseY: number
  private elapsedMs = 0
  private entered = false
  private nextTurnMs: number | null

  constructor(
    private readonly spec: DuckSpec,
    private readonly rng: Rng,
  ) {
    this.x = spec.x
    this.y = spec.y
    this.baseY = spec.y
    this.vx = spec.vx
    this.vy = spec.vy
    this.nextTurnMs = spec.turnIntervalMs
  }

  get facingRight(): boolean {
    return this.vx >= 0
  }

  get offscreen(): boolean {
    const { left, right } = GAME_CONFIG.playBounds
    const margin = GAME_CONFIG.spawnMargin
    return this.y < -margin || this.x < left - margin * 2 || this.x > right + margin * 2
  }

  escape(): void {
    if (this.state === 'escaping') return
    this.state = 'escaping'
    this.vx *= 0.3
    this.vy = -DIFFICULTY_CONFIG.escapeSpeed
    this.baseY = this.y
  }

  step(dtMs: number): void {
    const dt = dtMs / 1000
    this.elapsedMs += dtMs
    this.x += this.vx * dt
    this.baseY += this.vy * dt
    if (this.state === 'escaping') {
      this.y = this.baseY
      return
    }
    this.bounce()
    this.turnIfDue()
    const phase = this.spec.wobblePhase + (this.elapsedMs / 1000) * this.spec.wobbleFrequency
    this.y = this.baseY + Math.sin(phase) * this.spec.wobbleAmplitude
  }

  private bounce(): void {
    const { left, right, top, bottom } = GAME_CONFIG.playBounds
    if (!this.entered) {
      this.entered = this.x >= left && this.x <= right
      if (!this.entered) return
    }
    if (this.x < left) {
      this.x = left
      this.vx = Math.abs(this.vx)
    } else if (this.x > right) {
      this.x = right
      this.vx = -Math.abs(this.vx)
    }
    if (this.baseY < top) {
      this.baseY = top
      this.vy = Math.abs(this.vy)
    } else if (this.baseY > bottom) {
      this.baseY = bottom
      this.vy = -Math.abs(this.vy)
    }
  }

  private turnIfDue(): void {
    if (this.nextTurnMs === null || !this.entered || this.elapsedMs < this.nextTurnMs) return
    const interval = this.spec.turnIntervalMs ?? this.nextTurnMs
    this.nextTurnMs = this.elapsedMs + interval
    const speed = Math.hypot(this.vx, this.vy)
    const turn =
      (MIN_TURN_RAD + (MAX_TURN_RAD - MIN_TURN_RAD) * this.rng()) * (this.rng() < 0.5 ? -1 : 1)
    const heading = Math.atan2(this.vy, this.vx) + turn
    this.vx = Math.cos(heading) * speed
    this.vy = Math.sin(heading) * speed
  }
}

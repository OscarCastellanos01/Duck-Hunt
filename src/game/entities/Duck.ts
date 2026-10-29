import Phaser from 'phaser'
import { DUCK_ANIMATION, DUCK_TYPES, GAME_CONFIG, type DuckType } from '@/core/config'
import { DuckMotion } from '@/game/systems/duckMotion'
import type { DuckSpec, Rng } from '@/game/systems/spawner'

export type DuckStatus = 'flying' | 'escaping' | 'stunned' | 'falling' | 'removed'

const TEXTURES: Record<DuckType, string> = {
  common: 'duckCommon',
  fast: 'duckFast',
  golden: 'duckGolden',
}

const FALL_SPIN_DEG_PER_SECOND = 540
const RAD_TO_DEG = 180 / Math.PI

export class Duck extends Phaser.GameObjects.Image {
  readonly duckType: DuckType
  private readonly motion: DuckMotion
  private readonly baseScale: number
  private readonly flapOffset: number
  private currentStatus: DuckStatus = 'flying'
  private elapsedMs = 0
  private stunLeftMs = 0

  constructor(scene: Phaser.Scene, spec: DuckSpec, rng: Rng) {
    super(scene, spec.x, spec.y, TEXTURES[spec.type])
    this.duckType = spec.type
    this.motion = new DuckMotion(spec, rng)
    this.baseScale = DUCK_TYPES[spec.type].scale
    this.flapOffset = spec.wobblePhase
    this.setScale(this.baseScale)
    scene.add.existing(this)
  }

  get status(): DuckStatus {
    return this.currentStatus
  }

  get isFlying(): boolean {
    return this.currentStatus === 'flying'
  }

  get hitRadius(): number {
    return (Math.max(this.displayWidth, this.displayHeight) / 2) * GAME_CONFIG.hitboxScale
  }

  get points(): number {
    return DUCK_TYPES[this.duckType].points
  }

  hit(): void {
    this.currentStatus = 'stunned'
    this.stunLeftMs = DUCK_ANIMATION.stunMs
    this.setTint(DUCK_ANIMATION.stunTint)
    this.setScale(this.baseScale * DUCK_ANIMATION.stunScale)
    this.setAngle(0)
  }

  escape(): void {
    if (this.currentStatus !== 'flying') return
    this.currentStatus = 'escaping'
    this.motion.escape()
  }

  tick(dtMs: number): void {
    this.elapsedMs += dtMs
    if (this.currentStatus === 'stunned') {
      this.stunLeftMs -= dtMs
      if (this.stunLeftMs <= 0) this.startFalling()
      return
    }
    if (this.currentStatus === 'falling') {
      this.y += GAME_CONFIG.fallSpeed * (dtMs / 1000)
      this.angle += FALL_SPIN_DEG_PER_SECOND * (dtMs / 1000)
      if (this.y >= GAME_CONFIG.groundY) this.remove()
      return
    }
    this.motion.step(dtMs)
    this.setPosition(this.motion.x, this.motion.y)
    this.setFlipX(this.motion.facingRight === GAME_CONFIG.duckSpriteFacesLeft)
    this.animateFlight()
    if (this.currentStatus === 'escaping' && this.motion.offscreen) this.remove()
  }

  private animateFlight(): void {
    const escaping = this.currentStatus === 'escaping'
    const rate = DUCK_ANIMATION.flapRate * (escaping ? DUCK_ANIMATION.escapeFlapMultiplier : 1)
    const flap = Math.sin((this.elapsedMs / 1000) * rate + this.flapOffset)
    this.setScale(
      this.baseScale * (1 - DUCK_ANIMATION.flapStretch * flap),
      this.baseScale * (1 + DUCK_ANIMATION.flapSquash * flap),
    )
    const direction = this.motion.facingRight ? 1 : -1
    const slope = Math.atan2(this.motion.vy, Math.abs(this.motion.vx)) * RAD_TO_DEG
    const target = escaping
      ? DUCK_ANIMATION.escapeTiltDeg * direction
      : Phaser.Math.Clamp(
          slope * DUCK_ANIMATION.tiltFactor,
          -DUCK_ANIMATION.tiltMaxDeg,
          DUCK_ANIMATION.tiltMaxDeg,
        ) * direction
    this.setAngle(Phaser.Math.Linear(this.angle, target, DUCK_ANIMATION.tiltSmoothing))
  }

  private startFalling(): void {
    this.currentStatus = 'falling'
    this.clearTint()
    this.setScale(this.baseScale)
    this.setFlipY(true)
  }

  private remove(): void {
    this.currentStatus = 'removed'
    this.destroy()
  }
}

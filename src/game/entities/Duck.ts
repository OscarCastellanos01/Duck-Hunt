import Phaser from 'phaser'
import { DUCK_TYPES, GAME_CONFIG, type DuckType } from '@/core/config'
import { DuckMotion } from '@/game/systems/duckMotion'
import type { DuckSpec, Rng } from '@/game/systems/spawner'

export type DuckStatus = 'flying' | 'escaping' | 'falling' | 'removed'

const TEXTURES: Record<DuckType, string> = {
  common: 'duckCommon',
  fast: 'duckFast',
  golden: 'duckGolden',
}

const FALL_SPIN_DEG_PER_SECOND = 540

export class Duck extends Phaser.GameObjects.Image {
  readonly duckType: DuckType
  private readonly motion: DuckMotion
  private currentStatus: DuckStatus = 'flying'

  constructor(scene: Phaser.Scene, spec: DuckSpec, rng: Rng) {
    super(scene, spec.x, spec.y, TEXTURES[spec.type])
    this.duckType = spec.type
    this.motion = new DuckMotion(spec, rng)
    this.setScale(DUCK_TYPES[spec.type].scale)
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
    this.currentStatus = 'falling'
    this.setFlipY(true)
  }

  escape(): void {
    if (this.currentStatus !== 'flying') return
    this.currentStatus = 'escaping'
    this.motion.escape()
  }

  tick(dtMs: number): void {
    if (this.currentStatus === 'falling') {
      this.y += GAME_CONFIG.fallSpeed * (dtMs / 1000)
      this.angle += FALL_SPIN_DEG_PER_SECOND * (dtMs / 1000)
      if (this.y >= GAME_CONFIG.groundY) this.remove()
      return
    }
    this.motion.step(dtMs)
    this.setPosition(this.motion.x, this.motion.y)
    this.setFlipX(this.motion.facingRight === GAME_CONFIG.duckSpriteFacesLeft)
    if (this.currentStatus === 'escaping' && this.motion.offscreen) this.remove()
  }

  private remove(): void {
    this.currentStatus = 'removed'
    this.destroy()
  }
}

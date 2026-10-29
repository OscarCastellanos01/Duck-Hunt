import Phaser from 'phaser'
import { GAME_CONFIG, RIFLE_CONFIG } from '@/core/config'
import type { EventBus } from '@/core/eventBus'
import type { GameEvents } from '@/core/types'

const RIFLE_DEPTH = 60
const MAX_TILT_RAD = 1.1

export class Rifle extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, bus: EventBus<GameEvents>) {
    super(scene, RIFLE_CONFIG.x, RIFLE_CONFIG.baseY, 'rifle')
    this.setOrigin(0.5, 1)
    this.setScale(RIFLE_CONFIG.scale)
    this.setDepth(RIFLE_DEPTH)
    scene.add.existing(this)
    const offAim = bus.on('aim', ({ x, y }) =>
      this.pointAt(x * GAME_CONFIG.width, y * GAME_CONFIG.height),
    )
    const offShoot = bus.on('shoot', () => this.kick())
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offAim()
      offShoot()
    })
  }

  private pointAt(x: number, y: number): void {
    const angle = Math.atan2(x - this.x, this.y - y)
    const clamped = Phaser.Math.Clamp(angle, -MAX_TILT_RAD, MAX_TILT_RAD)
    this.setRotation(clamped + RIFLE_CONFIG.barrelLeanRad)
  }

  private kick(): void {
    this.scene.tweens.killTweensOf(this)
    this.setY(RIFLE_CONFIG.baseY)
    this.scene.tweens.add({
      targets: this,
      y: RIFLE_CONFIG.baseY + RIFLE_CONFIG.kickPx,
      duration: RIFLE_CONFIG.kickMs,
      yoyo: true,
      ease: 'Quad.easeOut',
    })
  }
}

import Phaser from 'phaser'
import { GAME_CONFIG, LANES, TARGET_LAYOUT, TARGET_TYPES, type TargetType } from '@/core/config'
import { TargetMotion } from '@/game/systems/targetMotion'
import type { SpawnRequest } from '@/game/systems/spawner'

const LANE_DEPTH_BASE = 10
const LANE_DEPTH_STEP = 20

export const laneDepth = (lane: number): number => LANE_DEPTH_BASE + lane * LANE_DEPTH_STEP
export const waterDepth = (lane: number): number => laneDepth(lane) + 5

export class Target extends Phaser.GameObjects.Container {
  readonly targetType: TargetType
  readonly lane: number
  private readonly motion: TargetMotion
  private readonly sprite: Phaser.GameObjects.Image
  private readonly baseY: number
  private readonly direction: number
  private readonly centerLocalY: number
  private knockedDown = false
  private gone = false

  constructor(scene: Phaser.Scene, request: SpawnRequest) {
    const lane = LANES[request.lane] ?? LANES[0]
    const spec = TARGET_TYPES[request.type]
    super(scene, request.x, lane.waterY)
    this.targetType = request.type
    this.lane = request.lane
    this.baseY = lane.waterY
    this.direction = lane.direction
    this.motion = new TargetMotion(request)

    const { stickHeight, stickSink, stickWidth, targetOverlap } = TARGET_LAYOUT
    const stick = scene.add
      .image(0, stickSink, 'stick')
      .setOrigin(0.5, 1)
      .setDisplaySize(stickWidth, stickHeight + stickSink)
    this.sprite = scene.add
      .image(0, -stickHeight + targetOverlap, spec.texture)
      .setOrigin(0.5, 1)
      .setFlipX(lane.direction < 0)
    this.centerLocalY = this.sprite.y - this.sprite.height / 2
    this.add([stick, this.sprite])
    this.setScale(lane.scale * spec.scale)
    this.setDepth(laneDepth(request.lane))
    this.setY(lane.waterY + this.motion.offsetY)
    scene.add.existing(this)
  }

  get removed(): boolean {
    return this.gone
  }

  get hittable(): boolean {
    return !this.knockedDown && !this.gone && this.motion.hittable
  }

  get centerX(): number {
    return this.x
  }

  get centerY(): number {
    return this.y + this.centerLocalY * this.scaleY
  }

  get bodyRadius(): number {
    return (Math.max(this.sprite.width, this.sprite.height) / 2) * this.scaleX
  }

  get hitRadius(): number {
    return this.bodyRadius * GAME_CONFIG.hitboxScale
  }

  tick(dtMs: number): void {
    if (this.knockedDown || this.gone) return
    this.motion.step(dtMs)
    this.setPosition(this.motion.x, this.baseY + this.motion.offsetY)
    if (this.motion.phase === 'done') this.dispose()
  }

  knockDown(): void {
    this.knockedDown = true
    const tilt = TARGET_LAYOUT.knockAngleDeg * (this.direction > 0 ? -1 : 1)
    this.scene.tweens.add({
      targets: this,
      angle: tilt,
      y: this.y + TARGET_LAYOUT.knockDropPx,
      alpha: 0,
      duration: TARGET_LAYOUT.knockMs,
      ease: 'Cubic.easeIn',
      onComplete: () => this.dispose(),
    })
  }

  private dispose(): void {
    if (this.gone) return
    this.gone = true
    this.destroy()
  }
}

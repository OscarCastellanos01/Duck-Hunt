import type Phaser from 'phaser'
import { FX_CONFIG, type TargetType } from '@/core/config'

const FEATHER_KEY = 'fxFeather'
const SPARK_KEY = 'fxSpark'
const FX_DEPTH = 700
const BURST_SPEED = { min: 80, max: 280 }
const BURST_GRAVITY = 420

export const generateFxTextures = (scene: Phaser.Scene): void => {
  if (scene.textures.exists(FEATHER_KEY)) return
  const feather = scene.make.graphics({ x: 0, y: 0 }, false)
  feather.fillStyle(0xffffff, 1)
  feather.fillEllipse(8, 4, 16, 7)
  feather.generateTexture(FEATHER_KEY, 16, 8)
  feather.destroy()
  const spark = scene.make.graphics({ x: 0, y: 0 }, false)
  spark.fillStyle(0xffffff, 1)
  spark.fillCircle(5, 5, 5)
  spark.generateTexture(SPARK_KEY, 10, 10)
  spark.destroy()
}

interface BurstOptions {
  texture: string
  count: number
  tint: number | number[]
  gravity?: number
  speed?: { min: number; max: number }
}

const burst = (scene: Phaser.Scene, x: number, y: number, options: BurstOptions): void => {
  const emitter = scene.add.particles(x, y, options.texture, {
    speed: options.speed ?? BURST_SPEED,
    angle: { min: 0, max: 360 },
    lifespan: FX_CONFIG.particleLifespanMs,
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotate: { start: 0, end: 360 },
    gravityY: options.gravity ?? BURST_GRAVITY,
    tint: options.tint,
    emitting: false,
  })
  emitter.setDepth(FX_DEPTH)
  emitter.explode(options.count)
  scene.time.delayedCall(FX_CONFIG.particleLifespanMs + 100, () => emitter.destroy())
}

export const targetHitEffect = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  type: TargetType,
): void => {
  const tint = FX_CONFIG.tints[type]
  const texture = type === 'bullseye' ? SPARK_KEY : FEATHER_KEY
  burst(scene, x, y, { texture, count: FX_CONFIG.feathersPerHit, tint })
  if (type === 'golden') {
    burst(scene, x, y, {
      texture: SPARK_KEY,
      count: FX_CONFIG.goldenExtraSparks,
      tint,
      gravity: 0,
    })
  }
}

export const missEffect = (scene: Phaser.Scene, x: number, y: number): void => {
  burst(scene, x, y, {
    texture: SPARK_KEY,
    count: FX_CONFIG.dustPerMiss,
    tint: 0xdddddd,
    gravity: 0,
    speed: { min: 30, max: 90 },
  })
}

import type Phaser from 'phaser'
import { GAME_CONFIG, LANES } from '@/core/config'
import { waterDepth } from '@/game/entities/Target'

export const UI_DEPTH = 100
const WALL_DEPTH = 0
const CURTAIN_DEPTH = 70
const VALANCE_HEIGHT = 80
const SIDE_CURTAIN_Y = 40
const WATER_TILE_WIDTH = 132
const WATER_SWAY_PX = 10
const WATER_SWAY_MS = 1400
const WATER_SWAY_STEP_MS = 300
const SIMPLE_WATER_Y = 440
const SIMPLE_WATER_DEPTH = 15

const createWaterStrip = (scene: Phaser.Scene, y: number, depth: number, swayMs: number) => {
  const strip = scene.add.container(0, y).setDepth(depth)
  const columns = Math.ceil(GAME_CONFIG.width / WATER_TILE_WIDTH) + 3
  for (let i = -1; i < columns; i++) {
    strip.add(
      scene.add.image(i * WATER_TILE_WIDTH, 0, i % 2 === 0 ? 'water1' : 'water2').setOrigin(0, 0),
    )
  }
  scene.tweens.add({
    targets: strip,
    x: WATER_SWAY_PX,
    duration: swayMs,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })
}

export const createBackdrop = (scene: Phaser.Scene, laneWater = false): void => {
  const { width, height } = GAME_CONFIG
  scene.add.tileSprite(0, 0, width, height, 'wall').setOrigin(0).setDepth(WALL_DEPTH)
  if (laneWater) {
    LANES.forEach((lane, index) =>
      createWaterStrip(
        scene,
        lane.waterY,
        waterDepth(index),
        WATER_SWAY_MS + index * WATER_SWAY_STEP_MS,
      ),
    )
  } else {
    createWaterStrip(scene, SIMPLE_WATER_Y, SIMPLE_WATER_DEPTH, WATER_SWAY_MS)
  }
  scene.add.image(0, SIDE_CURTAIN_Y, 'curtainSide').setOrigin(0, 0).setDepth(CURTAIN_DEPTH)
  scene.add
    .image(width, SIDE_CURTAIN_Y, 'curtainSide')
    .setOrigin(1, 0)
    .setFlipX(true)
    .setDepth(CURTAIN_DEPTH)
  scene.add
    .tileSprite(0, 0, width, VALANCE_HEIGHT, 'curtainTop')
    .setOrigin(0)
    .setDepth(CURTAIN_DEPTH)
}

import type Phaser from 'phaser'
import { GAME_CONFIG } from '@/core/config'

export const UI_DEPTH = 100
const WALL_DEPTH = 0
const SCENERY_DEPTH = 1
const GRASS_DEPTH = 20
const CURTAIN_DEPTH = 30
const GRASS_WIDTH = 132
const GRASS_BASE_Y = GAME_CONFIG.height + 70
const TREE_BASE_Y = GAME_CONFIG.groundY - 30

const CLOUDS = [
  { key: 'cloud1', x: 150, y: 150 },
  { key: 'cloud2', x: 480, y: 120 },
  { key: 'cloud1', x: 800, y: 190 },
]

const TREES = [
  { key: 'treeOak', x: 90 },
  { key: 'treePine', x: 330 },
  { key: 'treeOak', x: 620 },
  { key: 'treePine', x: 880 },
]

export const createBackdrop = (scene: Phaser.Scene): void => {
  const { width, height } = GAME_CONFIG
  scene.add.tileSprite(0, 0, width, height, 'bgBlue').setOrigin(0).setDepth(WALL_DEPTH)
  for (const cloud of CLOUDS) {
    scene.add.image(cloud.x, cloud.y, cloud.key).setDepth(SCENERY_DEPTH)
  }
  for (const tree of TREES) {
    scene.add.image(tree.x, TREE_BASE_Y, tree.key).setOrigin(0.5, 1).setDepth(SCENERY_DEPTH)
  }
  const columns = Math.ceil(width / GRASS_WIDTH) + 1
  for (let i = 0; i < columns; i++) {
    const key = i % 2 === 0 ? 'grass1' : 'grass2'
    scene.add
      .image(i * GRASS_WIDTH, GRASS_BASE_Y, key)
      .setOrigin(0, 1)
      .setDepth(GRASS_DEPTH)
  }
  scene.add.tileSprite(0, 0, width, 80, 'curtain').setOrigin(0).setDepth(CURTAIN_DEPTH)
}

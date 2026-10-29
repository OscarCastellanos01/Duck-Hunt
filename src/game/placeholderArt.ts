import Phaser from 'phaser'
import { GAME_CONFIG } from '@/core/config'
import type { ImageKey } from '@/assets/manifest'

interface DuckPalette {
  body: number
  wing: number
  head: number
  beak: number
}

const DUCK_WIDTH = 96
const DUCK_HEIGHT = 72

const PALETTES: Record<'duckCommon' | 'duckFast' | 'duckGolden', DuckPalette> = {
  duckCommon: { body: 0x8b5a2b, wing: 0x5e3a1a, head: 0x2e8b57, beak: 0xf2c200 },
  duckFast: { body: 0xd9822b, wing: 0xa65e17, head: 0xc0392b, beak: 0xffe066 },
  duckGolden: { body: 0xffd23f, wing: 0xe0a800, head: 0xfff3b0, beak: 0xff8c00 },
}

const createGraphics = (scene: Phaser.Scene) => scene.make.graphics({ x: 0, y: 0 }, false)

const bake = (
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
) => {
  const g = createGraphics(scene)
  draw(g)
  g.generateTexture(key, width, height)
  g.destroy()
}

const drawDuck = (g: Phaser.GameObjects.Graphics, palette: DuckPalette) => {
  g.fillStyle(palette.wing, 1)
  g.fillTriangle(8, 34, 30, 28, 22, 52)
  g.fillStyle(palette.body, 1)
  g.fillEllipse(44, 42, 62, 38)
  g.fillStyle(palette.wing, 1)
  g.fillEllipse(40, 44, 34, 20)
  g.fillStyle(palette.head, 1)
  g.fillCircle(72, 26, 15)
  g.fillStyle(palette.beak, 1)
  g.fillTriangle(84, 22, 84, 32, 98, 28)
  g.fillStyle(0xffffff, 1)
  g.fillCircle(76, 23, 4)
  g.fillStyle(0x111111, 1)
  g.fillCircle(77, 23, 2)
}

const drawBackground = (g: Phaser.GameObjects.Graphics) => {
  const { width, height, groundY } = GAME_CONFIG
  g.fillGradientStyle(0x6ec6ff, 0x6ec6ff, 0xd4f1ff, 0xd4f1ff, 1)
  g.fillRect(0, 0, width, groundY)
  g.fillStyle(0xffffff, 0.85)
  g.fillEllipse(180, 110, 140, 44)
  g.fillEllipse(230, 96, 100, 36)
  g.fillEllipse(720, 150, 160, 48)
  g.fillEllipse(780, 134, 110, 40)
  g.fillStyle(0x4f9d5a, 1)
  g.fillEllipse(220, groundY, 520, 150)
  g.fillEllipse(720, groundY, 640, 190)
  g.fillStyle(0x3b8a49, 1)
  g.fillRect(0, groundY - 10, width, height - groundY + 10)
  g.fillStyle(0x2f7a3d, 1)
  for (let x = 0; x < width; x += 24) {
    g.fillTriangle(x, groundY + 4, x + 12, groundY - 22, x + 24, groundY + 4)
  }
  g.fillStyle(0x6b4a2b, 1)
  g.fillRect(0, groundY + 60, width, height - groundY - 60)
}

const drawCrosshair = (g: Phaser.GameObjects.Graphics) => {
  g.lineStyle(4, 0xff3b30, 1)
  g.strokeCircle(32, 32, 22)
  g.lineStyle(3, 0xffffff, 1)
  g.lineBetween(32, 2, 32, 18)
  g.lineBetween(32, 46, 32, 62)
  g.lineBetween(2, 32, 18, 32)
  g.lineBetween(46, 32, 62, 32)
  g.fillStyle(0xff3b30, 1)
  g.fillCircle(32, 32, 3)
}

const drawBullet = (g: Phaser.GameObjects.Graphics, filled: boolean) => {
  if (filled) {
    g.fillStyle(0xd9a441, 1)
    g.fillRect(4, 14, 12, 24)
    g.fillStyle(0xb7792b, 1)
    g.fillTriangle(4, 14, 16, 14, 10, 2)
    return
  }
  g.lineStyle(2, 0x8a8f98, 1)
  g.strokeRect(4, 14, 12, 24)
  g.strokeTriangle(4, 14, 16, 14, 10, 2)
}

const drawers: Record<
  ImageKey,
  () => { width: number; height: number; draw: (g: Phaser.GameObjects.Graphics) => void }
> = {
  background: () => ({
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
    draw: drawBackground,
  }),
  duckCommon: () => ({
    width: DUCK_WIDTH,
    height: DUCK_HEIGHT,
    draw: (g) => drawDuck(g, PALETTES.duckCommon),
  }),
  duckFast: () => ({
    width: DUCK_WIDTH,
    height: DUCK_HEIGHT,
    draw: (g) => drawDuck(g, PALETTES.duckFast),
  }),
  duckGolden: () => ({
    width: DUCK_WIDTH,
    height: DUCK_HEIGHT,
    draw: (g) => drawDuck(g, PALETTES.duckGolden),
  }),
  crosshair: () => ({ width: 64, height: 64, draw: drawCrosshair }),
  bulletIcon: () => ({ width: 20, height: 40, draw: (g) => drawBullet(g, true) }),
  bulletEmptyIcon: () => ({ width: 20, height: 40, draw: (g) => drawBullet(g, false) }),
  duckIcon: () => ({
    width: 32,
    height: 24,
    draw: (g) => {
      g.fillStyle(0xffffff, 1)
      g.fillEllipse(14, 14, 24, 14)
      g.fillCircle(24, 8, 6)
      g.fillTriangle(28, 7, 28, 11, 32, 9)
    },
  }),
}

export const generatePlaceholder = (scene: Phaser.Scene, key: ImageKey): void => {
  if (scene.textures.exists(key)) return
  const { width, height, draw } = drawers[key]()
  bake(scene, key, width, height, draw)
}

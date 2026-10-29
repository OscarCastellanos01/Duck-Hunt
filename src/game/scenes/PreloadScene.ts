import Phaser from 'phaser'
import { ASSET_MANIFEST, IMAGE_KEYS } from '@/assets/manifest'
import { GAME_CONFIG } from '@/core/config'
import { generatePlaceholder } from '@/game/placeholderArt'
import { SCENE_KEYS } from '@/game/scenes/keys'

const BAR_WIDTH = 400
const BAR_HEIGHT = 24

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.preload)
  }

  preload(): void {
    const centerX = GAME_CONFIG.width / 2
    const centerY = GAME_CONFIG.height / 2
    this.add
      .rectangle(centerX, centerY, BAR_WIDTH + 8, BAR_HEIGHT + 8, 0x000000)
      .setStrokeStyle(2, 0xffffff)
    const bar = this.add
      .rectangle(centerX - BAR_WIDTH / 2, centerY, 0, BAR_HEIGHT, 0x6fe37a)
      .setOrigin(0, 0.5)
    this.add
      .text(centerX, centerY - 48, 'Loading...', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      bar.width = BAR_WIDTH * value
    })
    for (const key of IMAGE_KEYS) {
      const path = ASSET_MANIFEST.images[key]
      if (path) this.load.image(key, path)
    }
  }

  create(): void {
    for (const key of IMAGE_KEYS) generatePlaceholder(this, key)
    this.scene.start(SCENE_KEYS.menu)
  }
}

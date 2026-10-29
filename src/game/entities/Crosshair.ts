import Phaser from 'phaser'
import { GAME_CONFIG } from '@/core/config'
import type { EventBus } from '@/core/eventBus'
import type { GameEvents } from '@/core/types'

const CROSSHAIR_DEPTH = 1000

export class Crosshair extends Phaser.GameObjects.Image {
  constructor(scene: Phaser.Scene, bus: EventBus<GameEvents>) {
    super(scene, GAME_CONFIG.width / 2, GAME_CONFIG.height / 2, 'crosshair')
    this.setDepth(CROSSHAIR_DEPTH)
    scene.add.existing(this)
    const off = bus.on('aim', ({ x, y }) => {
      this.setPosition(x * GAME_CONFIG.width, y * GAME_CONFIG.height)
    })
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off)
  }
}

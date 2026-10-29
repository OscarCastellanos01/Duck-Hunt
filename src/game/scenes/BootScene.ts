import Phaser from 'phaser'
import { SCENE_KEYS } from '@/game/scenes/keys'

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot)
  }

  create(): void {
    this.scene.start(SCENE_KEYS.preload)
  }
}

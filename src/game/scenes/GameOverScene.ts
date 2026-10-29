import Phaser from 'phaser'
import { GAME_CONFIG } from '@/core/config'
import { Crosshair } from '@/game/entities/Crosshair'
import { UI_DEPTH, createBackdrop } from '@/game/ui/Backdrop'
import { SCENE_KEYS, type GameOverData } from '@/game/scenes/keys'
import { getServices } from '@/game/services'
import { Button, ButtonGroup } from '@/game/ui/Button'

const FONT = 'system-ui, sans-serif'
const BUTTON_WIDTH = 300
const BUTTON_HEIGHT = 64

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.gameOver)
  }

  create(data: GameOverData): void {
    const services = getServices(this)
    if (data.newRecord) this.sound.play('record')
    const centerX = GAME_CONFIG.width / 2
    const style = { fontFamily: FONT, color: '#ffffff', stroke: '#000000', strokeThickness: 6 }
    createBackdrop(this)
    this.add
      .text(centerX, 100, 'Game over', { ...style, fontSize: '72px' })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    this.add
      .text(centerX, 190, `Score ${data.score}`, { ...style, fontSize: '40px' })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    this.add
      .text(centerX, 240, `Reached round ${data.round}`, { ...style, fontSize: '26px' })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    const best = data.newRecord ? 'New record!' : `Best ${services.highScore.get()}`
    this.add
      .text(centerX, 285, best, {
        ...style,
        fontSize: '28px',
        color: data.newRecord ? '#ffd23f' : '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)

    const buttons = new ButtonGroup(this, services.bus)
    buttons.add(
      new Button(this, centerX, 360, 'Play again', BUTTON_WIDTH, BUTTON_HEIGHT, () =>
        this.scene.start(SCENE_KEYS.game),
      ),
    )
    buttons.add(
      new Button(this, centerX, 440, 'Main menu', BUTTON_WIDTH, BUTTON_HEIGHT, () =>
        this.scene.start(SCENE_KEYS.menu),
      ),
    )

    new Crosshair(this, services.bus)
  }
}

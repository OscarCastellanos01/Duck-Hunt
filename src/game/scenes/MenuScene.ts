import Phaser from 'phaser'
import { GAME_CONFIG } from '@/core/config'
import type { InputMode } from '@/core/types'
import { Crosshair } from '@/game/entities/Crosshair'
import { SCENE_KEYS } from '@/game/scenes/keys'
import { getServices, type Services } from '@/game/services'
import { Button, ButtonGroup } from '@/game/ui/Button'

const FONT = 'system-ui, sans-serif'
const BUTTON_WIDTH = 360
const BUTTON_HEIGHT = 64

export class MenuScene extends Phaser.Scene {
  private services!: Services
  private status!: Phaser.GameObjects.Text
  private busy = false

  constructor() {
    super(SCENE_KEYS.menu)
  }

  create(): void {
    this.services = getServices(this)
    this.busy = false
    const centerX = GAME_CONFIG.width / 2
    this.add.image(0, 0, 'background').setOrigin(0)
    this.add
      .text(centerX, 90, 'duck-gesture', {
        fontFamily: FONT,
        fontSize: '72px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
    this.add
      .text(centerX, 150, `Best score: ${this.services.highScore.get()}`, {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)

    const buttons = new ButtonGroup(this, this.services.bus)
    buttons.add(
      new Button(
        this,
        centerX,
        240,
        'Play with camera',
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        () => void this.play('camera'),
      ),
    )
    buttons.add(
      new Button(
        this,
        centerX,
        320,
        'Play with mouse',
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        () => void this.play('mouse'),
      ),
    )

    this.add
      .text(
        centerX,
        400,
        'Shape your hand like a pistol to aim. Drop your thumb to shoot.\nCamera video is processed on this device only. Nothing is recorded or uploaded.',
        {
          fontFamily: FONT,
          fontSize: '18px',
          color: '#ffffff',
          align: 'center',
          stroke: '#000000',
          strokeThickness: 3,
        },
      )
      .setOrigin(0.5)
    this.status = this.add
      .text(centerX, 470, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#ffd23f',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)

    new Crosshair(this, this.services.bus)
  }

  private async play(mode: InputMode): Promise<void> {
    if (this.busy) return
    this.busy = true
    this.status.setText(mode === 'camera' ? 'Starting camera and loading hand tracking...' : '')
    try {
      await this.services.input.use(mode)
    } catch (error) {
      this.status.setText(
        error instanceof Error ? error.message : 'The input could not be started.',
      )
      this.busy = false
      return
    }
    this.services.settings.update({ inputMode: mode })
    this.scene.start(SCENE_KEYS.game)
  }
}

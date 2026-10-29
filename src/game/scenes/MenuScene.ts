import Phaser from 'phaser'
import { GAME_CONFIG } from '@/core/config'
import type { InputMode } from '@/core/types'
import { Crosshair } from '@/game/entities/Crosshair'
import { UI_DEPTH, createBackdrop } from '@/game/ui/Backdrop'
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
    createBackdrop(this)
    this.add
      .text(centerX, 90, 'duck-gesture', {
        fontFamily: FONT,
        fontSize: '72px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    this.add
      .text(centerX, 150, `Best score: ${this.services.highScore.get()}`, {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)

    const buttons = new ButtonGroup(this, this.services.bus)
    buttons.add(
      new Button(
        this,
        centerX,
        215,
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
        285,
        'Play with mouse',
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        () => void this.play('mouse'),
      ),
    )
    buttons.add(
      new Button(this, centerX, 355, 'Settings', BUTTON_WIDTH, BUTTON_HEIGHT, () =>
        this.scene.start(SCENE_KEYS.settings),
      ),
    )

    this.add
      .text(
        centerX,
        425,
        'Point with your index finger to aim. Drop your thumb to shoot.\nCamera video is processed on this device only. Nothing is recorded or uploaded.',
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
      .setDepth(UI_DEPTH)
    this.status = this.add
      .text(centerX, 490, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#ffd23f',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)

    new Crosshair(this, this.services.bus)
  }

  private async play(mode: InputMode): Promise<void> {
    if (this.busy) return
    if (mode === 'camera') {
      this.scene.start(SCENE_KEYS.calibration)
      return
    }
    this.busy = true
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

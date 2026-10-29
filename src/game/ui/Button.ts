import Phaser from 'phaser'
import { GAME_CONFIG } from '@/core/config'
import type { EventBus } from '@/core/eventBus'
import type { GameEvents } from '@/core/types'

const NORMAL_COLOR = 0x2b3a4a
const HOVER_COLOR = 0x3d6a99
const BORDER_COLOR = 0xffffff

export class Button extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Rectangle
  private readonly label: Phaser.GameObjects.Text

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    private readonly buttonWidth: number,
    private readonly buttonHeight: number,
    private readonly onActivate: () => void,
  ) {
    super(scene, x, y)
    this.background = scene.add
      .rectangle(0, 0, buttonWidth, buttonHeight, NORMAL_COLOR)
      .setStrokeStyle(3, BORDER_COLOR)
    this.label = scene.add
      .text(0, 0, text, { fontFamily: 'system-ui, sans-serif', fontSize: '28px', color: '#ffffff' })
      .setOrigin(0.5)
    this.add([this.background, this.label])
    scene.add.existing(this)
  }

  setLabel(text: string): void {
    this.label.setText(text)
  }

  containsPoint(px: number, py: number): boolean {
    return (
      Math.abs(px - this.x) <= this.buttonWidth / 2 &&
      Math.abs(py - this.y) <= this.buttonHeight / 2
    )
  }

  setHover(hover: boolean): void {
    this.background.setFillStyle(hover ? HOVER_COLOR : NORMAL_COLOR)
  }

  activate(): void {
    this.onActivate()
  }
}

export class ButtonGroup {
  private readonly buttons: Button[] = []

  constructor(scene: Phaser.Scene, bus: EventBus<GameEvents>) {
    const offAim = bus.on('aim', ({ x, y }) => {
      const px = x * GAME_CONFIG.width
      const py = y * GAME_CONFIG.height
      for (const button of this.buttons) button.setHover(button.containsPoint(px, py))
    })
    const offShoot = bus.on('shoot', ({ x, y }) => {
      const px = x * GAME_CONFIG.width
      const py = y * GAME_CONFIG.height
      const target = this.buttons.find((button) => button.containsPoint(px, py))
      target?.activate()
    })
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offAim()
      offShoot()
    })
  }

  add(button: Button): void {
    this.buttons.push(button)
  }
}

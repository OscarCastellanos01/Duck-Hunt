import type Phaser from 'phaser'
import { GAME_CONFIG } from '@/core/config'
import type { ImageKey } from '@/assets/manifest'

const FONT = 'system-ui, sans-serif'
const MARGIN = 20
const HUD_DEPTH = 500
const AMMO_SPACING = 24
const BANNER_FADE_MS = 200
const BANNER_Y = 250
const LOW_TIME_COLOR = '#ff5252'
const NORMAL_TIME_COLOR = '#ffffff'
const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

const formatTime = (ms: number): string => {
  const total = Math.ceil(ms / MS_PER_SECOND)
  const minutes = Math.floor(total / SECONDS_PER_MINUTE)
  const seconds = total % SECONDS_PER_MINUTE
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export class Hud {
  private readonly score: Phaser.GameObjects.Text
  private readonly highScore: Phaser.GameObjects.Text
  private readonly time: Phaser.GameObjects.Text
  private readonly multiplier: Phaser.GameObjects.Text
  private readonly reloadText: Phaser.GameObjects.Text
  private readonly ammoIcons: Phaser.GameObjects.Image[] = []
  private banner: Phaser.GameObjects.Image | null = null

  constructor(
    private readonly scene: Phaser.Scene,
    ammoCapacity: number,
  ) {
    const text = (x: number, y: number, size: number, originX = 0) =>
      scene.add
        .text(x, y, '', {
          fontFamily: FONT,
          fontSize: `${size}px`,
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 4,
        })
        .setOrigin(originX, 0)
        .setDepth(HUD_DEPTH)

    scene.add.image(MARGIN + 14, MARGIN + 18, 'duckIcon').setDepth(HUD_DEPTH)
    this.score = text(MARGIN + 40, MARGIN, 30)
    this.multiplier = text(MARGIN + 40, MARGIN + 38, 20)
    this.time = text(GAME_CONFIG.width / 2, MARGIN - 4, 40, 0.5)
    this.highScore = text(GAME_CONFIG.width - MARGIN, MARGIN, 22, 1)

    const ammoY = GAME_CONFIG.height - 50
    const startX = GAME_CONFIG.width - MARGIN - 10 - (ammoCapacity - 1) * AMMO_SPACING
    for (let i = 0; i < ammoCapacity; i++) {
      this.ammoIcons.push(
        scene.add.image(startX + i * AMMO_SPACING, ammoY, 'bulletIcon').setDepth(HUD_DEPTH),
      )
    }
    this.reloadText = text(GAME_CONFIG.width - MARGIN, ammoY - 56, 22, 1)
  }

  setScore(value: number): void {
    this.score.setText(`${value}`)
  }

  setHighScore(value: number): void {
    this.highScore.setText(`Best ${value}`)
  }

  setTime(remainingMs: number, low: boolean): void {
    this.time.setText(formatTime(remainingMs))
    this.time.setColor(low ? LOW_TIME_COLOR : NORMAL_TIME_COLOR)
  }

  setMultiplier(multiplier: number): void {
    this.multiplier.setText(multiplier > 1 ? `x${multiplier.toFixed(2)}` : '')
  }

  setAmmo(remaining: number, reloading: boolean): void {
    this.ammoIcons.forEach((icon, index) => {
      icon.setTexture(index < remaining ? 'bulletIcon' : 'bulletEmptyIcon')
    })
    this.reloadText.setText(reloading ? 'Reloading...' : '')
  }

  showBanner(key: ImageKey, durationMs: number): void {
    this.banner?.destroy()
    const banner = this.scene.add
      .image(GAME_CONFIG.width / 2, BANNER_Y, key)
      .setDepth(HUD_DEPTH)
      .setAlpha(0)
      .setScale(0.6)
    this.banner = banner
    this.scene.tweens.add({
      targets: banner,
      alpha: 1,
      scale: 1.4,
      duration: BANNER_FADE_MS,
      hold: Math.max(0, durationMs - BANNER_FADE_MS * 2),
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => banner.destroy(),
    })
  }
}

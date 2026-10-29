import type Phaser from 'phaser'
import { GAME_CONFIG } from '@/core/config'

export type DuckResult = 'pending' | 'hit' | 'miss'

const FONT = 'system-ui, sans-serif'
const MARGIN = 20
const HUD_DEPTH = 500
const TRACKER_COLORS: Record<DuckResult, number> = {
  pending: 0xffffff,
  hit: 0x6fe37a,
  miss: 0xff5252,
}
const TRACKER_ICON_WIDTH = 32
const TRACKER_SPACING = 6
const AMMO_SPACING = 24
const BANNER_FADE_MS = 300

export class Hud {
  private readonly score: Phaser.GameObjects.Text
  private readonly highScore: Phaser.GameObjects.Text
  private readonly round: Phaser.GameObjects.Text
  private readonly streak: Phaser.GameObjects.Text
  private readonly banner: Phaser.GameObjects.Text
  private readonly ammoIcons: Phaser.GameObjects.Image[] = []
  private trackerIcons: Phaser.GameObjects.Image[] = []

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

    this.score = text(MARGIN, MARGIN, 30)
    this.highScore = text(GAME_CONFIG.width - MARGIN, MARGIN, 22, 1)
    this.round = text(GAME_CONFIG.width / 2, MARGIN, 24, 0.5)
    this.streak = text(MARGIN, MARGIN + 38, 20)
    this.banner = text(GAME_CONFIG.width / 2, GAME_CONFIG.height / 2 - 60, 56, 0.5).setAlpha(0)

    const ammoY = GAME_CONFIG.height - 50
    for (let i = 0; i < ammoCapacity; i++) {
      this.ammoIcons.push(
        scene.add.image(MARGIN + 10 + i * AMMO_SPACING, ammoY, 'bulletIcon').setDepth(HUD_DEPTH),
      )
    }
  }

  setScore(value: number): void {
    this.score.setText(`Score ${value}`)
  }

  setHighScore(value: number): void {
    this.highScore.setText(`Best ${value}`)
  }

  setRound(round: number, wave: number, waves: number): void {
    this.round.setText(`Round ${round}  -  Wave ${wave}/${waves}`)
  }

  setStreak(multiplier: number): void {
    this.streak.setText(multiplier > 1 ? `Streak x${multiplier.toFixed(2)}` : '')
  }

  setAmmo(remaining: number): void {
    this.ammoIcons.forEach((icon, index) => {
      icon.setTexture(index < remaining ? 'bulletIcon' : 'bulletEmptyIcon')
    })
  }

  setTracker(results: readonly DuckResult[]): void {
    if (this.trackerIcons.length !== results.length) {
      for (const icon of this.trackerIcons) icon.destroy()
      const total = results.length * TRACKER_ICON_WIDTH + (results.length - 1) * TRACKER_SPACING
      const startX = GAME_CONFIG.width - MARGIN - total + TRACKER_ICON_WIDTH / 2
      const y = GAME_CONFIG.height - 36
      this.trackerIcons = results.map((_, index) =>
        this.scene.add
          .image(startX + index * (TRACKER_ICON_WIDTH + TRACKER_SPACING), y, 'duckIcon')
          .setDepth(HUD_DEPTH),
      )
    }
    results.forEach((result, index) => this.trackerIcons[index]?.setTint(TRACKER_COLORS[result]))
  }

  showBanner(message: string, durationMs: number): void {
    this.scene.tweens.killTweensOf(this.banner)
    this.banner.setText(message).setAlpha(0)
    this.scene.tweens.add({
      targets: this.banner,
      alpha: 1,
      duration: BANNER_FADE_MS,
      yoyo: true,
      hold: Math.max(0, durationMs - BANNER_FADE_MS * 2),
    })
  }
}

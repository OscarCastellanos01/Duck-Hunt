import Phaser from 'phaser'
import { FX_CONFIG, GAME_CONFIG, TARGET_TYPES, TRACKING_FREEZE_MS } from '@/core/config'
import { Crosshair } from '@/game/entities/Crosshair'
import { Rifle } from '@/game/entities/Rifle'
import { Target } from '@/game/entities/Target'
import { missEffect, targetHitEffect } from '@/game/effects'
import { SCENE_KEYS, type GameOverData } from '@/game/scenes/keys'
import { getServices, type Services } from '@/game/services'
import { Ammo } from '@/game/systems/ammo'
import { getDifficulty } from '@/game/systems/difficulty'
import { GameTimer } from '@/game/systems/gameTimer'
import { findHitTarget } from '@/game/systems/hitTest'
import { ScoreKeeper } from '@/game/systems/scoring'
import { LaneSpawner, PopupSpawner, type SpawnRequest } from '@/game/systems/spawner'
import { bullseyePoints } from '@/game/systems/targets'
import { createBackdrop } from '@/game/ui/Backdrop'
import { Hud } from '@/game/ui/Hud'

type Phase = 'ready' | 'playing' | 'over'

const FONT = 'system-ui, sans-serif'
const NOTICE_TEXT = 'Hand lost. Show your hand to the camera.'
const LIGHT_HINT = 'Make sure the room is well lit.'
const FLASH_DEPTH = 900
const FLOATING_TEXT_DEPTH = 800
const FLOATING_TEXT_RISE_PX = 50
const HOLE_DEPTH = 7
const HOLE_FADE_MS = 400
const FIRST_POPUP_DELAY_MS = 3000
const COUNTDOWN_TICKS = 5
const MS_PER_SECOND = 1000

export class GameScene extends Phaser.Scene {
  private services!: Services
  private scoring = new ScoreKeeper()
  private ammo = new Ammo(GAME_CONFIG.magazineSize)
  private timer = new GameTimer(GAME_CONFIG.durationMs)
  private laneSpawner = new LaneSpawner(Math.random)
  private popupSpawner = new PopupSpawner(Math.random, FIRST_POPUP_DELAY_MS)
  private hud!: Hud
  private flash!: Phaser.GameObjects.Rectangle
  private notice!: Phaser.GameObjects.Text
  private noticeTimers: Phaser.Time.TimerEvent[] = []
  private targets: Target[] = []
  private readonly pending: SpawnRequest[] = []
  private phase: Phase = 'ready'
  private shots = 0
  private hits = 0
  private lastTickSecond = -1

  constructor() {
    super(SCENE_KEYS.game)
  }

  create(): void {
    this.services = getServices(this)
    this.scoring = new ScoreKeeper()
    this.ammo = new Ammo(GAME_CONFIG.magazineSize)
    this.timer = new GameTimer(GAME_CONFIG.durationMs)
    this.laneSpawner = new LaneSpawner(Math.random)
    this.popupSpawner = new PopupSpawner(Math.random, FIRST_POPUP_DELAY_MS)
    this.targets = []
    this.pending.length = 0
    this.phase = 'ready'
    this.shots = 0
    this.hits = 0
    this.lastTickSecond = -1

    createBackdrop(this, true)
    this.flash = this.add
      .rectangle(
        GAME_CONFIG.width / 2,
        GAME_CONFIG.height / 2,
        GAME_CONFIG.width,
        GAME_CONFIG.height,
        0xffffff,
      )
      .setAlpha(0)
      .setDepth(FLASH_DEPTH)
    this.hud = new Hud(this, this.ammo.total)
    this.hud.setHighScore(this.services.highScore.get())
    this.hud.setScore(0)
    this.hud.setMultiplier(1)
    this.hud.setTime(GAME_CONFIG.durationMs, false)
    this.hud.setAmmo(this.ammo.remaining, false)
    this.notice = this.add
      .text(GAME_CONFIG.width / 2, GAME_CONFIG.height - 110, NOTICE_TEXT, {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#ffd23f',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(FLASH_DEPTH)
      .setVisible(false)
    const { bus } = this.services
    new Rifle(this, bus)
    new Crosshair(this, bus)

    const offShoot = bus.on('shoot', ({ x, y }) => this.handleShoot(x, y))
    const offLost = bus.on('trackingLost', () => {
      this.clearNoticeTimers()
      this.notice.setText(NOTICE_TEXT)
      this.noticeTimers = [
        this.time.delayedCall(TRACKING_FREEZE_MS, () => this.notice.setVisible(true)),
        this.time.delayedCall(FX_CONFIG.lightHintDelayMs, () =>
          this.notice.setText(`${NOTICE_TEXT}\n${LIGHT_HINT}`),
        ),
      ]
    })
    const offFound = bus.on('trackingFound', () => {
      this.clearNoticeTimers()
      this.notice.setVisible(false)
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offShoot()
      offLost()
      offFound()
    })

    this.startIntro()
  }

  override update(_time: number, delta: number): void {
    for (const target of this.targets) target.tick(delta)
    this.targets = this.targets.filter((target) => !target.removed)
    if (this.phase !== 'playing') return

    this.timer.tick(delta)
    this.spawn(delta)
    if (this.ammo.tick(delta)) {
      this.sound.play('reload')
      this.hud.setAmmo(this.ammo.remaining, false)
    }
    const remaining = this.timer.remainingMs
    this.hud.setTime(remaining, remaining <= GAME_CONFIG.lowTimeMs)
    this.playCountdownTick(remaining)
    if (this.timer.expired) this.endGame()
  }

  private spawn(delta: number): void {
    const difficulty = getDifficulty(this.timer.elapsedMs)
    this.pending.length = 0
    this.laneSpawner.update(delta, difficulty, this.pending)
    this.popupSpawner.update(delta, difficulty, this.pending)
    for (const request of this.pending) this.targets.push(new Target(this, request))
  }

  private playCountdownTick(remainingMs: number): void {
    const second = Math.ceil(remainingMs / MS_PER_SECOND)
    if (second > COUNTDOWN_TICKS || second === this.lastTickSecond) return
    this.lastTickSecond = second
    this.sound.play('tick')
  }

  private startIntro(): void {
    this.phase = 'ready'
    this.hud.showBanner('textReady', GAME_CONFIG.readyMs)
    this.time.delayedCall(GAME_CONFIG.readyMs, () => {
      this.phase = 'playing'
      this.hud.showBanner('textGo', GAME_CONFIG.goMs)
      this.sound.play('reload')
    })
  }

  private handleShoot(nx: number, ny: number): void {
    if (this.phase !== 'playing') return
    if (!this.ammo.consume()) {
      this.sound.play('empty')
      return
    }
    this.shots += 1
    this.sound.play('shoot')
    this.shotFeedback()
    if (this.ammo.empty) this.ammo.startReload(GAME_CONFIG.reloadMs)
    this.hud.setAmmo(this.ammo.remaining, this.ammo.reloading)

    const x = nx * GAME_CONFIG.width
    const y = ny * GAME_CONFIG.height
    const candidates = this.targets.filter((target) => target.hittable)
    const index = findHitTarget(
      candidates.map((target) => ({
        x: target.centerX,
        y: target.centerY,
        radius: target.hitRadius,
      })),
      x,
      y,
      GAME_CONFIG.aimAssistPx,
    )
    const target = candidates[index]
    if (target) {
      this.hitTarget(target, x, y)
    } else {
      this.scoring.registerMiss()
      missEffect(this, x, y)
      this.addHole(x, y)
    }
    this.hud.setMultiplier(this.scoring.multiplier)
  }

  private hitTarget(target: Target, shotX: number, shotY: number): void {
    const spec = TARGET_TYPES[target.targetType]
    const { centerX, centerY } = target
    target.knockDown()
    targetHitEffect(this, centerX, centerY, target.targetType)
    if (target.targetType === 'decoy') {
      const lost = this.scoring.registerPenalty(spec.points)
      this.sound.play('penalty')
      this.floatingText(centerX, centerY, `-${lost}`, '#ff5252')
    } else {
      const base =
        target.targetType === 'bullseye'
          ? bullseyePoints(Math.hypot(shotX - centerX, shotY - centerY) / target.bodyRadius)
          : spec.points
      const wasMax = this.scoring.atMaxMultiplier
      const awarded = this.scoring.registerHit(base)
      this.hits += 1
      this.timer.addBonus(spec.timeBonusMs)
      this.sound.play(target.targetType === 'golden' ? 'hitGolden' : 'hit')
      if (!wasMax && this.scoring.atMaxMultiplier) this.sound.play('roundClear')
      const bonus = spec.timeBonusMs > 0 ? `  +${spec.timeBonusMs / MS_PER_SECOND}s` : ''
      this.floatingText(centerX, centerY, `+${awarded}${bonus}`, '#ffd23f')
    }
    this.hud.setScore(this.scoring.score)
    this.hud.setHighScore(Math.max(this.services.highScore.get(), this.scoring.score))
  }

  private shotFeedback(): void {
    this.cameras.main.shake(GAME_CONFIG.shakeDurationMs, GAME_CONFIG.shakeIntensity)
    this.tweens.killTweensOf(this.flash)
    this.flash.setAlpha(GAME_CONFIG.flashAlpha)
    this.tweens.add({ targets: this.flash, alpha: 0, duration: GAME_CONFIG.flashMs })
  }

  private addHole(x: number, y: number): void {
    const hole = this.add.image(x, y, 'holeBlue').setDepth(HOLE_DEPTH)
    this.tweens.add({
      targets: hole,
      alpha: 0,
      delay: GAME_CONFIG.holeLifetimeMs,
      duration: HOLE_FADE_MS,
      onComplete: () => hole.destroy(),
    })
  }

  private floatingText(x: number, y: number, message: string, color: string): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: FONT,
        fontSize: '32px',
        color,
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(FLOATING_TEXT_DEPTH)
    this.tweens.add({
      targets: text,
      y: y - FLOATING_TEXT_RISE_PX,
      alpha: 0,
      duration: GAME_CONFIG.floatingTextMs,
      onComplete: () => text.destroy(),
    })
  }

  private endGame(): void {
    this.phase = 'over'
    this.sound.play('gameOver')
    this.hud.setTime(0, true)
    this.hud.showBanner('textTimeUp', GAME_CONFIG.timeUpMs)
    this.time.delayedCall(GAME_CONFIG.timeUpMs, () => this.finish())
  }

  private finish(): void {
    const data: GameOverData = {
      score: this.scoring.score,
      hits: this.hits,
      shots: this.shots,
      newRecord: this.services.highScore.submit(this.scoring.score),
    }
    this.scene.start(SCENE_KEYS.gameOver, data)
  }

  private clearNoticeTimers(): void {
    for (const timer of this.noticeTimers) timer.remove()
    this.noticeTimers = []
  }
}

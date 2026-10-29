import Phaser from 'phaser'
import { GAME_CONFIG, TRACKING_FREEZE_MS } from '@/core/config'
import { Crosshair } from '@/game/entities/Crosshair'
import { createBackdrop } from '@/game/ui/Backdrop'
import { Duck } from '@/game/entities/Duck'
import { SCENE_KEYS, type GameOverData } from '@/game/scenes/keys'
import { getServices, type Services } from '@/game/services'
import { Ammo } from '@/game/systems/ammo'
import { findHitTarget } from '@/game/systems/hitTest'
import { RoundManager, type WaveOutcome } from '@/game/systems/rounds'
import { ScoreKeeper } from '@/game/systems/scoring'
import { createDuckSpec } from '@/game/systems/spawner'
import { Hud, type DuckResult } from '@/game/ui/Hud'

type Phase = 'intro' | 'wave' | 'between' | 'over'

const FONT = 'system-ui, sans-serif'
const DUCK_DEPTH = 10
const FLASH_DEPTH = 900
const FLOATING_TEXT_DEPTH = 800
const FLOATING_TEXT_RISE_PX = 50

export class GameScene extends Phaser.Scene {
  private services!: Services
  private rounds = new RoundManager()
  private scoring = new ScoreKeeper()
  private ammo = new Ammo(GAME_CONFIG.ammoPerWave)
  private hud!: Hud
  private flash!: Phaser.GameObjects.Rectangle
  private notice!: Phaser.GameObjects.Text
  private noticeTimer: Phaser.Time.TimerEvent | null = null
  private ducks: Duck[] = []
  private resultIndex = new Map<Duck, number>()
  private results: DuckResult[] = []
  private resultCursor = 0
  private phase: Phase = 'intro'
  private waveTimeLeft = 0
  private pendingSpawns = 0
  private waveHits = 0
  private escapeScheduled = false

  constructor() {
    super(SCENE_KEYS.game)
  }

  create(): void {
    this.services = getServices(this)
    this.rounds = new RoundManager()
    this.scoring = new ScoreKeeper()
    this.ammo = new Ammo(GAME_CONFIG.ammoPerWave)
    this.ducks = []
    this.resultIndex = new Map()
    this.phase = 'intro'

    createBackdrop(this)
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
    this.hud.setStreak(1)
    this.notice = this.add
      .text(
        GAME_CONFIG.width / 2,
        GAME_CONFIG.height - 110,
        'Hand lost. Show your hand to the camera.',
        {
          fontFamily: FONT,
          fontSize: '26px',
          color: '#ffd23f',
          stroke: '#000000',
          strokeThickness: 5,
        },
      )
      .setOrigin(0.5)
      .setDepth(FLASH_DEPTH)
      .setVisible(false)
    new Crosshair(this, this.services.bus)

    const { bus } = this.services
    const offShoot = bus.on('shoot', ({ x, y }) => this.handleShoot(x, y))
    const offLost = bus.on('trackingLost', () => {
      this.noticeTimer?.remove()
      this.noticeTimer = this.time.delayedCall(TRACKING_FREEZE_MS, () =>
        this.notice.setVisible(true),
      )
    })
    const offFound = bus.on('trackingFound', () => {
      this.noticeTimer?.remove()
      this.notice.setVisible(false)
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offShoot()
      offLost()
      offFound()
    })

    this.startRound()
  }

  override update(_time: number, delta: number): void {
    for (const duck of this.ducks) duck.tick(delta)
    this.ducks = this.ducks.filter((duck) => duck.status !== 'removed')
    if (this.phase !== 'wave') return

    this.waveTimeLeft -= delta
    const flying = this.flyingDucks()
    if (this.waveTimeLeft <= 0) {
      this.escapeRemaining()
    } else if (this.ammo.empty && !this.escapeScheduled && flying.length > 0) {
      this.escapeScheduled = true
      this.time.delayedCall(GAME_CONFIG.escapeDelayMs, () => this.escapeRemaining())
    }
    if (this.pendingSpawns === 0 && this.flyingDucks().length === 0) this.endWave()
  }

  private flyingDucks(): Duck[] {
    return this.ducks.filter((duck) => duck.isFlying)
  }

  private startRound(): void {
    this.phase = 'intro'
    this.results = Array.from({ length: this.rounds.totalDucks }, () => 'pending' as const)
    this.resultCursor = 0
    this.hud.setTracker(this.results)
    this.hud.setRound(this.rounds.round, this.rounds.wave, GAME_CONFIG.wavesPerRound)
    this.hud.showBanner(`Round ${this.rounds.round}`, GAME_CONFIG.introMs)
    this.time.delayedCall(GAME_CONFIG.introMs, () => this.startWave())
  }

  private startWave(): void {
    const difficulty = this.rounds.difficulty
    this.phase = 'wave'
    this.ammo.reload()
    this.hud.setAmmo(this.ammo.remaining)
    this.hud.setRound(this.rounds.round, this.rounds.wave, GAME_CONFIG.wavesPerRound)
    this.waveHits = 0
    this.escapeScheduled = false
    this.pendingSpawns = difficulty.ducksPerWave
    this.waveTimeLeft = difficulty.waveDurationMs
    for (let i = 0; i < difficulty.ducksPerWave; i++) {
      this.time.delayedCall(i * GAME_CONFIG.spawnStaggerMs, () => this.spawnDuck())
    }
  }

  private spawnDuck(): void {
    this.pendingSpawns -= 1
    const duck = new Duck(this, createDuckSpec(this.rounds.difficulty, Math.random), Math.random)
    duck.setDepth(DUCK_DEPTH)
    this.resultIndex.set(duck, this.resultCursor)
    this.resultCursor += 1
    this.ducks.push(duck)
  }

  private escapeRemaining(): void {
    if (this.phase !== 'wave') return
    for (const duck of this.flyingDucks()) {
      duck.escape()
      this.markResult(duck, 'miss')
    }
  }

  private markResult(duck: Duck, result: DuckResult): void {
    const index = this.resultIndex.get(duck)
    if (index === undefined) return
    this.results[index] = result
    this.hud.setTracker(this.results)
  }

  private handleShoot(nx: number, ny: number): void {
    if (this.phase !== 'wave' || !this.ammo.consume()) return
    this.hud.setAmmo(this.ammo.remaining)
    this.shotFeedback()

    const x = nx * GAME_CONFIG.width
    const y = ny * GAME_CONFIG.height
    const flying = this.flyingDucks()
    const targets = flying.map((duck) => ({ x: duck.x, y: duck.y, radius: duck.hitRadius }))
    const index = findHitTarget(targets, x, y, GAME_CONFIG.aimAssistPx)
    const duck = flying[index]
    if (duck) {
      duck.hit()
      const points = this.scoring.registerHit(duck.points)
      this.waveHits += 1
      this.markResult(duck, 'hit')
      this.floatingText(duck.x, duck.y, `+${points}`)
      this.hud.setScore(this.scoring.score)
      this.hud.setHighScore(Math.max(this.services.highScore.get(), this.scoring.score))
    } else {
      this.scoring.registerMiss()
    }
    this.hud.setStreak(this.scoring.multiplier)
  }

  private shotFeedback(): void {
    this.cameras.main.shake(GAME_CONFIG.shakeDurationMs, GAME_CONFIG.shakeIntensity)
    this.tweens.killTweensOf(this.flash)
    this.flash.setAlpha(GAME_CONFIG.flashAlpha)
    this.tweens.add({ targets: this.flash, alpha: 0, duration: GAME_CONFIG.flashMs })
  }

  private floatingText(x: number, y: number, message: string): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: FONT,
        fontSize: '32px',
        color: '#ffd23f',
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

  private endWave(): void {
    this.phase = 'between'
    const outcome = this.rounds.finishWave(this.waveHits)
    this.time.delayedCall(GAME_CONFIG.waveEndMs, () => this.advance(outcome))
  }

  private advance(outcome: WaveOutcome): void {
    if (outcome === 'next-wave') {
      this.startWave()
      return
    }
    if (outcome === 'round-cleared') {
      this.scoring.addBonus(GAME_CONFIG.roundClearBonus)
      this.hud.setScore(this.scoring.score)
      this.hud.showBanner(`Round cleared! +${GAME_CONFIG.roundClearBonus}`, GAME_CONFIG.introMs)
      this.time.delayedCall(GAME_CONFIG.introMs, () => {
        this.rounds.nextRound()
        this.startRound()
      })
      return
    }
    this.phase = 'over'
    this.hud.showBanner('Too many ducks escaped', GAME_CONFIG.introMs)
    this.time.delayedCall(GAME_CONFIG.introMs, () => this.finish())
  }

  private finish(): void {
    const data: GameOverData = {
      score: this.scoring.score,
      round: this.rounds.round,
      newRecord: this.services.highScore.submit(this.scoring.score),
    }
    this.scene.start(SCENE_KEYS.gameOver, data)
  }
}

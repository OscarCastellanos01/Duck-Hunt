import Phaser from 'phaser'
import { FX_CONFIG, GAME_CONFIG } from '@/core/config'
import { Crosshair } from '@/game/entities/Crosshair'
import { SCENE_KEYS } from '@/game/scenes/keys'
import { getServices, type Services } from '@/game/services'
import { UI_DEPTH, createBackdrop } from '@/game/ui/Backdrop'
import { Button, ButtonGroup } from '@/game/ui/Button'

type Step = 'intro' | 'starting' | 'ready' | 'error'

const FONT = 'system-ui, sans-serif'
const TARGET_X = GAME_CONFIG.width / 2
const TARGET_Y = 300
const TARGET_RADIUS = 55
const TARGET_COLOR = 0xff5252
const TARGET_HIT_COLOR = 0x6fe37a
const TARGET_FLASH_MS = 200
const HAND_TIMEOUT_MS = 400
const BUTTON_Y = 405
const PRIMARY_BUTTON_X = 340
const SECONDARY_BUTTON_X = 620
const BUTTON_WIDTH = 240
const BUTTON_HEIGHT = 56

const INTRO_TEXT = [
  'The game uses your camera to track your hand.',
  'Your browser will ask for permission when you continue.',
  'Video is processed on this device only.',
  'Nothing is recorded or uploaded.',
  '',
  'Tip: use a well lit room and keep your hand inside the frame.',
].join('\n')

const LIGHT_HINT = 'Make sure the room is well lit.'
const READY_HINT = 'Point with your index finger to aim and drop your thumb to shoot the target.'

export class CalibrationScene extends Phaser.Scene {
  private services!: Services
  private step: Step = 'intro'
  private message!: Phaser.GameObjects.Text
  private handStatus!: Phaser.GameObjects.Text
  private shotStatus!: Phaser.GameObjects.Text
  private hint!: Phaser.GameObjects.Text
  private target!: Phaser.GameObjects.Arc
  private enableButton!: Button
  private startButton!: Button
  private lastAimAt = Number.NEGATIVE_INFINITY
  private lastDetectedAt = 0
  private shots = 0
  private hits = 0

  constructor() {
    super(SCENE_KEYS.calibration)
  }

  create(): void {
    this.services = getServices(this)
    this.shots = 0
    this.hits = 0
    this.lastAimAt = Number.NEGATIVE_INFINITY
    this.lastDetectedAt = performance.now()
    const centerX = GAME_CONFIG.width / 2
    const style = {
      fontFamily: FONT,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    }

    createBackdrop(this)
    this.add.rectangle(centerX, 288, 800, 384, 0x000000, 0.55).setDepth(UI_DEPTH - 1)
    this.add
      .text(centerX, 50, 'Camera setup', { ...style, fontSize: '48px', strokeThickness: 6 })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    this.message = this.add
      .text(centerX, 250, '', { ...style, fontSize: '22px' })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    this.handStatus = this.add
      .text(centerX, 130, '', { ...style, fontSize: '26px' })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    this.shotStatus = this.add
      .text(centerX, 168, '', { ...style, fontSize: '26px' })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    this.hint = this.add
      .text(centerX, 212, READY_HINT, { ...style, fontSize: '18px' })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    this.target = this.add
      .circle(TARGET_X, TARGET_Y, TARGET_RADIUS, TARGET_COLOR)
      .setStrokeStyle(6, 0xffffff)
      .setDepth(UI_DEPTH)

    const buttons = new ButtonGroup(this, this.services.bus)
    this.enableButton = new Button(
      this,
      PRIMARY_BUTTON_X,
      BUTTON_Y,
      'Enable camera',
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      () => void this.startCamera(),
    )
    this.startButton = new Button(
      this,
      PRIMARY_BUTTON_X,
      BUTTON_Y,
      'Start game',
      BUTTON_WIDTH,
      BUTTON_HEIGHT,
      () => {
        this.services.settings.update({ inputMode: 'camera' })
        this.scene.start(SCENE_KEYS.game)
      },
    )
    buttons.add(this.enableButton)
    buttons.add(this.startButton)
    buttons.add(
      new Button(
        this,
        SECONDARY_BUTTON_X,
        BUTTON_Y,
        'Back',
        BUTTON_WIDTH,
        BUTTON_HEIGHT,
        () => void this.goBack(),
      ),
    )

    const { bus } = this.services
    const offAim = bus.on('aim', () => {
      this.lastAimAt = performance.now()
    })
    const offShoot = bus.on('shoot', ({ x, y }) => this.onShoot(x, y))
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offAim()
      offShoot()
    })

    new Crosshair(this, bus)
    this.setStep(this.services.input.mode === 'camera' ? 'ready' : 'intro')
  }

  override update(time: number): void {
    if (this.step !== 'ready') return
    const detected = time - this.lastAimAt < HAND_TIMEOUT_MS
    if (detected) this.lastDetectedAt = time
    const lost = !detected && time - this.lastDetectedAt > FX_CONFIG.lightHintDelayMs
    const waiting = lost
      ? `Hand: show your hand to the camera\n${LIGHT_HINT}`
      : 'Hand: show your hand to the camera'
    this.handStatus.setText(detected ? 'Hand: detected' : waiting)
    this.handStatus.setColor(detected ? '#6fe37a' : '#ffd23f')
  }

  private setStep(step: Step, errorText = ''): void {
    this.step = step
    const ready = step === 'ready'
    this.enableButton.setVisible(step === 'intro' || step === 'error')
    this.enableButton.setLabel(step === 'error' ? 'Try again' : 'Enable camera')
    this.startButton.setVisible(ready)
    this.handStatus.setVisible(ready)
    this.shotStatus.setVisible(ready)
    this.hint.setVisible(ready)
    this.target.setVisible(ready)
    this.message.setVisible(!ready)
    if (step === 'intro') this.message.setText(INTRO_TEXT)
    if (step === 'starting') this.message.setText('Starting camera and loading hand tracking...')
    if (step === 'error') this.message.setText(errorText)
    if (ready) this.updateShotStatus()
  }

  private updateShotStatus(): void {
    this.shotStatus.setText(`Shots: ${this.shots}   Hits: ${this.hits}`)
  }

  private async startCamera(): Promise<void> {
    if (this.step === 'starting') return
    this.setStep('starting')
    try {
      await this.services.input.use('camera')
    } catch (error) {
      this.setStep(
        'error',
        error instanceof Error ? error.message : 'The camera could not be started.',
      )
      return
    }
    this.setStep('ready')
  }

  private async goBack(): Promise<void> {
    if (this.step === 'starting') return
    await this.services.input.use('mouse')
    this.scene.start(SCENE_KEYS.menu)
  }

  private onShoot(nx: number, ny: number): void {
    if (this.step !== 'ready') return
    this.shots += 1
    const x = nx * GAME_CONFIG.width
    const y = ny * GAME_CONFIG.height
    const hit = Math.hypot(x - TARGET_X, y - TARGET_Y) <= TARGET_RADIUS + GAME_CONFIG.aimAssistPx
    if (hit) {
      this.hits += 1
      this.target.setFillStyle(TARGET_HIT_COLOR)
      this.time.delayedCall(TARGET_FLASH_MS, () => this.target.setFillStyle(TARGET_COLOR))
    }
    this.updateShotStatus()
  }
}

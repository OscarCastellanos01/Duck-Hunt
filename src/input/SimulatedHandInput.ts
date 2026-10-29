import type { EventBus } from '@/core/eventBus'
import type { SettingsStore } from '@/core/settings'
import type { FrameTiming, GameEvents } from '@/core/types'
import type { CameraDebug } from '@/debug/CameraDebug'
import { makeHand } from '@/debug/syntheticHand'
import { GestureMachine } from '@/gestures/gestureMachine'
import type { InputProvider } from '@/input/InputProvider'

const FRAME_INTERVAL_MS = 33
const HAND_SIZE = 0.2
const ASPECT = 4 / 3
const INDEX_TIP_OFFSET = { x: -0.3, y: -2 }
const SHOT_PERIOD_MS = 1800
const THUMB_DROP_MS = 90
const THUMB_HOLD_MS = 700
const PATH = {
  centerX: 0.5,
  centerY: 0.4,
  radiusX: 0.3,
  radiusY: 0.18,
  periodX: 1500,
  periodY: 1100,
}

export class SimulatedHandInput implements InputProvider {
  private timer = 0
  private unsubscribe: (() => void) | null = null
  private readonly timing: FrameTiming = { captureTime: 0, inferenceStart: 0, inferenceEnd: 0 }

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly settings: SettingsStore,
    private readonly debug: CameraDebug,
  ) {}

  async start(): Promise<void> {
    const machine = new GestureMachine(this.bus, this.settings.get())
    this.unsubscribe = this.settings.subscribe((next) => machine.configure(next))
    this.debug.attach(null, 'simulated')
    const startedAt = performance.now()
    this.timer = window.setInterval(
      () => this.tick(machine, performance.now(), startedAt),
      FRAME_INTERVAL_MS,
    )
  }

  stop(): void {
    window.clearInterval(this.timer)
    this.unsubscribe?.()
    this.debug.detach()
    this.unsubscribe = null
  }

  private tick(machine: GestureMachine, now: number, startedAt: number): void {
    const elapsed = now - startedAt
    const tipX = PATH.centerX + PATH.radiusX * Math.sin(elapsed / PATH.periodX)
    const tipY = PATH.centerY + PATH.radiusY * Math.sin(elapsed / PATH.periodY + 1)
    const phase = elapsed % SHOT_PERIOD_MS
    const thumbDrop = phase < THUMB_DROP_MS ? phase / THUMB_DROP_MS : phase < THUMB_HOLD_MS ? 1 : 0
    const frame = makeHand({
      x: tipX - (INDEX_TIP_OFFSET.x * HAND_SIZE) / ASPECT,
      y: tipY - INDEX_TIP_OFFSET.y * HAND_SIZE,
      size: HAND_SIZE,
      aspect: ASPECT,
      t: now,
      thumbDrop,
    })
    this.timing.captureTime = now
    this.timing.inferenceStart = now
    this.timing.inferenceEnd = now
    machine.update(frame, now)
    this.debug.handleFrame(frame, this.timing, machine.state)
  }
}

import type { EventBus } from '@/core/eventBus'
import type { SettingsStore } from '@/core/settings'
import type { FrameTiming, GameEvents, HandFrame } from '@/core/types'
import type { CameraDebug } from '@/debug/CameraDebug'
import { GestureMachine } from '@/gestures/gestureMachine'
import { CameraInput } from '@/input/CameraInput'
import { HandTracker } from '@/input/HandTracker'
import type { InputProvider } from '@/input/InputProvider'

export class ModelLoadError extends Error {
  constructor() {
    super('The hand tracking model could not be loaded. Run "pnpm setup:mediapipe" first.')
    this.name = 'ModelLoadError'
  }
}

export class GestureInput implements InputProvider {
  private tracker: HandTracker | null = null
  private camera: CameraInput | null = null
  private unsubscribe: (() => void) | null = null
  private activeDeviceId: string | null = null

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly settings: SettingsStore,
    private readonly debug: CameraDebug,
  ) {}

  async start(): Promise<void> {
    try {
      this.tracker = await HandTracker.create()
    } catch {
      throw new ModelLoadError()
    }
    const machine = new GestureMachine(this.bus, this.settings.get())
    const camera = new CameraInput(
      this.tracker,
      (frame, timing) => this.onFrame(machine, frame, timing),
      this.settings.get().cameraId,
    )
    await camera.start()
    this.camera = camera
    this.activeDeviceId = this.settings.get().cameraId
    this.unsubscribe = this.settings.subscribe((next) => {
      machine.configure(next)
      if (next.cameraId !== this.activeDeviceId) void this.switchCamera(camera, next.cameraId)
    })
    this.debug.attach(camera.video, this.tracker.delegate)
  }

  stop(): void {
    this.unsubscribe?.()
    this.camera?.stop()
    this.tracker?.close()
    this.debug.detach()
    this.unsubscribe = null
    this.camera = null
    this.tracker = null
  }

  private async switchCamera(camera: CameraInput, deviceId: string | null): Promise<void> {
    this.activeDeviceId = deviceId
    camera.stop()
    camera.setDevice(deviceId)
    try {
      await camera.start()
    } catch {
      camera.setDevice(null)
      await camera.start().catch(() => undefined)
    }
  }

  private onFrame(machine: GestureMachine, frame: HandFrame | null, timing: FrameTiming): void {
    machine.update(frame, performance.now())
    this.debug.handleFrame(frame, timing, machine.state)
  }
}

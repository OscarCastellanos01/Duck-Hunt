import { DEBUG_CONFIG } from '@/core/config'
import type { EventBus } from '@/core/eventBus'
import type { SettingsStore } from '@/core/settings'
import type { FrameTiming, GameEvents, GestureMode, HandFrame, Pose } from '@/core/types'
import { DebugOverlay } from '@/debug/DebugOverlay'
import { FixtureRecorder, downloadJson } from '@/debug/FixtureRecorder'
import { LandmarkRenderer } from '@/debug/LandmarkRenderer'
import { GestureMachine } from '@/gestures/gestureMachine'
import { thumbSpread } from '@/gestures/handGeometry'
import { CameraError, CameraInput } from '@/input/CameraInput'
import { HandTracker } from '@/input/HandTracker'

const SHOT_FLASH_MS = 120
const GESTURE_MODE_LABELS: Record<GestureMode, string> = {
  thumb: 'Thumb drop',
  recoil: 'Recoil',
  both: 'Both',
}

const create = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (text) element.textContent = text
  return element
}

const createToggle = (label: string, checked: boolean, onChange: (value: boolean) => void) => {
  const wrapper = create('label', 'toggle')
  const input = create('input')
  input.type = 'checkbox'
  input.checked = checked
  input.addEventListener('change', () => onChange(input.checked))
  wrapper.append(input, document.createTextNode(label))
  return wrapper
}

export class PrototypeApp {
  private readonly machine: GestureMachine
  private readonly overlay: DebugOverlay
  private readonly recorder = new FixtureRecorder(DEBUG_CONFIG.fixtureDurationMs)
  private readonly renderer: LandmarkRenderer
  private readonly canvas = create('canvas', 'landmarks')
  private readonly crosshair = create('div', 'crosshair')
  private readonly arena = create('div', 'arena')
  private readonly status = create('p', 'status', 'Press start to enable the camera.')
  private readonly shotCounter = create('p', 'shots', 'Shots: 0')
  private readonly preview = create('div', 'preview')
  private readonly deviceSelect = create('select')
  private readonly startButton = create('button', undefined, 'Start camera')
  private camera: CameraInput | null = null
  private tracker: HandTracker | null = null
  private shots = 0
  private thumb = 0
  private pose: Pose = 'none'
  private tracking = false
  private lastTiming: FrameTiming | null = null

  constructor(
    private readonly root: HTMLElement,
    private readonly bus: EventBus<GameEvents>,
    private readonly settings: SettingsStore,
  ) {
    this.machine = new GestureMachine(bus, settings.get())
    this.overlay = new DebugOverlay(() => this.startRecording())
    this.renderer = new LandmarkRenderer(this.canvas)
  }

  mount(): void {
    const current = this.settings.get()
    const title = create('h1', undefined, 'duck-gesture')
    const privacy = create(
      'p',
      'privacy',
      'Camera video is processed on this device only. Nothing is recorded or uploaded.',
    )
    this.startButton.type = 'button'
    this.startButton.addEventListener('click', () => void this.start())

    const modeSelect = create('select')
    for (const mode of Object.keys(GESTURE_MODE_LABELS) as GestureMode[]) {
      const option = create('option', undefined, GESTURE_MODE_LABELS[mode])
      option.value = mode
      modeSelect.append(option)
    }
    modeSelect.value = current.gestureMode
    modeSelect.addEventListener('change', () =>
      this.settings.update({ gestureMode: modeSelect.value as GestureMode }),
    )
    const modeLabel = create('label', 'toggle', 'Shoot gesture ')
    modeLabel.append(modeSelect)

    this.deviceSelect.hidden = true
    this.deviceSelect.addEventListener('change', () => void this.switchDevice())

    const controls = create('div', 'controls')
    controls.append(
      this.startButton,
      modeLabel,
      createToggle('Mirror', current.mirror, (mirror) => this.settings.update({ mirror })),
      createToggle('Camera preview', current.showPreview, (showPreview) =>
        this.settings.update({ showPreview }),
      ),
      createToggle('Debug overlay', current.showDebug, (showDebug) =>
        this.settings.update({ showDebug }),
      ),
      this.deviceSelect,
    )

    this.preview.append(this.canvas)
    this.arena.append(this.crosshair, this.shotCounter)
    const stage = create('div', 'stage')
    stage.append(this.preview, this.arena)
    this.root.append(title, privacy, controls, this.status, stage, this.overlay.element)

    this.bus.on('aim', (event) => {
      this.crosshair.style.transform = `translate(${event.x * this.arena.clientWidth}px, ${event.y * this.arena.clientHeight}px)`
    })
    this.bus.on('shoot', () => this.onShoot())
    this.bus.on('poseChanged', ({ pose }) => {
      this.pose = pose
    })
    this.bus.on('trackingLost', () => {
      this.tracking = false
      this.status.textContent = 'Hand lost. Show your hand to the camera.'
    })
    this.bus.on('trackingFound', () => {
      this.tracking = true
      this.status.textContent = 'Hand detected.'
    })

    this.settings.subscribe((next) => this.applySettings(next))
    this.applySettings(current)
  }

  private applySettings(next = this.settings.get()): void {
    this.machine.configure(next)
    this.preview.hidden = !next.showPreview
    this.preview.classList.toggle('mirrored', next.mirror)
    this.overlay.setVisible(next.showDebug)
  }

  private async start(): Promise<void> {
    this.startButton.disabled = true
    this.status.textContent = 'Loading hand tracking model...'
    try {
      this.tracker = await HandTracker.create()
    } catch {
      this.fail('The hand tracking model could not be loaded. Run "pnpm setup:mediapipe" first.')
      return
    }
    const camera = new CameraInput(
      this.tracker,
      (frame, timing) => this.onFrame(frame, timing),
      this.settings.get().cameraId,
    )
    try {
      await camera.start()
    } catch (error) {
      this.fail(error instanceof CameraError ? error.message : 'The camera could not be started.')
      return
    }
    this.camera = camera
    this.preview.prepend(camera.video)
    this.status.textContent = 'Show your hand to the camera.'
    await this.populateDevices()
  }

  private fail(message: string): void {
    this.status.textContent = message
    this.startButton.disabled = false
  }

  private async populateDevices(): Promise<void> {
    const devices = await CameraInput.listDevices()
    if (devices.length < 2) return
    this.deviceSelect.replaceChildren(
      ...devices.map((device, index) => {
        const option = create('option', undefined, device.label || `Camera ${index + 1}`)
        option.value = device.deviceId
        return option
      }),
    )
    const saved = this.settings.get().cameraId
    if (saved) this.deviceSelect.value = saved
    this.deviceSelect.hidden = false
  }

  private async switchDevice(): Promise<void> {
    const camera = this.camera
    if (!camera) return
    this.settings.update({ cameraId: this.deviceSelect.value })
    camera.stop()
    camera.setDevice(this.deviceSelect.value)
    try {
      await camera.start()
    } catch (error) {
      this.status.textContent =
        error instanceof CameraError ? error.message : 'The camera could not be started.'
    }
  }

  private onFrame(frame: HandFrame | null, timing: FrameTiming): void {
    this.lastTiming = timing
    const now = performance.now()
    this.overlay.recordFrame(timing)
    this.machine.update(frame, now)

    const video = this.camera?.video
    if (video && video.videoWidth > 0) this.renderer.resize(video.videoWidth, video.videoHeight)
    if (this.settings.get().showPreview) this.renderer.draw(frame)

    this.thumb = frame ? thumbSpread(frame) : 0
    const recorded = this.recorder.push(frame, now)
    if (recorded) {
      this.overlay.setRecording(false)
      downloadJson(`landmarks-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, recorded)
    }
    this.overlay.render(now, {
      delegate: this.tracker?.delegate ?? '-',
      pose: this.pose,
      state: this.machine.state,
      tracking: this.tracking,
      thumbSpread: this.thumb,
    })
  }

  private onShoot(): void {
    this.shots += 1
    this.shotCounter.textContent = `Shots: ${this.shots}`
    if (this.lastTiming) {
      this.overlay.recordShot(performance.now() - this.lastTiming.captureTime)
    }
    this.arena.classList.add('flash')
    window.setTimeout(() => this.arena.classList.remove('flash'), SHOT_FLASH_MS)
  }

  private startRecording(): void {
    this.recorder.start(performance.now())
    this.overlay.setRecording(true)
  }
}

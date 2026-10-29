import { DEBUG_CONFIG } from '@/core/config'
import type { EventBus } from '@/core/eventBus'
import type { SettingsStore } from '@/core/settings'
import type { FrameTiming, GameEvents, HandFrame, Pose } from '@/core/types'
import { DebugOverlay } from '@/debug/DebugOverlay'
import { FixtureRecorder, downloadJson } from '@/debug/FixtureRecorder'
import { LandmarkRenderer } from '@/debug/LandmarkRenderer'
import type { GestureState } from '@/gestures/gestureMachine'
import { computePoseMetrics, createPoseMetrics } from '@/gestures/poseDetector'

const TOGGLE_DEBUG_KEY = 'd'
const TOGGLE_PREVIEW_KEY = 'p'

export class CameraDebug {
  private readonly overlay: DebugOverlay
  private readonly recorder = new FixtureRecorder(DEBUG_CONFIG.fixtureDurationMs)
  private readonly previewBox = document.createElement('div')
  private readonly canvas = document.createElement('canvas')
  private readonly renderer: LandmarkRenderer
  private video: HTMLVideoElement | null = null
  private delegate = '-'
  private pose: Pose = 'none'
  private tracking = false
  private lastTiming: FrameTiming | null = null
  private readonly metrics = createPoseMetrics()

  constructor(
    root: HTMLElement,
    bus: EventBus<GameEvents>,
    private readonly settings: SettingsStore,
  ) {
    this.overlay = new DebugOverlay(() => this.startRecording())
    this.renderer = new LandmarkRenderer(this.canvas)
    this.previewBox.className = 'camera-preview'
    this.previewBox.hidden = true
    this.previewBox.append(this.canvas)
    root.append(this.previewBox, this.overlay.element)

    bus.on('poseChanged', ({ pose }) => {
      this.pose = pose
    })
    bus.on('trackingLost', () => {
      this.tracking = false
    })
    bus.on('trackingFound', () => {
      this.tracking = true
    })
    bus.on('shoot', () => {
      if (this.lastTiming) {
        this.overlay.recordShot(performance.now() - this.lastTiming.captureTime)
      }
    })

    window.addEventListener('keydown', this.onKey)
    settings.subscribe(() => this.applySettings())
    this.applySettings()
  }

  attach(video: HTMLVideoElement, delegate: string): void {
    this.video = video
    this.delegate = delegate
    this.previewBox.prepend(video)
    this.applySettings()
  }

  detach(): void {
    this.video?.remove()
    this.video = null
    this.renderer.clear()
    this.pose = 'none'
    this.tracking = false
    this.applySettings()
  }

  handleFrame(frame: HandFrame | null, timing: FrameTiming, state: GestureState): void {
    this.lastTiming = timing
    const now = performance.now()
    this.overlay.recordFrame(timing)

    const { video } = this
    if (video && video.videoWidth > 0) this.renderer.resize(video.videoWidth, video.videoHeight)
    if (this.settings.get().showPreview) this.renderer.draw(frame)

    const recorded = this.recorder.push(frame, now)
    if (recorded) {
      this.overlay.setRecording(false)
      downloadJson(`landmarks-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, recorded)
    }
    this.overlay.render(now, {
      delegate: this.delegate,
      pose: this.pose,
      state,
      tracking: this.tracking,
      metrics: frame ? computePoseMetrics(frame, this.metrics) : this.metrics,
    })
  }

  private applySettings(): void {
    const { showPreview, showDebug, mirror } = this.settings.get()
    this.previewBox.hidden = !(this.video && showPreview)
    this.previewBox.classList.toggle('mirrored', mirror)
    this.overlay.setVisible(showDebug)
  }

  private startRecording(): void {
    this.recorder.start(performance.now())
    this.overlay.setRecording(true)
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    const key = event.key.toLowerCase()
    if (key === TOGGLE_DEBUG_KEY) {
      this.settings.update({ showDebug: !this.settings.get().showDebug })
    } else if (key === TOGGLE_PREVIEW_KEY) {
      this.settings.update({ showPreview: !this.settings.get().showPreview })
    }
  }
}

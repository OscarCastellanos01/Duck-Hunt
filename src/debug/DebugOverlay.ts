import { DEBUG_CONFIG } from '@/core/config'
import type { FrameTiming, Pose } from '@/core/types'
import { FpsCounter, RollingStats } from '@/debug/metrics'
import type { GestureState } from '@/gestures/gestureMachine'

export interface OverlayInfo {
  delegate: string
  pose: Pose
  state: GestureState
  tracking: boolean
  thumbSpread: number
}

const P95 = 0.95

export class DebugOverlay {
  readonly element = document.createElement('div')
  private readonly output = document.createElement('pre')
  private readonly recordButton = document.createElement('button')
  private readonly fps = new FpsCounter(DEBUG_CONFIG.statsWindow)
  private readonly inference = new RollingStats(DEBUG_CONFIG.statsWindow)
  private readonly captureLatency = new RollingStats(DEBUG_CONFIG.statsWindow)
  private readonly shotLatency = new RollingStats(DEBUG_CONFIG.statsWindow)
  private lastRender = 0

  constructor(onRecord: () => void) {
    this.element.className = 'debug-overlay'
    this.recordButton.type = 'button'
    this.recordButton.textContent = 'Record 3 s of landmarks'
    this.recordButton.addEventListener('click', onRecord)
    this.element.append(this.output, this.recordButton)
  }

  setRecording(active: boolean): void {
    this.recordButton.disabled = active
    this.recordButton.textContent = active ? 'Recording...' : 'Record 3 s of landmarks'
  }

  setVisible(visible: boolean): void {
    this.element.hidden = !visible
  }

  recordFrame(timing: FrameTiming): void {
    this.fps.tick(timing.inferenceEnd)
    this.inference.add(timing.inferenceEnd - timing.inferenceStart)
    this.captureLatency.add(Math.max(0, timing.inferenceEnd - timing.captureTime))
  }

  recordShot(latencyMs: number): void {
    this.shotLatency.add(Math.max(0, latencyMs))
  }

  render(now: number, info: OverlayInfo): void {
    if (now - this.lastRender < DEBUG_CONFIG.overlayRefreshMs) return
    this.lastRender = now
    this.output.textContent = [
      `Inference fps: ${this.fps.fps().toFixed(1)}`,
      `Inference ms: ${this.formatStats(this.inference)}`,
      `Capture to inference ms: ${this.formatStats(this.captureLatency)}`,
      `Capture to shoot ms: ${this.formatStats(this.shotLatency)}`,
      `Delegate: ${info.delegate}`,
      `Tracking: ${info.tracking ? 'yes' : 'no'}`,
      `Pose / state: ${info.pose} / ${info.state}`,
      `Thumb spread: ${info.thumbSpread.toFixed(2)}`,
    ].join('\n')
  }

  private formatStats(stats: RollingStats): string {
    if (stats.size === 0) return '-'
    return `${stats.mean().toFixed(1)} (p95 ${stats.percentile(P95).toFixed(1)})`
  }
}

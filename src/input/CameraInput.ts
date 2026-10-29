import { CAMERA_CONSTRAINTS } from '@/core/config'
import type { FrameTiming, HandFrame } from '@/core/types'
import type { HandTracker } from '@/input/HandTracker'
import type { InputProvider } from '@/input/InputProvider'

export type CameraErrorKind = 'denied' | 'not-found' | 'busy' | 'insecure' | 'unknown'

const CAMERA_ERROR_MESSAGES: Record<CameraErrorKind, string> = {
  denied: 'Camera permission was denied. Allow camera access in the browser and try again.',
  'not-found': 'No camera was found on this device.',
  busy: 'The camera is in use by another application or could not be started.',
  insecure: 'Camera access requires HTTPS or localhost.',
  unknown: 'The camera could not be started.',
}

export class CameraError extends Error {
  constructor(readonly kind: CameraErrorKind) {
    super(CAMERA_ERROR_MESSAGES[kind])
    this.name = 'CameraError'
  }
}

const classifyError = (error: unknown): CameraErrorKind => {
  if (!window.isSecureContext) return 'insecure'
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'not-found'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'unknown'
}

export type FrameHandler = (frame: HandFrame | null, timing: FrameTiming) => void

export class CameraInput implements InputProvider {
  readonly video = document.createElement('video')
  private stream: MediaStream | null = null
  private running = false
  private videoCallbackId = 0
  private rafId = 0
  private lastVideoTime = -1
  private readonly timing: FrameTiming = { captureTime: 0, inferenceStart: 0, inferenceEnd: 0 }

  constructor(
    private readonly tracker: HandTracker,
    private readonly onFrame: FrameHandler,
    private deviceId: string | null = null,
  ) {
    this.video.playsInline = true
    this.video.muted = true
  }

  static async listDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter((device) => device.kind === 'videoinput')
  }

  setDevice(deviceId: string | null): void {
    this.deviceId = deviceId
  }

  async start(): Promise<void> {
    if (this.running) return
    if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('insecure')
    try {
      this.stream = await this.openStream()
      this.video.srcObject = this.stream
      await this.video.play()
    } catch (error) {
      this.releaseStream()
      throw new CameraError(classifyError(error))
    }
    this.running = true
    this.lastVideoTime = -1
    this.schedule()
  }

  private async openStream(): Promise<MediaStream> {
    const open = (deviceId: string | null) =>
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: CAMERA_CONSTRAINTS.width },
          height: { ideal: CAMERA_CONSTRAINTS.height },
          frameRate: { ideal: CAMERA_CONSTRAINTS.frameRate },
        },
      })
    try {
      return await open(this.deviceId)
    } catch (error) {
      if (this.deviceId && error instanceof DOMException && error.name === 'OverconstrainedError') {
        return open(null)
      }
      throw error
    }
  }

  stop(): void {
    this.running = false
    if (this.videoCallbackId) this.video.cancelVideoFrameCallback(this.videoCallbackId)
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.videoCallbackId = 0
    this.rafId = 0
    this.releaseStream()
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.video.srcObject = null
  }

  private schedule(): void {
    if ('requestVideoFrameCallback' in this.video) {
      this.videoCallbackId = this.video.requestVideoFrameCallback(this.onVideoFrame)
    } else {
      this.rafId = requestAnimationFrame(this.onAnimationFrame)
    }
  }

  private readonly onVideoFrame: VideoFrameRequestCallback = (now, metadata) => {
    if (!this.running) return
    this.process(now, metadata.captureTime ?? now)
    this.schedule()
  }

  private readonly onAnimationFrame = (now: number): void => {
    if (!this.running) return
    if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime
      this.process(now, now)
    }
    this.schedule()
  }

  private process(frameTime: number, captureTime: number): void {
    this.timing.captureTime = captureTime
    this.timing.inferenceStart = performance.now()
    const frame = this.tracker.detect(this.video, frameTime)
    this.timing.inferenceEnd = performance.now()
    this.onFrame(frame, this.timing)
  }
}

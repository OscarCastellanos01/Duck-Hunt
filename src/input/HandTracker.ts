import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { MEDIAPIPE_CONFIG } from '@/core/config'
import type { HandFrame } from '@/core/types'
import { LANDMARK_COUNT } from '@/gestures/handGeometry'

export type TrackerDelegate = 'GPU' | 'CPU'

export class HandTracker {
  private readonly frame: HandFrame = {
    landmarks: Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0, z: 0 })),
    t: 0,
    aspect: 1,
  }
  private lastTimestamp = -1

  private constructor(
    private readonly landmarker: HandLandmarker,
    readonly delegate: TrackerDelegate,
  ) {}

  static async create(): Promise<HandTracker> {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_CONFIG.wasmPath)
    const build = (delegate: TrackerDelegate) =>
      HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MEDIAPIPE_CONFIG.modelPath, delegate },
        runningMode: 'VIDEO',
        numHands: MEDIAPIPE_CONFIG.numHands,
        minHandDetectionConfidence: MEDIAPIPE_CONFIG.minDetectionConfidence,
        minHandPresenceConfidence: MEDIAPIPE_CONFIG.minDetectionConfidence,
        minTrackingConfidence: MEDIAPIPE_CONFIG.minTrackingConfidence,
      })
    try {
      return new HandTracker(await build('GPU'), 'GPU')
    } catch {
      return new HandTracker(await build('CPU'), 'CPU')
    }
  }

  detect(video: HTMLVideoElement, timestampMs: number): HandFrame | null {
    const timestamp = timestampMs > this.lastTimestamp ? timestampMs : this.lastTimestamp + 1
    this.lastTimestamp = timestamp
    const result = this.landmarker.detectForVideo(video, timestamp)
    const detected = result.landmarks[0]
    if (!detected || video.videoHeight === 0) return null
    for (let i = 0; i < LANDMARK_COUNT; i++) {
      const source = detected[i]
      const target = this.frame.landmarks[i]
      if (!source || !target) return null
      target.x = source.x
      target.y = source.y
      target.z = source.z
    }
    this.frame.t = timestamp
    this.frame.aspect = video.videoWidth / video.videoHeight
    return this.frame
  }

  close(): void {
    this.landmarker.close()
  }
}

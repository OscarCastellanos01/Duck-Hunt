import { TRACKING_FREEZE_MS } from '@/core/config'
import type { EventBus } from '@/core/eventBus'
import type {
  AimEvent,
  AimPoint,
  GameEvents,
  HandFrame,
  Pose,
  Settings,
  ShootEvent,
} from '@/core/types'
import { LM, mapAimPoint } from '@/gestures/handGeometry'
import { OneEuroFilter } from '@/gestures/oneEuroFilter'
import { PoseDetector } from '@/gestures/poseDetector'
import { type GestureSample, type ShootDetector, createDetector } from '@/gestures/shootDetectors'

export type GestureState = 'idle' | 'gun' | 'cooldown'

export type GestureSettings = Pick<
  Settings,
  'gestureMode' | 'thumbSensitivity' | 'recoilSensitivity' | 'cooldownMs' | 'mirror' | 'oneEuro'
>

export class GestureMachine {
  private currentState: GestureState = 'idle'
  private readonly poseDetector = new PoseDetector()
  private detector: ShootDetector
  private detectorKey: string
  private readonly filterX: OneEuroFilter
  private readonly filterY: OneEuroFilter
  private readonly mapped: AimPoint = { x: 0, y: 0 }
  private readonly aim: AimPoint = { x: 0, y: 0 }
  private readonly aimEvent: AimEvent = { x: 0, y: 0, t: 0 }
  private readonly shot: ShootEvent = { x: 0, y: 0, t: 0 }
  private readonly sample: GestureSample
  private tracking = false
  private lostAt: number | null = null
  private cooldownUntil = 0
  private lastPose: Pose = 'none'

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private settings: GestureSettings,
  ) {
    this.filterX = new OneEuroFilter(settings.oneEuro)
    this.filterY = new OneEuroFilter(settings.oneEuro)
    this.detectorKey = detectorKeyOf(settings)
    this.detector = createDetector(
      settings.gestureMode,
      settings.thumbSensitivity,
      settings.recoilSensitivity,
    )
    this.sample = {
      frame: { landmarks: [], t: 0, aspect: 1 },
      aim: this.aim,
      poseActive: false,
    }
  }

  get state(): GestureState {
    return this.currentState
  }

  configure(settings: GestureSettings): void {
    this.settings = settings
    this.filterX.setParams(settings.oneEuro)
    this.filterY.setParams(settings.oneEuro)
    const key = detectorKeyOf(settings)
    if (key === this.detectorKey) return
    this.detectorKey = key
    this.detector = createDetector(
      settings.gestureMode,
      settings.thumbSensitivity,
      settings.recoilSensitivity,
    )
  }

  update(frame: HandFrame | null, now: number): void {
    if (!frame) {
      this.handleMissing(now)
      return
    }
    const tip = frame.landmarks[LM.indexTip]
    if (!tip) {
      this.handleMissing(now)
      return
    }
    this.handleFound(now)

    mapAimPoint(tip.x, tip.y, this.settings.mirror, this.mapped)
    this.aim.x = this.filterX.filter(this.mapped.x, frame.t)
    this.aim.y = this.filterY.filter(this.mapped.y, frame.t)
    this.aimEvent.x = this.aim.x
    this.aimEvent.y = this.aim.y
    this.aimEvent.t = frame.t
    this.bus.emit('aim', this.aimEvent)

    const pose = this.poseDetector.update(frame)
    this.publishPose(pose)

    const poseActive = pose === 'gun'
    this.sample.frame = frame
    this.sample.poseActive = poseActive
    const fired = this.detector.update(this.sample, this.shot)

    if (frame.t < this.cooldownUntil) {
      this.currentState = 'cooldown'
      return
    }
    this.currentState = poseActive ? 'gun' : 'idle'
    if (!fired) return
    this.cooldownUntil = frame.t + this.settings.cooldownMs
    this.currentState = 'cooldown'
    this.bus.emit('shoot', { x: this.shot.x, y: this.shot.y, t: this.shot.t })
  }

  private handleFound(now: number): void {
    if (this.tracking) return
    this.tracking = true
    if (this.lostAt !== null && now - this.lostAt > TRACKING_FREEZE_MS) {
      this.filterX.reset()
      this.filterY.reset()
    }
    this.lostAt = null
    this.bus.emit('trackingFound', undefined)
  }

  private handleMissing(now: number): void {
    if (!this.tracking) return
    this.tracking = false
    this.lostAt = now
    this.poseDetector.reset()
    this.detector.reset()
    this.currentState = 'idle'
    this.publishPose('none')
    this.bus.emit('trackingLost', undefined)
  }

  private publishPose(pose: Pose): void {
    if (pose === this.lastPose) return
    this.lastPose = pose
    this.bus.emit('poseChanged', { pose })
  }
}

const detectorKeyOf = (s: GestureSettings): string =>
  `${s.gestureMode}:${s.thumbSensitivity}:${s.recoilSensitivity}`

export interface Landmark {
  x: number
  y: number
  z: number
}

export interface HandFrame {
  landmarks: Landmark[]
  t: number
}

export type Pose = 'none' | 'gun'

export interface AimEvent {
  x: number
  y: number
  t: number
}

export interface ShootEvent {
  x: number
  y: number
  t: number
}

export interface PoseChangedEvent {
  pose: Pose
}

export interface GameEvents {
  aim: AimEvent
  shoot: ShootEvent
  poseChanged: PoseChangedEvent
  trackingLost: undefined
  trackingFound: undefined
}

export type GestureMode = 'thumb' | 'recoil' | 'both'

export type InputMode = 'camera' | 'mouse'

export type SmoothingPreset = 'precise' | 'balanced' | 'smooth'

export interface OneEuroParams {
  minCutoff: number
  beta: number
  dCutoff: number
}

export interface Settings {
  gestureMode: GestureMode
  thumbSensitivity: number
  recoilSensitivity: number
  cooldownMs: number
  smoothingPreset: SmoothingPreset
  oneEuro: OneEuroParams
  mirror: boolean
  cameraId: string | null
  showPreview: boolean
  showDebug: boolean
  inputMode: InputMode
  musicVolume: number
  sfxVolume: number
}

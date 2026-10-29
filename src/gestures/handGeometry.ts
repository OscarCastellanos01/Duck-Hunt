import { AIM_REGION } from '@/core/config'
import type { AimPoint, HandFrame, Landmark } from '@/core/types'

export const LM = {
  wrist: 0,
  thumbCmc: 1,
  thumbMcp: 2,
  thumbIp: 3,
  thumbTip: 4,
  indexMcp: 5,
  indexPip: 6,
  indexDip: 7,
  indexTip: 8,
  middleMcp: 9,
  middlePip: 10,
  middleDip: 11,
  middleTip: 12,
  ringMcp: 13,
  ringPip: 14,
  ringDip: 15,
  ringTip: 16,
  pinkyMcp: 17,
  pinkyPip: 18,
  pinkyDip: 19,
  pinkyTip: 20,
} as const

export const LANDMARK_COUNT = 21

export interface FingerIndices {
  pip: number
  tip: number
}

export const FINGERS = {
  index: { pip: LM.indexPip, tip: LM.indexTip },
  middle: { pip: LM.middlePip, tip: LM.middleTip },
  ring: { pip: LM.ringPip, tip: LM.ringTip },
  pinky: { pip: LM.pinkyPip, tip: LM.pinkyTip },
} as const satisfies Record<string, FingerIndices>

const distanceBetween = (a: Landmark, b: Landmark, aspect: number): number => {
  const dx = (a.x - b.x) * aspect
  const dy = a.y - b.y
  const dz = (a.z - b.z) * aspect
  return Math.hypot(dx, dy, dz)
}

export const landmarkDistance = (frame: HandFrame, i: number, j: number): number => {
  const a = frame.landmarks[i]
  const b = frame.landmarks[j]
  if (!a || !b) return 0
  return distanceBetween(a, b, frame.aspect)
}

export const handSize = (frame: HandFrame): number =>
  landmarkDistance(frame, LM.wrist, LM.middleMcp)

export const normalizedDistance = (frame: HandFrame, i: number, j: number): number => {
  const size = handSize(frame)
  return size > 0 ? landmarkDistance(frame, i, j) / size : 0
}

export const fingerExtension = (frame: HandFrame, finger: FingerIndices): number => {
  const size = handSize(frame)
  if (size <= 0) return 0
  const tip = landmarkDistance(frame, LM.wrist, finger.tip)
  const pip = landmarkDistance(frame, LM.wrist, finger.pip)
  return (tip - pip) / size
}

export const thumbSpread = (frame: HandFrame): number =>
  normalizedDistance(frame, LM.thumbTip, LM.middleMcp)

export const mapAimPoint = (x: number, y: number, mirror: boolean, out: AimPoint): AimPoint => {
  const sourceX = mirror ? 1 - x : x
  const rangeX = AIM_REGION.maxX - AIM_REGION.minX
  const rangeY = AIM_REGION.maxY - AIM_REGION.minY
  out.x = clamp01((sourceX - AIM_REGION.minX) / rangeX)
  out.y = clamp01((y - AIM_REGION.minY) / rangeY)
  return out
}

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t

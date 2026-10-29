import type { HandFrame, Landmark } from '@/core/types'

export type FingerState = 'extended' | 'curled'

export interface HandSpec {
  index?: FingerState
  middle?: FingerState
  ring?: FingerState
  pinky?: FingerState
  thumbDrop?: number
  x?: number
  y?: number
  size?: number
  aspect?: number
  t?: number
  noise?: number
}

type Vec = [number, number]

const FINGER_BASES: Record<'index' | 'middle' | 'ring' | 'pinky', Vec> = {
  index: [-0.3, -0.95],
  middle: [0, -1],
  ring: [0.28, -0.95],
  pinky: [0.55, -0.85],
}

const THUMB_CMC: Vec = [-0.35, -0.25]
const THUMB_MCP: Vec = [-0.6, -0.5]
const THUMB_TIP_UP: Vec = [-1.05, -0.7]
const THUMB_TIP_DOWN: Vec = [-0.45, -0.95]

const mix = (a: Vec, b: Vec, t: number): Vec => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

const fingerPoints = (base: Vec, state: FingerState): Vec[] => {
  const [x, y] = base
  if (state === 'extended') {
    return [base, [x, y - 0.5], [x, y - 0.8], [x, y - 1.05]]
  }
  return [base, [x, y - 0.4], [x, y - 0.25], [x, y + 0.35]]
}

let seed = 1
const random = (): number => {
  seed = (seed * 16807) % 2147483647
  return seed / 2147483647 - 0.5
}

export const makeHand = (spec: HandSpec = {}): HandFrame => {
  const {
    index = 'extended',
    middle = 'curled',
    ring = 'curled',
    pinky = 'curled',
    thumbDrop = 0,
    x = 0.5,
    y = 0.8,
    size = 0.2,
    aspect = 4 / 3,
    t = 0,
    noise = 0,
  } = spec

  const thumbTip = mix(THUMB_TIP_UP, THUMB_TIP_DOWN, thumbDrop)
  const points: Vec[] = [
    [0, 0],
    THUMB_CMC,
    THUMB_MCP,
    mix(THUMB_MCP, thumbTip, 0.55),
    thumbTip,
    ...fingerPoints(FINGER_BASES.index, index),
    ...fingerPoints(FINGER_BASES.middle, middle),
    ...fingerPoints(FINGER_BASES.ring, ring),
    ...fingerPoints(FINGER_BASES.pinky, pinky),
  ]

  const landmarks: Landmark[] = points.map(([hx, hy]) => ({
    x: x + ((hx + random() * noise) * size) / aspect,
    y: y + (hy + random() * noise) * size,
    z: 0,
  }))
  return { landmarks, t, aspect }
}

export const openHand = (spec: HandSpec = {}): HandFrame =>
  makeHand({ middle: 'extended', ring: 'extended', pinky: 'extended', ...spec })

export const FRAME_INTERVAL_MS = 16

export const frameTimes = (count: number, start = 0, dt = FRAME_INTERVAL_MS): number[] =>
  Array.from({ length: count }, (_, i) => start + i * dt)

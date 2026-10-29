import type { HandFrame } from '@/core/types'
import { LANDMARK_COUNT } from '@/gestures/handGeometry'

export interface FixtureFrame {
  t: number
  landmarks: [number, number, number][] | null
}

export interface FixtureFile {
  version: 1
  aspect: number
  frames: FixtureFrame[]
}

export interface ReplayStep {
  t: number
  frame: HandFrame | null
}

export const serializeFrame = (frame: HandFrame | null, t: number): FixtureFrame => ({
  t,
  landmarks: frame ? frame.landmarks.map((l) => [l.x, l.y, l.z]) : null,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isLandmarkTuple = (value: unknown): value is [number, number, number] =>
  Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number')

export const parseFixture = (raw: unknown): FixtureFile => {
  if (!isRecord(raw) || raw.version !== 1) throw new Error('Unsupported fixture version')
  const { aspect, frames } = raw
  if (typeof aspect !== 'number' || aspect <= 0 || !Array.isArray(frames)) {
    throw new Error('Malformed fixture')
  }
  const parsed = frames.map((entry): FixtureFrame => {
    if (!isRecord(entry) || typeof entry.t !== 'number') throw new Error('Malformed fixture frame')
    if (entry.landmarks === null) return { t: entry.t, landmarks: null }
    const landmarks = entry.landmarks
    if (!Array.isArray(landmarks) || landmarks.length !== LANDMARK_COUNT) {
      throw new Error('Malformed fixture landmarks')
    }
    if (!landmarks.every(isLandmarkTuple)) throw new Error('Malformed fixture landmarks')
    return { t: entry.t, landmarks }
  })
  return { version: 1, aspect, frames: parsed }
}

export const fixtureToSteps = (fixture: FixtureFile): ReplayStep[] =>
  fixture.frames.map((entry) => ({
    t: entry.t,
    frame: entry.landmarks
      ? {
          t: entry.t,
          aspect: fixture.aspect,
          landmarks: entry.landmarks.map(([x, y, z]) => ({ x, y, z })),
        }
      : null,
  }))

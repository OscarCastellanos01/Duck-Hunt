import { DIFFICULTY_CONFIG, DUCK_TYPES, GAME_CONFIG, type DuckType } from '@/core/config'
import type { Difficulty } from '@/game/systems/difficulty'

export type Rng = () => number

export interface DuckSpec {
  type: DuckType
  x: number
  y: number
  vx: number
  vy: number
  wobbleAmplitude: number
  wobbleFrequency: number
  wobblePhase: number
  turnIntervalMs: number | null
}

const between = (min: number, max: number, rng: Rng): number => min + (max - min) * rng()

export const pickDuckType = (difficulty: Difficulty, rng: Rng): DuckType => {
  const roll = rng()
  if (roll < difficulty.goldenChance) return 'golden'
  if (roll < difficulty.goldenChance + difficulty.fastChance) return 'fast'
  return 'common'
}

export const createDuckSpec = (difficulty: Difficulty, rng: Rng): DuckSpec => {
  const c = DIFFICULTY_CONFIG
  const { playBounds, spawnMargin } = GAME_CONFIG
  const type = pickDuckType(difficulty, rng)
  const speed = difficulty.speed * DUCK_TYPES[type].speed
  const fromLeft = rng() < 0.5
  const launchAngle = between(-c.launchAngleMaxRad, c.launchAngleMaxRad, rng)
  const direction = fromLeft ? 1 : -1
  const unpredictable = difficulty.unpredictability > 0
  return {
    type,
    x: fromLeft ? playBounds.left - spawnMargin : playBounds.right + spawnMargin,
    y: between(playBounds.top + 40, playBounds.bottom - 40, rng),
    vx: direction * speed * Math.cos(launchAngle),
    vy: speed * Math.sin(launchAngle),
    wobbleAmplitude: between(c.wobbleAmplitudeMin, c.wobbleAmplitudeMax, rng),
    wobbleFrequency: between(c.wobbleFrequencyMin, c.wobbleFrequencyMax, rng),
    wobblePhase: between(0, Math.PI * 2, rng),
    turnIntervalMs: unpredictable
      ? c.turnIntervalSlowMs -
        (c.turnIntervalSlowMs - c.turnIntervalFastMs) * difficulty.unpredictability
      : null,
  }
}

import { BULLSEYE_RINGS, DIFFICULTY_CONFIG, POPUP_WEIGHTS, type TargetType } from '@/core/config'
import type { Difficulty } from '@/game/systems/difficulty'

export type Rng = () => number

export const pickLaneTarget = (difficulty: Difficulty, rng: Rng): TargetType => {
  const c = DIFFICULTY_CONFIG
  const roll = rng()
  let threshold = c.goldenChance
  if (roll < threshold) return 'golden'
  threshold += difficulty.decoyChance
  if (roll < threshold) return 'decoy'
  threshold += c.bullseyeChance
  if (roll < threshold) return 'bullseye'
  threshold += c.mallardChance
  if (roll < threshold) return 'mallard'
  return 'duck'
}

export const pickPopupTarget = (rng: Rng): TargetType => {
  const roll = rng()
  let threshold = POPUP_WEIGHTS.golden
  if (roll < threshold) return 'golden'
  threshold += POPUP_WEIGHTS.decoy
  if (roll < threshold) return 'decoy'
  threshold += POPUP_WEIGHTS.bullseye
  if (roll < threshold) return 'bullseye'
  return 'duck'
}

export const bullseyePoints = (distanceRatio: number): number => {
  const ring = BULLSEYE_RINGS.find((r) => distanceRatio <= r.maxRatio)
  return ring?.points ?? BULLSEYE_RINGS[BULLSEYE_RINGS.length - 1]?.points ?? 0
}

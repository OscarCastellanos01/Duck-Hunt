import { DIFFICULTY_CONFIG, GAME_CONFIG } from '@/core/config'

export interface Difficulty {
  progress: number
  speedMultiplier: number
  decoyChance: number
  popupIntervalMs: number
}

const lerp = (from: number, to: number, t: number): number => from + (to - from) * t

export const getDifficulty = (elapsedMs: number): Difficulty => {
  const c = DIFFICULTY_CONFIG
  const progress = Math.min(1, Math.max(0, elapsedMs / GAME_CONFIG.durationMs))
  return {
    progress,
    speedMultiplier: 1 + c.speedGain * progress,
    decoyChance: lerp(c.decoyBase, c.decoyMax, progress),
    popupIntervalMs: lerp(c.popupStartMs, c.popupEndMs, progress),
  }
}

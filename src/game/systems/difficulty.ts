import { DIFFICULTY_CONFIG } from '@/core/config'

export interface Difficulty {
  speed: number
  ducksPerWave: number
  fastChance: number
  goldenChance: number
  waveDurationMs: number
  unpredictability: number
}

export const getDifficulty = (round: number): Difficulty => {
  const c = DIFFICULTY_CONFIG
  const steps = Math.max(0, round - 1)
  let ducksPerWave = 1
  if (round >= c.secondDuckRound) ducksPerWave = 2
  if (round >= c.thirdDuckRound) ducksPerWave = 3
  return {
    speed: c.baseSpeed * Math.min(1 + steps * c.speedPerRound, c.maxSpeedMultiplier),
    ducksPerWave,
    fastChance: Math.min(c.fastChanceBase + steps * c.fastChancePerRound, c.fastChanceMax),
    goldenChance: Math.min(c.goldenChanceBase + steps * c.goldenChancePerRound, c.goldenChanceMax),
    waveDurationMs: Math.max(
      c.waveDurationBaseMs - steps * c.waveDurationPerRoundMs,
      c.waveDurationMinMs,
    ),
    unpredictability: Math.min(steps * c.unpredictabilityPerRound, c.unpredictabilityMax),
  }
}

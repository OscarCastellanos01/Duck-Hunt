import { GAME_CONFIG } from '@/core/config'

export class ScoreKeeper {
  private total = 0
  private streakCount = 0

  get score(): number {
    return this.total
  }

  get streak(): number {
    return this.streakCount
  }

  get multiplier(): number {
    return Math.min(1 + this.streakCount * GAME_CONFIG.streakStep, GAME_CONFIG.maxMultiplier)
  }

  get atMaxMultiplier(): boolean {
    return this.multiplier >= GAME_CONFIG.maxMultiplier
  }

  registerHit(basePoints: number): number {
    const awarded = Math.round(basePoints * this.multiplier)
    this.total += awarded
    this.streakCount += 1
    return awarded
  }

  registerMiss(): void {
    this.streakCount = 0
  }

  registerPenalty(points: number): number {
    const applied = Math.min(this.total, Math.abs(points))
    this.total -= applied
    this.streakCount = 0
    return applied
  }
}

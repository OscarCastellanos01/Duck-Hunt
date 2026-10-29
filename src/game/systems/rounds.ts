import { GAME_CONFIG } from '@/core/config'
import { getDifficulty, type Difficulty } from '@/game/systems/difficulty'

export type WaveOutcome = 'next-wave' | 'round-cleared' | 'game-over'

export class RoundManager {
  private currentRound = 1
  private currentWave = 1
  private roundHits = 0

  get round(): number {
    return this.currentRound
  }

  get wave(): number {
    return this.currentWave
  }

  get difficulty(): Difficulty {
    return getDifficulty(this.currentRound)
  }

  get totalDucks(): number {
    return GAME_CONFIG.wavesPerRound * this.difficulty.ducksPerWave
  }

  get requiredHits(): number {
    return Math.ceil(this.totalDucks * GAME_CONFIG.roundQuota)
  }

  get hits(): number {
    return this.roundHits
  }

  finishWave(hitsInWave: number): WaveOutcome {
    this.roundHits += hitsInWave
    if (this.currentWave < GAME_CONFIG.wavesPerRound) {
      this.currentWave += 1
      return 'next-wave'
    }
    return this.roundHits >= this.requiredHits ? 'round-cleared' : 'game-over'
  }

  nextRound(): void {
    this.currentRound += 1
    this.currentWave = 1
    this.roundHits = 0
  }
}

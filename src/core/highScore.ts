import { HIGH_SCORE_STORAGE_KEY } from '@/core/config'

export class HighScoreStore {
  private value: number

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null) {
    this.value = this.load()
  }

  get(): number {
    return this.value
  }

  submit(score: number): boolean {
    if (!Number.isFinite(score) || score <= this.value) return false
    this.value = Math.floor(score)
    try {
      this.storage?.setItem(HIGH_SCORE_STORAGE_KEY, String(this.value))
    } catch {
      return true
    }
    return true
  }

  private load(): number {
    try {
      const parsed = Number(this.storage?.getItem(HIGH_SCORE_STORAGE_KEY))
      return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
    } catch {
      return 0
    }
  }
}

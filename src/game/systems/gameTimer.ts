export class GameTimer {
  private remaining: number
  private elapsed = 0

  constructor(durationMs: number) {
    this.remaining = durationMs
  }

  get remainingMs(): number {
    return Math.max(0, this.remaining)
  }

  get elapsedMs(): number {
    return this.elapsed
  }

  get expired(): boolean {
    return this.remaining <= 0
  }

  tick(dtMs: number): void {
    this.remaining -= dtMs
    this.elapsed += dtMs
  }

  addBonus(ms: number): void {
    this.remaining += ms
  }
}

export class Ammo {
  private count: number
  private reloadLeftMs = 0

  constructor(private readonly capacity: number) {
    this.count = capacity
  }

  get remaining(): number {
    return this.count
  }

  get total(): number {
    return this.capacity
  }

  get empty(): boolean {
    return this.count === 0
  }

  get reloading(): boolean {
    return this.reloadLeftMs > 0
  }

  consume(): boolean {
    if (this.count === 0 || this.reloading) return false
    this.count -= 1
    return true
  }

  startReload(durationMs: number): void {
    this.reloadLeftMs = durationMs
  }

  tick(dtMs: number): boolean {
    if (!this.reloading) return false
    this.reloadLeftMs -= dtMs
    if (this.reloadLeftMs > 0) return false
    this.reloadLeftMs = 0
    this.count = this.capacity
    return true
  }
}

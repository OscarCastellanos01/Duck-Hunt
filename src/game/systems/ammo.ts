export class Ammo {
  private count: number

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

  consume(): boolean {
    if (this.count === 0) return false
    this.count -= 1
    return true
  }

  reload(): void {
    this.count = this.capacity
  }
}

export class RollingStats {
  private readonly values: Float64Array
  private readonly scratch: Float64Array
  private index = 0
  private count = 0

  constructor(private readonly capacity: number) {
    this.values = new Float64Array(capacity)
    this.scratch = new Float64Array(capacity)
  }

  add(value: number): void {
    this.values[this.index] = value
    this.index = (this.index + 1) % this.capacity
    this.count = Math.min(this.count + 1, this.capacity)
  }

  get size(): number {
    return this.count
  }

  mean(): number {
    if (this.count === 0) return 0
    let sum = 0
    for (let i = 0; i < this.count; i++) sum += this.values[i] ?? 0
    return sum / this.count
  }

  percentile(p: number): number {
    if (this.count === 0) return 0
    const sorted = this.scratch.subarray(0, this.count)
    sorted.set(this.values.subarray(0, this.count))
    sorted.sort()
    const position = Math.min(this.count - 1, Math.ceil(p * this.count) - 1)
    return sorted[Math.max(0, position)] ?? 0
  }

  reset(): void {
    this.index = 0
    this.count = 0
  }
}

export class FpsCounter {
  private readonly stamps: Float64Array
  private index = 0
  private count = 0

  constructor(private readonly capacity: number) {
    this.stamps = new Float64Array(capacity)
  }

  tick(now: number): void {
    this.stamps[this.index] = now
    this.index = (this.index + 1) % this.capacity
    this.count = Math.min(this.count + 1, this.capacity)
  }

  fps(): number {
    if (this.count < 2) return 0
    const newest = this.stamps[(this.index - 1 + this.capacity) % this.capacity] ?? 0
    const oldest = this.stamps[(this.index - this.count + this.capacity) % this.capacity] ?? 0
    const elapsed = newest - oldest
    return elapsed > 0 ? ((this.count - 1) * 1000) / elapsed : 0
  }
}

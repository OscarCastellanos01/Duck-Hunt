import type { OneEuroParams } from '@/core/types'

const MIN_DT_SECONDS = 1e-3

const smoothingFactor = (dt: number, cutoff: number): number => {
  const r = 2 * Math.PI * cutoff * dt
  return r / (r + 1)
}

export class OneEuroFilter {
  private value = 0
  private derivative = 0
  private lastT = 0
  private initialized = false

  constructor(private params: OneEuroParams) {}

  setParams(params: OneEuroParams): void {
    this.params = params
  }

  reset(): void {
    this.initialized = false
    this.derivative = 0
  }

  filter(input: number, tMs: number): number {
    if (!this.initialized) {
      this.initialized = true
      this.value = input
      this.derivative = 0
      this.lastT = tMs
      return input
    }
    const dt = Math.max((tMs - this.lastT) / 1000, MIN_DT_SECONDS)
    const rawDerivative = (input - this.value) / dt
    this.derivative += smoothingFactor(dt, this.params.dCutoff) * (rawDerivative - this.derivative)
    const cutoff = this.params.minCutoff + this.params.beta * Math.abs(this.derivative)
    this.value += smoothingFactor(dt, cutoff) * (input - this.value)
    this.lastT = tMs
    return this.value
  }
}

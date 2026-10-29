import { GAME_CONFIG, LANES, TARGET_LAYOUT, TARGET_TYPES, type TargetType } from '@/core/config'
import type { Difficulty } from '@/game/systems/difficulty'
import { pickLaneTarget, pickPopupTarget, type Rng } from '@/game/systems/targets'

export interface SpawnRequest {
  kind: 'lane' | 'popup'
  lane: number
  type: TargetType
  x: number
  vx: number
}

const between = (min: number, max: number, rng: Rng): number => min + (max - min) * rng()

export class LaneSpawner {
  private readonly gaps: number[]

  constructor(private readonly rng: Rng) {
    this.gaps = LANES.map(() => between(0, TARGET_LAYOUT.spacingMin, rng))
  }

  update(dtMs: number, difficulty: Difficulty, out: SpawnRequest[]): void {
    const { width, spawnMargin } = GAME_CONFIG
    LANES.forEach((lane, index) => {
      const laneSpeed = lane.speed * difficulty.speedMultiplier
      const gap = (this.gaps[index] ?? 0) - (laneSpeed * dtMs) / 1000
      this.gaps[index] = gap
      if (gap > 0) return
      const type = pickLaneTarget(difficulty, this.rng)
      this.gaps[index] = between(TARGET_LAYOUT.spacingMin, TARGET_LAYOUT.spacingMax, this.rng)
      out.push({
        kind: 'lane',
        lane: index,
        type,
        x: lane.direction > 0 ? -spawnMargin : width + spawnMargin,
        vx: lane.direction * laneSpeed * TARGET_TYPES[type].speed,
      })
    })
  }
}

export class PopupSpawner {
  private remainingMs: number

  constructor(
    private readonly rng: Rng,
    firstDelayMs: number,
  ) {
    this.remainingMs = firstDelayMs
  }

  update(dtMs: number, difficulty: Difficulty, out: SpawnRequest[]): void {
    this.remainingMs -= dtMs
    if (this.remainingMs > 0) return
    this.remainingMs = difficulty.popupIntervalMs
    const margin = TARGET_LAYOUT.popupMarginX
    out.push({
      kind: 'popup',
      lane: Math.floor(this.rng() * LANES.length),
      type: pickPopupTarget(this.rng),
      x: between(margin, GAME_CONFIG.width - margin, this.rng),
      vx: 0,
    })
  }
}

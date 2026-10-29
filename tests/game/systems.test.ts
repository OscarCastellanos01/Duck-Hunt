import { describe, expect, it } from 'vitest'
import { GAME_CONFIG, LANES, TARGET_LAYOUT } from '@/core/config'
import { Ammo } from '@/game/systems/ammo'
import { getDifficulty } from '@/game/systems/difficulty'
import { GameTimer } from '@/game/systems/gameTimer'
import { findHitTarget } from '@/game/systems/hitTest'
import { ScoreKeeper } from '@/game/systems/scoring'
import { LaneSpawner, PopupSpawner, type SpawnRequest } from '@/game/systems/spawner'
import { TargetMotion } from '@/game/systems/targetMotion'
import { bullseyePoints, pickLaneTarget, pickPopupTarget } from '@/game/systems/targets'

const sequence = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length] ?? 0
}

describe('difficulty', () => {
  it('ramps speed, decoys and popup frequency over the game', () => {
    const start = getDifficulty(0)
    const end = getDifficulty(GAME_CONFIG.durationMs)
    expect(end.speedMultiplier).toBeGreaterThan(start.speedMultiplier)
    expect(end.decoyChance).toBeGreaterThan(start.decoyChance)
    expect(end.popupIntervalMs).toBeLessThan(start.popupIntervalMs)
  })

  it('clamps progress outside the game duration', () => {
    expect(getDifficulty(-1000).progress).toBe(0)
    expect(getDifficulty(GAME_CONFIG.durationMs * 3).progress).toBe(1)
  })
})

describe('target selection', () => {
  const difficulty = getDifficulty(0)

  it('picks lane targets by probability bands', () => {
    expect(pickLaneTarget(difficulty, () => 0)).toBe('golden')
    expect(pickLaneTarget(difficulty, () => 0.05)).toBe('decoy')
    expect(pickLaneTarget(difficulty, () => 0.99)).toBe('duck')
  })

  it('picks popup targets by probability bands', () => {
    expect(pickPopupTarget(() => 0)).toBe('golden')
    expect(pickPopupTarget(() => 0.2)).toBe('decoy')
    expect(pickPopupTarget(() => 0.4)).toBe('bullseye')
    expect(pickPopupTarget(() => 0.99)).toBe('duck')
  })

  it('scores bullseyes by ring', () => {
    expect(bullseyePoints(0.1)).toBe(200)
    expect(bullseyePoints(0.5)).toBe(100)
    expect(bullseyePoints(0.9)).toBe(50)
    expect(bullseyePoints(5)).toBe(50)
  })
})

describe('LaneSpawner', () => {
  it('eventually spawns in every lane, entering from the lane side', () => {
    const spawner = new LaneSpawner(Math.random)
    const out: SpawnRequest[] = []
    for (let i = 0; i < 400; i++) spawner.update(50, getDifficulty(0), out)
    for (const lane of LANES.keys()) expect(out.some((r) => r.lane === lane)).toBe(true)
    for (const request of out) {
      const direction = LANES[request.lane]?.direction ?? 1
      expect(Math.sign(request.vx)).toBe(direction)
      if (direction > 0) expect(request.x).toBeLessThan(0)
      else expect(request.x).toBeGreaterThan(GAME_CONFIG.width)
    }
  })

  it('spawns faster as the game progresses', () => {
    const count = (elapsed: number) => {
      const spawner = new LaneSpawner(sequence(0.5, 0.99))
      const out: SpawnRequest[] = []
      for (let i = 0; i < 200; i++) spawner.update(50, getDifficulty(elapsed), out)
      return out.length
    }
    expect(count(GAME_CONFIG.durationMs)).toBeGreaterThan(count(0))
  })
})

describe('PopupSpawner', () => {
  it('waits for the first delay and then spawns inside the play area', () => {
    const spawner = new PopupSpawner(Math.random, 1000)
    const out: SpawnRequest[] = []
    spawner.update(900, getDifficulty(0), out)
    expect(out).toHaveLength(0)
    spawner.update(200, getDifficulty(0), out)
    expect(out).toHaveLength(1)
    expect(out[0]?.kind).toBe('popup')
    expect(out[0]?.x).toBeGreaterThanOrEqual(TARGET_LAYOUT.popupMarginX)
    expect(out[0]?.x).toBeLessThanOrEqual(GAME_CONFIG.width - TARGET_LAYOUT.popupMarginX)
  })
})

const laneRequest = (overrides: Partial<SpawnRequest> = {}): SpawnRequest => ({
  kind: 'lane',
  lane: 0,
  type: 'duck',
  x: -50,
  vx: 200,
  ...overrides,
})

describe('TargetMotion', () => {
  it('moves along the lane and finishes after leaving the screen', () => {
    const motion = new TargetMotion(laneRequest())
    motion.step(100)
    expect(motion.x).toBeGreaterThan(-50)
    expect(motion.hittable).toBe(true)
    for (let i = 0; i < 100; i++) motion.step(100)
    expect(motion.phase).toBe('done')
  })

  it('finishes when leaving on the left side', () => {
    const motion = new TargetMotion(laneRequest({ x: 1000, vx: -300 }))
    for (let i = 0; i < 100; i++) motion.step(100)
    expect(motion.phase).toBe('done')
  })

  it('pops up, stays and goes back down', () => {
    const motion = new TargetMotion(laneRequest({ kind: 'popup', vx: 0, x: 400 }))
    expect(motion.hittable).toBe(false)
    motion.step(TARGET_LAYOUT.popupRiseMs + 10)
    expect(motion.phase).toBe('up')
    expect(motion.offsetY).toBe(0)
    expect(motion.hittable).toBe(true)
    motion.step(TARGET_LAYOUT.popupStayMs + 10)
    expect(motion.phase).toBe('falling')
    motion.step(TARGET_LAYOUT.popupFallMs + 10)
    expect(motion.phase).toBe('done')
    expect(motion.hittable).toBe(false)
  })

  it('becomes hittable only once it has risen enough', () => {
    const motion = new TargetMotion(laneRequest({ kind: 'popup', vx: 0, x: 400 }))
    motion.step(TARGET_LAYOUT.popupRiseMs * 0.2)
    expect(motion.hittable).toBe(false)
    motion.step(TARGET_LAYOUT.popupRiseMs * 0.5)
    expect(motion.hittable).toBe(true)
  })
})

describe('findHitTarget', () => {
  const targets = [
    { x: 100, y: 100, radius: 30 },
    { x: 200, y: 100, radius: 30 },
  ]

  it('returns the target containing the shot', () => {
    expect(findHitTarget(targets, 195, 105, 0)).toBe(1)
  })

  it('applies the aim assist margin', () => {
    expect(findHitTarget(targets, 100, 140, 0)).toBe(-1)
    expect(findHitTarget(targets, 100, 140, 18)).toBe(0)
  })

  it('prefers the closest target when several overlap', () => {
    const close = [
      { x: 100, y: 100, radius: 60 },
      { x: 130, y: 100, radius: 60 },
    ]
    expect(findHitTarget(close, 125, 100, 0)).toBe(1)
  })

  it('returns -1 when nothing is hit', () => {
    expect(findHitTarget(targets, 500, 500, 18)).toBe(-1)
    expect(findHitTarget([], 0, 0, 18)).toBe(-1)
  })
})

describe('ScoreKeeper', () => {
  it('grows the multiplier with the streak up to the cap', () => {
    const score = new ScoreKeeper()
    expect(score.registerHit(100)).toBe(100)
    expect(score.registerHit(100)).toBe(125)
    for (let i = 0; i < 20; i++) score.registerHit(100)
    expect(score.multiplier).toBe(GAME_CONFIG.maxMultiplier)
    expect(score.atMaxMultiplier).toBe(true)
  })

  it('resets the streak on a miss', () => {
    const score = new ScoreKeeper()
    score.registerHit(100)
    score.registerMiss()
    expect(score.streak).toBe(0)
    expect(score.registerHit(200)).toBe(200)
  })

  it('applies penalties without going below zero and resets the streak', () => {
    const score = new ScoreKeeper()
    score.registerHit(100)
    score.registerHit(100)
    expect(score.registerPenalty(-150)).toBe(150)
    expect(score.score).toBe(75)
    expect(score.streak).toBe(0)
    expect(score.registerPenalty(-150)).toBe(75)
    expect(score.score).toBe(0)
  })
})

describe('Ammo', () => {
  it('consumes, empties and reloads after the delay', () => {
    const ammo = new Ammo(3)
    ammo.consume()
    ammo.consume()
    ammo.consume()
    expect(ammo.empty).toBe(true)
    expect(ammo.consume()).toBe(false)
    ammo.startReload(1000)
    expect(ammo.reloading).toBe(true)
    expect(ammo.tick(400)).toBe(false)
    expect(ammo.remaining).toBe(0)
    expect(ammo.tick(700)).toBe(true)
    expect(ammo.reloading).toBe(false)
    expect(ammo.remaining).toBe(3)
  })

  it('cannot fire while reloading', () => {
    const ammo = new Ammo(2)
    ammo.consume()
    ammo.startReload(500)
    expect(ammo.consume()).toBe(false)
  })
})

describe('GameTimer', () => {
  it('counts down, accepts bonuses and reports expiry', () => {
    const timer = new GameTimer(1000)
    timer.tick(600)
    expect(timer.remainingMs).toBe(400)
    expect(timer.elapsedMs).toBe(600)
    timer.addBonus(500)
    expect(timer.remainingMs).toBe(900)
    expect(timer.expired).toBe(false)
    timer.tick(1000)
    expect(timer.expired).toBe(true)
    expect(timer.remainingMs).toBe(0)
  })
})

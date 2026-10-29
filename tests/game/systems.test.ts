import { describe, expect, it } from 'vitest'
import { DIFFICULTY_CONFIG, GAME_CONFIG } from '@/core/config'
import { Ammo } from '@/game/systems/ammo'
import { getDifficulty } from '@/game/systems/difficulty'
import { DuckMotion } from '@/game/systems/duckMotion'
import { findHitTarget } from '@/game/systems/hitTest'
import { RoundManager } from '@/game/systems/rounds'
import { ScoreKeeper } from '@/game/systems/scoring'
import { createDuckSpec, pickDuckType, type DuckSpec } from '@/game/systems/spawner'

const sequence = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length] ?? 0
}

describe('difficulty', () => {
  it('increases speed and shortens waves as rounds progress', () => {
    const early = getDifficulty(1)
    const late = getDifficulty(8)
    expect(late.speed).toBeGreaterThan(early.speed)
    expect(late.waveDurationMs).toBeLessThan(early.waveDurationMs)
    expect(late.unpredictability).toBeGreaterThan(early.unpredictability)
  })

  it('adds simultaneous ducks at the configured rounds', () => {
    expect(getDifficulty(1).ducksPerWave).toBe(1)
    expect(getDifficulty(DIFFICULTY_CONFIG.secondDuckRound).ducksPerWave).toBe(2)
    expect(getDifficulty(DIFFICULTY_CONFIG.thirdDuckRound).ducksPerWave).toBe(3)
  })

  it('caps its values', () => {
    const extreme = getDifficulty(500)
    expect(extreme.speed).toBeLessThanOrEqual(
      DIFFICULTY_CONFIG.baseSpeed * DIFFICULTY_CONFIG.maxSpeedMultiplier,
    )
    expect(extreme.waveDurationMs).toBe(DIFFICULTY_CONFIG.waveDurationMinMs)
    expect(extreme.unpredictability).toBe(DIFFICULTY_CONFIG.unpredictabilityMax)
  })
})

describe('spawner', () => {
  it('picks duck types by probability bands', () => {
    const difficulty = getDifficulty(1)
    expect(pickDuckType(difficulty, () => 0)).toBe('golden')
    expect(pickDuckType(difficulty, () => difficulty.goldenChance + 0.001)).toBe('fast')
    expect(pickDuckType(difficulty, () => 0.99)).toBe('common')
  })

  it('spawns outside the play area heading inward', () => {
    const left = createDuckSpec(getDifficulty(1), sequence(0.99, 0.1, 0.4, 0.5, 0.5, 0.5, 0.5, 0.2))
    const right = createDuckSpec(
      getDifficulty(1),
      sequence(0.99, 0.9, 0.4, 0.5, 0.5, 0.5, 0.5, 0.2),
    )
    expect(left.x).toBeLessThan(GAME_CONFIG.playBounds.left)
    expect(left.vx).toBeGreaterThan(0)
    expect(right.x).toBeGreaterThan(GAME_CONFIG.playBounds.right)
    expect(right.vx).toBeLessThan(0)
  })

  it('only schedules direction changes once the difficulty is unpredictable', () => {
    expect(createDuckSpec(getDifficulty(1), Math.random).turnIntervalMs).toBeNull()
    expect(createDuckSpec(getDifficulty(5), Math.random).turnIntervalMs).not.toBeNull()
  })
})

const baseSpec = (overrides: Partial<DuckSpec> = {}): DuckSpec => ({
  type: 'common',
  x: -50,
  y: 200,
  vx: 200,
  vy: 0,
  wobbleAmplitude: 0,
  wobbleFrequency: 1,
  wobblePhase: 0,
  turnIntervalMs: null,
  ...overrides,
})

describe('DuckMotion', () => {
  it('flies into the play area without bouncing at the entry edge', () => {
    const motion = new DuckMotion(baseSpec(), () => 0.5)
    motion.step(100)
    expect(motion.vx).toBeGreaterThan(0)
    for (let i = 0; i < 20; i++) motion.step(100)
    expect(motion.x).toBeGreaterThan(0)
  })

  it('bounces off the right edge after entering', () => {
    const motion = new DuckMotion(baseSpec({ x: 900, vx: 400 }), () => 0.5)
    for (let i = 0; i < 20; i++) motion.step(100)
    expect(motion.vx).toBeLessThan(0)
    expect(motion.x).toBeLessThanOrEqual(GAME_CONFIG.playBounds.right)
  })

  it('bounces off the top and bottom bounds', () => {
    const motion = new DuckMotion(baseSpec({ x: 400, vx: 0, vy: -300, y: 100 }), () => 0.5)
    for (let i = 0; i < 20; i++) motion.step(100)
    expect(motion.y).toBeGreaterThanOrEqual(GAME_CONFIG.playBounds.top)
  })

  it('changes heading when a turn is due', () => {
    const motion = new DuckMotion(
      baseSpec({ x: 400, vx: 200, turnIntervalMs: 500 }),
      sequence(0.5, 0.1),
    )
    const before = Math.atan2(motion.vy, motion.vx)
    for (let i = 0; i < 8; i++) motion.step(100)
    expect(Math.atan2(motion.vy, motion.vx)).not.toBeCloseTo(before, 1)
  })

  it('leaves the screen upward after escaping', () => {
    const motion = new DuckMotion(baseSpec({ x: 400 }), () => 0.5)
    motion.step(100)
    motion.escape()
    expect(motion.state).toBe('escaping')
    for (let i = 0; i < 40; i++) motion.step(100)
    expect(motion.offscreen).toBe(true)
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
  })

  it('resets the streak on a miss', () => {
    const score = new ScoreKeeper()
    score.registerHit(100)
    score.registerMiss()
    expect(score.streak).toBe(0)
    expect(score.registerHit(200)).toBe(200)
  })
})

describe('Ammo', () => {
  it('consumes and reloads', () => {
    const ammo = new Ammo(3)
    expect(ammo.consume()).toBe(true)
    ammo.consume()
    ammo.consume()
    expect(ammo.empty).toBe(true)
    expect(ammo.consume()).toBe(false)
    ammo.reload()
    expect(ammo.remaining).toBe(3)
  })
})

describe('RoundManager', () => {
  it('advances waves and clears the round when the quota is met', () => {
    const rounds = new RoundManager()
    const waves = GAME_CONFIG.wavesPerRound
    for (let i = 1; i < waves; i++) expect(rounds.finishWave(1)).toBe('next-wave')
    expect(rounds.finishWave(1)).toBe('round-cleared')
  })

  it('ends the game when the quota is missed', () => {
    const rounds = new RoundManager()
    for (let i = 1; i < GAME_CONFIG.wavesPerRound; i++) rounds.finishWave(0)
    expect(rounds.finishWave(0)).toBe('game-over')
  })

  it('starts the next round at wave one with higher difficulty', () => {
    const rounds = new RoundManager()
    const speed = rounds.difficulty.speed
    rounds.nextRound()
    expect(rounds.round).toBe(2)
    expect(rounds.wave).toBe(1)
    expect(rounds.hits).toBe(0)
    expect(rounds.difficulty.speed).toBeGreaterThan(speed)
  })
})

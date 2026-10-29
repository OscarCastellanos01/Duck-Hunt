import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, POSE_THRESHOLDS } from '@/core/config'
import { EventBus } from '@/core/eventBus'
import type { AimEvent, GameEvents, HandFrame, ShootEvent } from '@/core/types'
import { GestureMachine, type GestureSettings } from '@/gestures/gestureMachine'
import { FRAME_INTERVAL_MS, makeHand, openHand } from '../helpers/handFactory'

interface Recorded {
  shots: ShootEvent[]
  aims: AimEvent[]
  poses: string[]
  lost: number
  found: number
}

const setup = (overrides: Partial<GestureSettings> = {}) => {
  const bus = new EventBus<GameEvents>()
  const recorded: Recorded = { shots: [], aims: [], poses: [], lost: 0, found: 0 }
  bus.on('shoot', (e) => recorded.shots.push(e))
  bus.on('aim', (e) => recorded.aims.push({ ...e }))
  bus.on('poseChanged', (e) => recorded.poses.push(e.pose))
  bus.on('trackingLost', () => (recorded.lost += 1))
  bus.on('trackingFound', () => (recorded.found += 1))
  const settings: GestureSettings = { ...DEFAULT_SETTINGS, ...overrides }
  const machine = new GestureMachine(bus, settings)
  let t = 0
  const push = (frame: HandFrame | null, count = 1) => {
    for (let i = 0; i < count; i++) {
      if (frame) frame.t = t
      machine.update(frame, t)
      t += FRAME_INTERVAL_MS
    }
  }
  const time = () => t
  return { machine, recorded, push, time }
}

const enterGun = (push: (frame: HandFrame | null, count?: number) => void) =>
  push(makeHand(), POSE_THRESHOLDS.enterFrames + 2)

describe('GestureMachine', () => {
  let ctx: ReturnType<typeof setup>

  beforeEach(() => {
    ctx = setup()
  })

  it('moves from idle to gun when the pose is stable', () => {
    expect(ctx.machine.state).toBe('idle')
    enterGun(ctx.push)
    expect(ctx.machine.state).toBe('gun')
    expect(ctx.recorded.poses).toEqual(['gun'])
    expect(ctx.recorded.found).toBe(1)
  })

  it('emits aim events with a mirrored position', () => {
    ctx.push(makeHand({ x: 0.7 }), 3)
    const last = ctx.recorded.aims.at(-1)
    expect(last?.x).toBeLessThan(0.5)
    const unmirrored = setup({ mirror: false })
    unmirrored.push(makeHand({ x: 0.7 }), 3)
    expect(unmirrored.recorded.aims.at(-1)?.x).toBeGreaterThan(0.5)
  })

  it('shoots on thumb drop and enters cooldown', () => {
    enterGun(ctx.push)
    ctx.push(makeHand({ thumbDrop: 1 }))
    expect(ctx.recorded.shots).toHaveLength(1)
    expect(ctx.machine.state).toBe('cooldown')
  })

  it('returns to gun after the cooldown if the pose persists', () => {
    enterGun(ctx.push)
    ctx.push(makeHand({ thumbDrop: 1 }))
    const frames = Math.ceil(DEFAULT_SETTINGS.cooldownMs / FRAME_INTERVAL_MS) + 1
    ctx.push(makeHand({ thumbDrop: 1 }), frames)
    expect(ctx.machine.state).toBe('gun')
  })

  it('blocks a second shot during the cooldown', () => {
    enterGun(ctx.push)
    ctx.push(makeHand({ thumbDrop: 1 }))
    ctx.push(makeHand(), 3)
    ctx.push(makeHand({ thumbDrop: 1 }), 2)
    expect(ctx.recorded.shots).toHaveLength(1)
  })

  it('allows another shot once the cooldown expires and the thumb is rearmed', () => {
    enterGun(ctx.push)
    ctx.push(makeHand({ thumbDrop: 1 }))
    ctx.push(makeHand(), Math.ceil(DEFAULT_SETTINGS.cooldownMs / FRAME_INTERVAL_MS) + 2)
    ctx.push(makeHand({ thumbDrop: 1 }), 2)
    expect(ctx.recorded.shots).toHaveLength(2)
  })

  it('shoots with the recoil gesture in recoil mode', () => {
    const recoil = setup({ gestureMode: 'recoil' })
    recoil.push(makeHand(), 20)
    for (let i = 0; i < 8; i++) recoil.push(makeHand({ y: 0.8 - 0.0125 * (i + 1) }))
    recoil.push(makeHand({ y: 0.7 }), 3)
    expect(recoil.recorded.shots).toHaveLength(1)
    const lastAim = recoil.recorded.aims.at(-1)
    expect(recoil.recorded.shots[0]?.y).toBeGreaterThan(lastAim?.y ?? 1)
  })

  it('does not react to thumb drop in recoil mode', () => {
    const recoil = setup({ gestureMode: 'recoil' })
    recoil.push(makeHand(), 10)
    recoil.push(makeHand({ thumbDrop: 1 }), 5)
    expect(recoil.recorded.shots).toHaveLength(0)
  })

  it('shares one cooldown between both gestures in both mode', () => {
    const both = setup({ gestureMode: 'both' })
    both.push(makeHand(), 20)
    both.push(makeHand({ thumbDrop: 1 }))
    for (let i = 0; i < 8; i++) {
      both.push(makeHand({ thumbDrop: 1, y: 0.8 - 0.0125 * (i + 1) }))
    }
    expect(both.recorded.shots).toHaveLength(1)
  })

  it('does not shoot without the gun pose', () => {
    ctx.push(openHand(), 10)
    ctx.push(openHand({ thumbDrop: 1 }), 5)
    expect(ctx.recorded.shots).toHaveLength(0)
    expect(ctx.machine.state).toBe('idle')
  })

  it('emits trackingLost and drops the pose when the hand disappears', () => {
    enterGun(ctx.push)
    ctx.push(null, 3)
    expect(ctx.recorded.lost).toBe(1)
    expect(ctx.recorded.poses).toEqual(['gun', 'none'])
    expect(ctx.machine.state).toBe('idle')
  })

  it('emits trackingFound when the hand returns', () => {
    enterGun(ctx.push)
    ctx.push(null, 3)
    ctx.push(makeHand(), 1)
    expect(ctx.recorded.found).toBe(2)
  })

  it('stops emitting aim while tracking is lost', () => {
    ctx.push(makeHand(), 3)
    const before = ctx.recorded.aims.length
    ctx.push(null, 5)
    expect(ctx.recorded.aims).toHaveLength(before)
  })

  it('applies new settings live', () => {
    enterGun(ctx.push)
    ctx.machine.configure({ ...DEFAULT_SETTINGS, gestureMode: 'recoil' })
    ctx.push(makeHand({ thumbDrop: 1 }), 5)
    expect(ctx.recorded.shots).toHaveLength(0)
  })
})

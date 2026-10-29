import { describe, expect, it, vi } from 'vitest'
import { EventBus } from '@/core/eventBus'
import type { GameEvents } from '@/core/types'

describe('EventBus', () => {
  it('delivers the payload to subscribers', () => {
    const bus = new EventBus<GameEvents>()
    const handler = vi.fn()
    bus.on('shoot', handler)
    bus.emit('shoot', { x: 0.2, y: 0.4, t: 10 })
    expect(handler).toHaveBeenCalledWith({ x: 0.2, y: 0.4, t: 10 })
  })

  it('allows unsubscribing', () => {
    const bus = new EventBus<GameEvents>()
    const handler = vi.fn()
    const off = bus.on('aim', handler)
    off()
    bus.emit('aim', { x: 0, y: 0, t: 0 })
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not mix different events', () => {
    const bus = new EventBus<GameEvents>()
    const handler = vi.fn()
    bus.on('trackingLost', handler)
    bus.emit('trackingFound', undefined)
    expect(handler).not.toHaveBeenCalled()
  })
})

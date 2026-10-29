import type { EventBus } from '@/core/eventBus'
import type { AimEvent, GameEvents } from '@/core/types'
import type { InputProvider } from '@/input/InputProvider'

export interface PointerRect {
  left: number
  top: number
  width: number
  height: number
}

export interface NormalizedPointer {
  x: number
  y: number
  inside: boolean
}

export const normalizePointer = (
  clientX: number,
  clientY: number,
  rect: PointerRect,
): NormalizedPointer => {
  const x = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
  const y = rect.height > 0 ? (clientY - rect.top) / rect.height : 0
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
    inside: x >= 0 && x <= 1 && y >= 0 && y <= 1,
  }
}

const PRIMARY_BUTTON = 0
const KEY_AIM_STEP = 0.03
const SHOOT_KEYS = new Set([' ', 'Enter'])
const AIM_KEY_DELTAS: Record<string, readonly [number, number]> = {
  ArrowLeft: [-KEY_AIM_STEP, 0],
  ArrowRight: [KEY_AIM_STEP, 0],
  ArrowUp: [0, -KEY_AIM_STEP],
  ArrowDown: [0, KEY_AIM_STEP],
}

export class MouseInput implements InputProvider {
  private readonly aimEvent: AimEvent = { x: 0.5, y: 0.5, t: 0 }

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly getTarget: () => HTMLElement | null,
  ) {}

  async start(): Promise<void> {
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerdown', this.onDown)
    window.addEventListener('keydown', this.onKey)
  }

  stop(): void {
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerdown', this.onDown)
    window.removeEventListener('keydown', this.onKey)
  }

  private resolve(event: PointerEvent): NormalizedPointer | null {
    const target = this.getTarget()
    if (!target) return null
    return normalizePointer(event.clientX, event.clientY, target.getBoundingClientRect())
  }

  private readonly onMove = (event: PointerEvent): void => {
    const pointer = this.resolve(event)
    if (!pointer) return
    this.aimEvent.x = pointer.x
    this.aimEvent.y = pointer.y
    this.aimEvent.t = performance.now()
    this.bus.emit('aim', this.aimEvent)
  }

  private readonly onKey = (event: KeyboardEvent): void => {
    const delta = AIM_KEY_DELTAS[event.key]
    if (delta) {
      event.preventDefault()
      this.aimEvent.x = Math.min(1, Math.max(0, this.aimEvent.x + delta[0]))
      this.aimEvent.y = Math.min(1, Math.max(0, this.aimEvent.y + delta[1]))
      this.aimEvent.t = performance.now()
      this.bus.emit('aim', this.aimEvent)
    } else if (SHOOT_KEYS.has(event.key) && !event.repeat) {
      event.preventDefault()
      this.bus.emit('shoot', { x: this.aimEvent.x, y: this.aimEvent.y, t: performance.now() })
    }
  }

  private readonly onDown = (event: PointerEvent): void => {
    if (event.button !== PRIMARY_BUTTON) return
    const pointer = this.resolve(event)
    if (!pointer?.inside) return
    this.bus.emit('shoot', { x: pointer.x, y: pointer.y, t: performance.now() })
  }
}

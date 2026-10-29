import type { InputMode } from '@/core/types'
import type { InputProvider } from '@/input/InputProvider'

export type InputFactories = Record<InputMode, () => InputProvider>

export class InputController {
  private provider: InputProvider | null = null
  private currentMode: InputMode | null = null

  constructor(private readonly factories: InputFactories) {}

  get mode(): InputMode | null {
    return this.currentMode
  }

  async use(mode: InputMode): Promise<void> {
    if (mode === this.currentMode) return
    const previous = this.provider
    const previousMode = this.currentMode
    previous?.stop()
    this.provider = null
    this.currentMode = null
    const next = this.factories[mode]()
    try {
      await next.start()
    } catch (error) {
      next.stop()
      if (previous && previousMode) {
        await previous.start()
        this.provider = previous
        this.currentMode = previousMode
      }
      throw error
    }
    this.provider = next
    this.currentMode = mode
  }

  stop(): void {
    this.provider?.stop()
    this.provider = null
    this.currentMode = null
  }
}

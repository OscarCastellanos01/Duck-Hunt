import type Phaser from 'phaser'
import type { EventBus } from '@/core/eventBus'
import type { HighScoreStore } from '@/core/highScore'
import type { SettingsStore } from '@/core/settings'
import type { GameEvents } from '@/core/types'
import type { InputController } from '@/input/InputController'

export interface Services {
  bus: EventBus<GameEvents>
  settings: SettingsStore
  highScore: HighScoreStore
  input: InputController
}

export const SERVICES_KEY = 'services'

export const getServices = (scene: Phaser.Scene): Services => {
  const services = scene.registry.get(SERVICES_KEY) as Services | undefined
  if (!services) throw new Error('Game services are not registered')
  return services
}

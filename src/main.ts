import { APP_NAME } from '@/core/config'
import { EventBus } from '@/core/eventBus'
import { SettingsStore } from '@/core/settings'
import type { GameEvents } from '@/core/types'

export const eventBus = new EventBus<GameEvents>()
export const settings = new SettingsStore(window.localStorage)

const app = document.querySelector<HTMLDivElement>('#app')
if (app) app.textContent = APP_NAME

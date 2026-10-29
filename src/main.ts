import '@/style.css'
import { EventBus } from '@/core/eventBus'
import { SettingsStore } from '@/core/settings'
import type { GameEvents } from '@/core/types'
import { PrototypeApp } from '@/prototype/PrototypeApp'

const eventBus = new EventBus<GameEvents>()
const settings = new SettingsStore(window.localStorage)

const root = document.querySelector<HTMLDivElement>('#app')
if (root) new PrototypeApp(root, eventBus, settings).mount()

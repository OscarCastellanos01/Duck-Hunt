import Phaser from 'phaser'
import '@/style.css'
import { GAME_CONFIG } from '@/core/config'
import { EventBus } from '@/core/eventBus'
import { HighScoreStore } from '@/core/highScore'
import { SettingsStore } from '@/core/settings'
import type { GameEvents } from '@/core/types'
import { CameraDebug } from '@/debug/CameraDebug'
import { BootScene } from '@/game/scenes/BootScene'
import { CalibrationScene } from '@/game/scenes/CalibrationScene'
import { GameOverScene } from '@/game/scenes/GameOverScene'
import { GameScene } from '@/game/scenes/GameScene'
import { MenuScene } from '@/game/scenes/MenuScene'
import { PreloadScene } from '@/game/scenes/PreloadScene'
import { SettingsScene } from '@/game/scenes/SettingsScene'
import { SERVICES_KEY, type Services } from '@/game/services'
import { GestureInput } from '@/input/GestureInput'
import { InputController } from '@/input/InputController'
import { MouseInput } from '@/input/MouseInput'

const MUTE_KEY = 'm'

const gameRoot = document.querySelector<HTMLDivElement>('#game')
const overlayRoot = document.querySelector<HTMLDivElement>('#overlay')
if (!gameRoot || !overlayRoot) throw new Error('Missing #game or #overlay container')

const bus = new EventBus<GameEvents>()
const settings = new SettingsStore(window.localStorage)
const highScore = new HighScoreStore(window.localStorage)
const debug = new CameraDebug(overlayRoot, bus, settings)

let canvas: HTMLCanvasElement | null = null
const input = new InputController({
  mouse: () => new MouseInput(bus, () => canvas),
  camera: () => new GestureInput(bus, settings, debug),
})
const services: Services = { bus, settings, highScore, input }

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: gameRoot,
  width: GAME_CONFIG.width,
  height: GAME_CONFIG.height,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    GameScene,
    GameOverScene,
    SettingsScene,
    CalibrationScene,
  ],
  callbacks: {
    preBoot: (instance) => instance.registry.set(SERVICES_KEY, services),
    postBoot: (instance) => {
      canvas = instance.canvas
      void input.use('mouse')
    },
  },
})

game.sound.volume = settings.get().sfxVolume
settings.subscribe((next) => {
  game.sound.volume = next.sfxVolume
})
window.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() === MUTE_KEY && !event.repeat) game.sound.mute = !game.sound.mute
})

window.addEventListener('beforeunload', () => {
  input.stop()
  game.destroy(true)
})

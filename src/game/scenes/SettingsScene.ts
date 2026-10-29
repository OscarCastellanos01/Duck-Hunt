import Phaser from 'phaser'
import { COOLDOWN_RANGE_MS, GAME_CONFIG, SENSITIVITY_RANGE } from '@/core/config'
import type { GestureMode, Settings, SmoothingPreset } from '@/core/types'
import { Crosshair } from '@/game/entities/Crosshair'
import { SCENE_KEYS } from '@/game/scenes/keys'
import { getServices, type Services } from '@/game/services'
import { UI_DEPTH, createBackdrop } from '@/game/ui/Backdrop'
import { Button, ButtonGroup } from '@/game/ui/Button'

const FONT = 'system-ui, sans-serif'
const LABEL_X = 150
const MINUS_X = 640
const VALUE_X = 740
const PLUS_X = 840
const CYCLE_BUTTON_WIDTH = 240
const STEP_BUTTON_WIDTH = 56
const ROW_HEIGHT = 40
const ROW_SPACING = 46
const FIRST_ROW_Y = 125
const BACK_Y = 490
const SENSITIVITY_STEP = 0.1
const COOLDOWN_STEP_MS = 50

const GESTURE_MODES: readonly GestureMode[] = ['thumb', 'recoil', 'both']
const GESTURE_MODE_LABELS: Record<GestureMode, string> = {
  thumb: 'Thumb drop',
  recoil: 'Recoil',
  both: 'Both',
}
const SMOOTHING_PRESETS: readonly SmoothingPreset[] = ['precise', 'balanced', 'smooth']
const SMOOTHING_LABELS: Record<SmoothingPreset, string> = {
  precise: 'Precise',
  balanced: 'Balanced',
  smooth: 'Smooth',
}

const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const nextOf = <T>(options: readonly T[], current: T): T => {
  const index = options.indexOf(current)
  return options[(index + 1) % options.length] ?? current
}

export class SettingsScene extends Phaser.Scene {
  private services!: Services
  private buttons!: ButtonGroup
  private refreshers: (() => void)[] = []
  private rowIndex = 0

  constructor() {
    super(SCENE_KEYS.settings)
  }

  create(): void {
    this.services = getServices(this)
    this.refreshers = []
    this.rowIndex = 0
    const centerX = GAME_CONFIG.width / 2
    const { settings } = this.services

    createBackdrop(this)
    this.add.rectangle(centerX, 288, 800, 384, 0x000000, 0.55).setDepth(UI_DEPTH - 1)
    this.add
      .text(centerX, 50, 'Settings', {
        fontFamily: FONT,
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)

    this.buttons = new ButtonGroup(this, this.services.bus)

    this.addCycle(
      'Shoot gesture',
      () => GESTURE_MODE_LABELS[settings.get().gestureMode],
      () => settings.update({ gestureMode: nextOf(GESTURE_MODES, settings.get().gestureMode) }),
    )
    this.addStepper(
      'Thumb sensitivity',
      () => settings.get().thumbSensitivity,
      (thumbSensitivity) => settings.update({ thumbSensitivity }),
      SENSITIVITY_STEP,
      SENSITIVITY_RANGE.min,
      SENSITIVITY_RANGE.max,
      (value) => `${Math.round(value * 100)}%`,
    )
    this.addStepper(
      'Recoil sensitivity',
      () => settings.get().recoilSensitivity,
      (recoilSensitivity) => settings.update({ recoilSensitivity }),
      SENSITIVITY_STEP,
      SENSITIVITY_RANGE.min,
      SENSITIVITY_RANGE.max,
      (value) => `${Math.round(value * 100)}%`,
    )
    this.addStepper(
      'Cooldown',
      () => settings.get().cooldownMs,
      (cooldownMs) => settings.update({ cooldownMs }),
      COOLDOWN_STEP_MS,
      COOLDOWN_RANGE_MS.min,
      COOLDOWN_RANGE_MS.max,
      (value) => `${value} ms`,
    )
    this.addCycle(
      'Aim smoothing',
      () => SMOOTHING_LABELS[settings.get().smoothingPreset],
      () => settings.applyPreset(nextOf(SMOOTHING_PRESETS, settings.get().smoothingPreset)),
    )
    this.addToggle('Mirror image', 'mirror')
    this.addToggle('Camera preview', 'showPreview')
    this.addToggle('Debug overlay', 'showDebug')

    this.buttons.add(
      new Button(this, centerX, BACK_Y, 'Back', 260, 56, () => this.scene.start(SCENE_KEYS.menu)),
    )
    new Crosshair(this, this.services.bus)

    const off = settings.subscribe(() => this.refresh())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, off)
    this.refresh()
  }

  private nextRowY(): number {
    const y = FIRST_ROW_Y + this.rowIndex * ROW_SPACING
    this.rowIndex += 1
    return y
  }

  private addLabel(y: number, label: string): void {
    this.add
      .text(LABEL_X, y, label, {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5)
      .setDepth(UI_DEPTH)
  }

  private addCycle(label: string, getText: () => string, onActivate: () => void): void {
    const y = this.nextRowY()
    this.addLabel(y, label)
    const button = new Button(
      this,
      VALUE_X,
      y,
      getText(),
      CYCLE_BUTTON_WIDTH,
      ROW_HEIGHT,
      onActivate,
    )
    this.buttons.add(button)
    this.refreshers.push(() => button.setLabel(getText()))
  }

  private addToggle(
    label: string,
    key: keyof Pick<Settings, 'mirror' | 'showPreview' | 'showDebug'>,
  ): void {
    const { settings } = this.services
    const text = () => (settings.get()[key] ? 'On' : 'Off')
    this.addCycle(label, text, () => settings.update({ [key]: !settings.get()[key] }))
  }

  private addStepper(
    label: string,
    get: () => number,
    set: (value: number) => void,
    step: number,
    min: number,
    max: number,
    format: (value: number) => string,
  ): void {
    const y = this.nextRowY()
    this.addLabel(y, label)
    const change = (delta: number) => set(clamp(roundTo(get() + delta, 2), min, max))
    this.buttons.add(
      new Button(this, MINUS_X, y, '-', STEP_BUTTON_WIDTH, ROW_HEIGHT, () => change(-step)),
    )
    this.buttons.add(
      new Button(this, PLUS_X, y, '+', STEP_BUTTON_WIDTH, ROW_HEIGHT, () => change(step)),
    )
    const value = this.add
      .text(VALUE_X, y, format(get()), {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(UI_DEPTH)
    this.refreshers.push(() => value.setText(format(get())))
  }

  private refresh(): void {
    for (const refresh of this.refreshers) refresh()
  }
}

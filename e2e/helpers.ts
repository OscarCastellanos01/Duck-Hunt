import { expect, type Page } from '@playwright/test'

export const GAME_WIDTH = 960
export const MENU_BUTTONS = { camera: [480, 215], mouse: [480, 285], settings: [480, 355] } as const
export const CALIBRATION_BUTTONS = { primary: [340, 405], back: [620, 405] } as const
export const SETTINGS_FIRST_CYCLE = [740, 108] as const

declare global {
  interface Window {
    __duckGesture?: {
      activeScene: () => string | null
      inputMode: () => string | null
      startScene: (key: string) => void
    }
  }
}

export const collectErrors = (page: Page): string[] => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

export const activeScene = (page: Page) =>
  page.evaluate(() => window.__duckGesture?.activeScene() ?? null)

export const waitForScene = async (page: Page, scene: string, timeout = 15_000) => {
  await expect.poll(() => activeScene(page), { timeout }).toBe(scene)
}

export const clickGame = async (page: Page, [x, y]: readonly [number, number]) => {
  const box = await page.locator('#game canvas').boundingBox()
  if (!box) throw new Error('Game canvas not found')
  const scale = box.width / GAME_WIDTH
  await page.mouse.click(box.x + x * scale, box.y + y * scale)
}

export const openGame = async (page: Page) => {
  await page.goto('/?e2e')
  await waitForScene(page, 'Menu')
}

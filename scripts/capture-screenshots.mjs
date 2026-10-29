import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173'
const OUTPUT_DIR = new URL('../docs/screenshots/', import.meta.url)
const VIEWPORT = { width: 1280, height: 720 }
const GAME_WIDTH = 960
const MENU_CAMERA_BUTTON = [480, 215]
const CALIBRATION_PRIMARY_BUTTON = [340, 405]
const GAMEPLAY_DELAY_MS = 12000

const activeScene = (page) => page.evaluate(() => window.__duckGesture?.activeScene() ?? null)

const waitForScene = async (page, scene) => {
  await page.waitForFunction((key) => window.__duckGesture?.activeScene() === key, scene, {
    timeout: 30_000,
  })
}

const clickGame = async (page, [x, y]) => {
  const box = await page.locator('#game canvas').boundingBox()
  const scale = box.width / GAME_WIDTH
  await page.mouse.click(box.x + x * scale, box.y + y * scale)
}

const shot = (page, name) =>
  page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, OUTPUT_DIR)) })

await mkdir(OUTPUT_DIR, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const page = await browser.newPage({ viewport: VIEWPORT })
  await page.goto(`${BASE_URL}/?e2e&demo`)
  await waitForScene(page, 'Menu')
  await shot(page, 'menu')

  await clickGame(page, MENU_CAMERA_BUTTON)
  await waitForScene(page, 'Calibration')
  await clickGame(page, CALIBRATION_PRIMARY_BUTTON)
  await page.waitForFunction(() => window.__duckGesture?.inputMode() === 'camera')
  await page.waitForTimeout(2500)
  await shot(page, 'calibration')

  await page.evaluate(() => window.__duckGesture?.startScene('Game'))
  await waitForScene(page, 'Game')
  await page.waitForTimeout(GAMEPLAY_DELAY_MS)
  await shot(page, 'gameplay')
  console.log(`Captured screenshots in docs/screenshots (scene: ${await activeScene(page)})`)
} finally {
  await browser.close()
}

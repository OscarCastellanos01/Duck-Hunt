import { expect, test } from '@playwright/test'
import {
  CALIBRATION_BUTTONS,
  MENU_BUTTONS,
  SETTINGS_FIRST_CYCLE,
  clickGame,
  collectErrors,
  openGame,
  waitForScene,
} from './helpers'

test('starts and reaches the menu without errors', async ({ page }) => {
  const errors = collectErrors(page)
  await openGame(page)
  await expect(page.locator('#game canvas')).toBeVisible()
  expect(errors).toEqual([])
})

test('plays with the mouse and keyboard', async ({ page }) => {
  const errors = collectErrors(page)
  await openGame(page)
  await clickGame(page, MENU_BUTTONS.mouse)
  await waitForScene(page, 'Game')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await page.waitForTimeout(500)
  await waitForScene(page, 'Game')
  expect(errors).toEqual([])
})

test('opens the camera setup, loads the model and starts the fake camera', async ({ page }) => {
  const errors = collectErrors(page)
  await openGame(page)
  await clickGame(page, MENU_BUTTONS.camera)
  await waitForScene(page, 'Calibration')
  await clickGame(page, CALIBRATION_BUTTONS.primary)
  await expect
    .poll(() => page.evaluate(() => window.__duckGesture?.inputMode() ?? null), { timeout: 45_000 })
    .toBe('camera')
  await expect(page.locator('.camera-preview video')).toHaveCount(1)
  await waitForScene(page, 'Calibration')
  expect(errors).toEqual([])
})

test('persists settings changes', async ({ page }) => {
  await openGame(page)
  await clickGame(page, MENU_BUTTONS.settings)
  await waitForScene(page, 'Settings')
  await clickGame(page, SETTINGS_FIRST_CYCLE)
  const stored = await page.evaluate(() => window.localStorage.getItem('duck-gesture:settings'))
  expect(JSON.parse(stored ?? '{}')).toMatchObject({ gestureMode: 'recoil' })
})

test('serves the manifest and the WASM runtime with the right types', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest')
  expect(manifest.ok()).toBe(true)
  expect(await manifest.json()).toMatchObject({ name: 'duck-gesture', display: 'fullscreen' })

  const wasm = await request.get('/mediapipe/wasm/vision_wasm_internal.wasm')
  expect(wasm.ok()).toBe(true)
  expect(wasm.headers()['content-type']).toContain('application/wasm')

  const model = await request.get('/models/hand_landmarker.task')
  expect(model.ok()).toBe(true)
})

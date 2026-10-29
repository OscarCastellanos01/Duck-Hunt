import { mkdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const DUCK_PATH = new URL('../public/assets/PNG/Objects/duck_yellow.png', import.meta.url)
const OUTPUT_DIR = new URL('../public/icons/', import.meta.url)
const BACKGROUND = 'linear-gradient(#6ec6ff, #3fa2e0)'

const icons = [
  { file: 'icon-192.png', size: 192, duckScale: 0.7 },
  { file: 'icon-512.png', size: 512, duckScale: 0.7 },
  { file: 'icon-maskable-512.png', size: 512, duckScale: 0.5 },
  { file: 'apple-touch-icon.png', size: 180, duckScale: 0.7 },
]

const duck = (await readFile(DUCK_PATH)).toString('base64')
await mkdir(OUTPUT_DIR, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
try {
  for (const { file, size, duckScale } of icons) {
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    await page.setContent(`
      <style>
        html, body { margin: 0; width: ${size}px; height: ${size}px; }
        body { display: grid; place-items: center; background: ${BACKGROUND}; }
        img { width: ${size * duckScale}px; }
      </style>
      <img src="data:image/png;base64,${duck}" />
    `)
    await page.screenshot({ path: fileURLToPath(new URL(file, OUTPUT_DIR)) })
    await page.close()
    console.log(`Generated ${file}`)
  }
} finally {
  await browser.close()
}

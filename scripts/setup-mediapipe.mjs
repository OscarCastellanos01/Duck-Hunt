import { cp, mkdir, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const root = new URL('../', import.meta.url)
const wasmSource = new URL('node_modules/@mediapipe/tasks-vision/wasm/', root)
const wasmTarget = new URL('public/mediapipe/wasm/', root)
const modelTarget = new URL('public/models/hand_landmarker.task', root)
const force = process.argv.includes('--force')

const exists = async (url) => {
  try {
    await stat(url)
    return true
  } catch {
    return false
  }
}

await mkdir(wasmTarget, { recursive: true })
await cp(fileURLToPath(wasmSource), fileURLToPath(wasmTarget), { recursive: true })
console.log('Copied MediaPipe WASM runtime to public/mediapipe/wasm')

if (!force && (await exists(modelTarget))) {
  console.log('Model already present, skipping download (use --force to replace it)')
} else {
  const response = await fetch(MODEL_URL)
  if (!response.ok) {
    throw new Error(`Model download failed: ${response.status} ${response.statusText}`)
  }
  await mkdir(new URL('./', modelTarget), { recursive: true })
  await writeFile(modelTarget, Buffer.from(await response.arrayBuffer()))
  console.log('Downloaded hand_landmarker.task to public/models')
}

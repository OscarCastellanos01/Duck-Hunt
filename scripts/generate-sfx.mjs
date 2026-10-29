import { mkdir, writeFile } from 'node:fs/promises'
import { sfxr } from 'jsfxr'

const OUTPUT_DIR = new URL('../public/audio/', import.meta.url)
const SEED = 20260101

const NOISE = 3
const SAW = 1

const sounds = {
  shoot: {
    preset: 'explosion',
    params: {
      wave_type: NOISE,
      p_env_attack: 0,
      p_env_sustain: 0.04,
      p_env_decay: 0.22,
      p_env_punch: 0.7,
      p_base_freq: 0.5,
      p_freq_ramp: -0.35,
      p_lpf_freq: 0.75,
      sound_vol: 0.3,
    },
  },
  empty: {
    preset: 'click',
    params: { wave_type: NOISE, p_env_sustain: 0.01, p_env_decay: 0.05, p_base_freq: 0.85, sound_vol: 0.2 },
  },
  hit: { preset: 'hitHurt', params: { sound_vol: 0.25 } },
  hitGolden: { preset: 'pickupCoin', params: { sound_vol: 0.25 } },
  reload: { preset: 'blipSelect', params: { p_base_freq: 0.35, p_env_decay: 0.12, sound_vol: 0.2 } },
  roundClear: { preset: 'powerUp', params: { sound_vol: 0.25 } },
  gameOver: {
    preset: 'hitHurt',
    params: {
      wave_type: SAW,
      p_env_sustain: 0.3,
      p_env_decay: 0.5,
      p_base_freq: 0.3,
      p_freq_ramp: -0.25,
      sound_vol: 0.25,
    },
  },
  select: { preset: 'blipSelect', params: { sound_vol: 0.2 } },
  record: { preset: 'pickupCoin', params: { p_arp_mod: 0.4, p_arp_speed: 0.5, sound_vol: 0.25 } },
}

const seededRandom = (seed) => {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

const originalRandom = Math.random
Math.random = seededRandom(SEED)

await mkdir(OUTPUT_DIR, { recursive: true })
for (const [name, { preset, params }] of Object.entries(sounds)) {
  const sound = Object.assign(sfxr.generate(preset), params)
  const wave = sfxr.toWave(sound)
  await writeFile(new URL(`${name}.wav`, OUTPUT_DIR), Buffer.from(wave.wav))
  console.log(`Generated ${name}.wav (${wave.wav.length} bytes)`)
}

Math.random = originalRandom

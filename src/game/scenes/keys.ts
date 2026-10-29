export const SCENE_KEYS = {
  boot: 'Boot',
  preload: 'Preload',
  menu: 'Menu',
  game: 'Game',
  gameOver: 'GameOver',
  settings: 'Settings',
  calibration: 'Calibration',
} as const

export interface GameOverData {
  score: number
  hits: number
  shots: number
  newRecord: boolean
}

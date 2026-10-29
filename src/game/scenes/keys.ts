export const SCENE_KEYS = {
  boot: 'Boot',
  preload: 'Preload',
  menu: 'Menu',
  game: 'Game',
  gameOver: 'GameOver',
} as const

export interface GameOverData {
  score: number
  round: number
  newRecord: boolean
}

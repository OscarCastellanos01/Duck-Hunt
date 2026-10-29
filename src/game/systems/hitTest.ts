export interface Target {
  x: number
  y: number
  radius: number
}

export const findHitTarget = (
  targets: readonly Target[],
  x: number,
  y: number,
  assistPx: number,
): number => {
  let best = -1
  let bestDistance = Infinity
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]
    if (!target) continue
    const distance = Math.hypot(target.x - x, target.y - y)
    if (distance <= target.radius + assistPx && distance < bestDistance) {
      best = i
      bestDistance = distance
    }
  }
  return best
}

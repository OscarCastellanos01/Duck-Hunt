import type { HandFrame } from '@/core/types'
import { LM } from '@/gestures/handGeometry'

const CONNECTIONS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
]

const LINE_COLOR = '#3ddc84'
const POINT_COLOR = '#ffffff'
const HIGHLIGHT_COLOR = '#ff5252'
const POINT_RADIUS = 3
const HIGHLIGHT_RADIUS = 6

export class LandmarkRenderer {
  private readonly context: CanvasRenderingContext2D

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')
    if (!context) throw new Error('2D canvas is not available')
    this.context = context
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width) this.canvas.width = width
    if (this.canvas.height !== height) this.canvas.height = height
  }

  clear(): void {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  draw(frame: HandFrame | null): void {
    this.clear()
    if (!frame) return
    const { width, height } = this.canvas
    const ctx = this.context
    ctx.lineWidth = 2
    ctx.strokeStyle = LINE_COLOR
    ctx.beginPath()
    for (const [from, to] of CONNECTIONS) {
      const a = frame.landmarks[from]
      const b = frame.landmarks[to]
      if (!a || !b) continue
      ctx.moveTo(a.x * width, a.y * height)
      ctx.lineTo(b.x * width, b.y * height)
    }
    ctx.stroke()
    frame.landmarks.forEach((point, index) => {
      const highlighted = index === LM.indexTip || index === LM.thumbTip
      ctx.fillStyle = highlighted ? HIGHLIGHT_COLOR : POINT_COLOR
      ctx.beginPath()
      ctx.arc(
        point.x * width,
        point.y * height,
        highlighted ? HIGHLIGHT_RADIUS : POINT_RADIUS,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    })
  }
}

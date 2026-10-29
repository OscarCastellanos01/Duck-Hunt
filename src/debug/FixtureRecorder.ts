import type { HandFrame } from '@/core/types'
import { type FixtureFile, type FixtureFrame, serializeFrame } from '@/gestures/fixture'

export class FixtureRecorder {
  private frames: FixtureFrame[] = []
  private startTime = 0
  private aspect = 1
  private active = false

  constructor(private readonly durationMs: number) {}

  get recording(): boolean {
    return this.active
  }

  start(now: number): void {
    this.frames = []
    this.startTime = now
    this.active = true
  }

  push(frame: HandFrame | null, now: number): FixtureFile | null {
    if (!this.active) return null
    if (frame) this.aspect = frame.aspect
    this.frames.push(serializeFrame(frame, now - this.startTime))
    if (now - this.startTime < this.durationMs) return null
    this.active = false
    return { version: 1, aspect: this.aspect, frames: this.frames }
  }
}

export const downloadJson = (fileName: string, data: unknown): void => {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

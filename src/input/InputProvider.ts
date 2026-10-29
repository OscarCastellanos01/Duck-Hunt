export interface InputProvider {
  start(): Promise<void>
  stop(): void
}

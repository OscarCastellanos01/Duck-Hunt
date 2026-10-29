# duck-gesture

A duck shooting gallery game, inspired by the classic Duck Hunt mechanic, that you play with your hand in front of the camera. Shape your hand like a pistol to aim and use a gesture to shoot. Everything runs in the browser: no server, no accounts, and the camera video never leaves your device.

> This project was built with the help of AI. For that reason, English is the primary language of the code, documentation and interface.

## How it works

- **Aim:** the tip of your index finger controls the crosshair.
- **Gun pose:** extended index finger, thumb pointing up, and the middle, ring and little fingers curled.
- **Shoot:** one of two gestures, selectable in the settings.
  - `thumb`: drop your thumb like a hammer (default).
  - `recoil`: flick your hand upward like a pistol kick.
  - `both`: either gesture fires.
- **Fallback:** a mouse input provider lets you play without a camera.

Hand tracking uses the MediaPipe Hand Landmarker. Gesture logic (One Euro Filter smoothing and a small state machine) is plain TypeScript, and the game itself is built with Phaser 3.

## Architecture

Three layers with one-way dependencies: `input → gestures → game`. The game never sees landmarks or MediaPipe, it only consumes typed events: `aim`, `shoot`, `poseChanged`, `trackingLost` and `trackingFound`.

```
src/
  core/       config, typed event bus, settings, shared types
  input/      camera, hand tracker and mouse input providers
  gestures/   filters, hand geometry, pose and shoot detection, state machine
  game/       Phaser scenes, entities, systems and UI
  assets/     logical asset manifest
```

## Tech stack

TypeScript (strict), Vite, pnpm, `@mediapipe/tasks-vision`, Phaser 3, Vitest, Playwright, ESLint and Prettier. Planned: PWA support via `vite-plugin-pwa` and hosting on Cloudflare Pages.

## Getting started

```bash
pnpm install
pnpm setup:mediapipe
pnpm dev
```

`pnpm setup:mediapipe` copies the MediaPipe WASM runtime and downloads the hand landmarker model so both are served from the application's own domain. To try the app from a phone on the local network, use `pnpm dev:https`.

`localhost` is allowed to use the camera without HTTPS. Other scripts:

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `pnpm build`        | Typecheck and production build                 |
| `pnpm preview`      | Preview the production build                   |
| `pnpm typecheck`    | Run `tsc --noEmit`                             |
| `pnpm lint`         | Run ESLint                                     |
| `pnpm format`       | Run Prettier                                   |
| `pnpm test`         | Run unit tests with Vitest                     |
| `pnpm generate:sfx` | Regenerate the sound effects in `public/audio` |

## Privacy

The camera video is processed locally in your browser. Nothing is recorded or uploaded.

## Assets and licenses

Only freely licensed assets are used (CC0, such as the Kenney "Shooting Gallery" set). Every asset is listed in `CREDITS.md`. No Nintendo material is included.

## Status

Early development. The game is playable with the mouse or the camera: rounds, waves, three duck types, ammo, streak scoring and a stored high score.

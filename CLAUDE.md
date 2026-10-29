# CLAUDE.md — duck-gesture

This document defines the technical specification and engineering conventions of the project.

## Overview

`duck-gesture` is a duck shooting gallery game, inspired by the classic Duck Hunt mechanic, controlled with the player's hand in front of the camera. A hand shaped like a pistol aims, and a gesture fires. The project has no backend and no monetization, and it is expected to meet a high standard of visual and interaction quality.

`duck-gesture` is a working title. Once the final name is defined, it must be updated in `package.json`, `index.html` and the PWA manifest.

## Goals and non-goals

**Goals**

- Real-time hand and gesture detection in the browser, without a server.
- Low and stable latency (see the performance budget).
- Clean architecture: the game never touches landmarks and only consumes events.
- Fully publishable: every asset has a clear license (CC0) and no protected third-party material is included.
- Works on desktop and on Android (Chrome), installable as a PWA.

**Non-goals (for now)**

- Backend, accounts, global leaderboards, advertising, app stores (Capacitor).
- Multiplayer.
- Reproducing Nintendo characters, sprites, sounds or music.

## Technology stack

The stack below is fixed. Any change requires prior review.

| Layer                   | Technology                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Language                | TypeScript (`strict: true`), pinned to 6.x until `typescript-eslint` supports 7           |
| Build / package manager | Vite + pnpm                                                                               |
| Camera                  | `getUserMedia` (WebRTC), ideal 640x480 @ 60 fps                                           |
| Hand detection          | `@mediapipe/tasks-vision` (Hand Landmarker, GPU delegate, `runningMode: "VIDEO"`, 1 hand) |
| Frame synchronization   | `HTMLVideoElement.requestVideoFrameCallback` (fallback to `requestAnimationFrame`)        |
| Gestures                | Custom TypeScript: One Euro Filter + state machine                                        |
| Game                    | Phaser 3 (scenes, sprites, arcade physics, particles, tweens)                             |
| Audio                   | Phaser / Web Audio + effects generated with jsfxr                                         |
| Quality                 | ESLint + Prettier + Vitest                                                                |
| E2E                     | Playwright (Chrome fake camera)                                                           |
| PWA                     | `vite-plugin-pwa`                                                                         |
| Hosting                 | Cloudflare Pages                                                                          |
| Persistence             | `localStorage` (high score and settings)                                                  |
| Debug                   | Custom overlay with fps and latency (`stats.js` + `performance.now()`)                    |

## Commands

```bash
pnpm install
pnpm dev             # local server (localhost allows the camera without HTTPS)
pnpm dev:https       # vite --host with @vitejs/plugin-basic-ssl, to test from a phone on the local network
pnpm build           # typecheck + production build
pnpm preview
pnpm typecheck       # tsc --noEmit
pnpm lint
pnpm test            # vitest
pnpm e2e             # playwright
pnpm setup:mediapipe # copies the tasks-vision .wasm files to public/mediapipe/wasm and downloads the model
```

A task is complete only when `pnpm typecheck && pnpm lint && pnpm test` all pass.

## Structure

```
src/
  main.ts                  # bootstrap: creates Phaser.Game and services
  core/
    config.ts              # constants and defaults (no magic numbers elsewhere)
    eventBus.ts            # typed event emitter
    settings.ts            # loads/saves settings in localStorage with defaults and validation
    types.ts               # shared types (Landmark, HandFrame, GameEvents...)
  input/
    InputProvider.ts       # common interface
    InputController.ts     # switches the active provider (mouse or camera)
    GestureInput.ts        # camera provider: tracker + camera + gesture machine
    CameraInput.ts         # getUserMedia + device selection + frame loop
    HandTracker.ts         # wraps the MediaPipe Hand Landmarker, returns HandFrame
    MouseInput.ts          # fallback provider (mouse) for development and testing
  gestures/
    oneEuroFilter.ts       # smoothing filter
    handGeometry.ts        # pure functions: distances, angles, hand size, finger extension
    poseDetector.ts        # is it a gun pose? (pure functions + hysteresis)
    shootDetectors.ts      # ThumbDropDetector and RecoilDetector (same interface)
    gestureMachine.ts      # FSM: Idle → Gun → Shoot → Cooldown; emits events
    fixture.ts             # landmark recording format: parsing and replay helpers
  debug/                   # metrics, debug overlay, camera preview, landmark renderer, fixture recorder
  game/
    scenes/                # Boot, Preload, Calibration, Menu, Game, GameOver, Settings
    entities/              # Duck, Crosshair, ...
    systems/               # spawner, scoring, rounds, ammo, difficulty
    ui/                    # HUD, debug overlay, settings panel
  assets/
    manifest.ts            # single place that maps logical names → files
scripts/
  setup-mediapipe.mjs      # copies the WASM runtime and downloads the model
public/
  assets/                  # sprites, audio (freely licensed only)
  mediapipe/wasm/          # MediaPipe runtime served from our own domain
  models/hand_landmarker.task
  _headers                 # cache headers for Cloudflare Pages
tests/
  fixtures/                # landmark recordings in JSON
CREDITS.md                 # author and license of each asset
```

### Architecture rules

1. **Three layers with one-way dependencies**: `input → gestures → game`. The game only knows the `eventBus`, never landmarks or MediaPipe.
2. Minimal public events (typed in `core/types.ts`):
   - `aim`: `{ x, y, t }` with normalized 0..1 coordinates, already smoothed and mirrored.
   - `shoot`: `{ x, y, t }` aim position at the moment of the shot.
   - `poseChanged`: `{ pose: 'none' | 'gun' }`.
   - `trackingLost` / `trackingFound`.
3. Gesture logic is **pure and testable**: it receives `HandFrame[]` and returns events, without touching the DOM, the camera or Phaser.
4. Every input provider implements `InputProvider`. `MouseInput` must allow playing and testing the whole game without a camera.
5. Thresholds live in `core/config.ts` and can be overridden from `settings`.

## Gesture specification

MediaPipe landmarks (21 points): 0 wrist; 1-4 thumb (CMC, MCP, IP, TIP); 5-8 index (MCP, PIP, DIP, TIP); 9-12 middle; 13-16 ring; 17-20 pinky.

- **Hand size** (used to normalize all distances): distance from the wrist (0) to the middle finger base (9). Absolute pixel values are not used.
- **Mirrored hand**: the image is displayed as a mirror, so invert X when computing the aim.
- **Aim**: index fingertip (landmark 8), mapped to the play area and smoothed with a One Euro Filter (parameters adjustable in settings).
- **Gun pose**: index extended, thumb extended upward, and middle/ring/pinky curled. A finger is "curled" if its tip is closer to the wrist than its PIP joint, with a margin relative to hand size. Use **hysteresis** (different enter and exit thresholds) and require N consecutive frames to enter or leave the pose, to avoid flicker.

### Two shooting modes (both implemented, selectable in Settings)

Setting `gestureMode`: `'thumb' | 'recoil' | 'both'`. **Default: `'thumb'`**.

1. **`thumb` — thumb drop (the hammer).** The thumb drops toward the middle finger or the index base without moving the hand. Computed as the distance from the thumb tip (4) to the middle finger base (9), normalized by hand size. A shot fires when the threshold is crossed downward (with hysteresis to rearm). It is a pose change detectable in 1-2 frames and does not move the aim.
2. **`recoil` — upward kick.** With the gun pose active, an upward vertical impulse of the hand (index base or wrist) above a normalized velocity threshold within a short window (~100-150 ms). **Design constraint:** because the hand rises when firing, the aim shifts. The shot position is therefore taken from a **circular buffer** of positions, using the aim from ~100-150 ms _before_ the impulse (parameter `recoilAimLookbackMs`).
3. **`both`**: either gesture fires. They share the same cooldown to avoid double shots.

Both detectors implement the same interface. `ShootDetector.update(sample, out)` receives a sample (hand frame, smoothed aim and pose state), writes the shot into a reused `out` event and returns whether it fired, which avoids per-frame allocations.

The gun pose requires an extended thumb only to be entered. Once active, the thumb is ignored when deciding whether to leave the pose, because the thumb drop is the trigger gesture of the `thumb` mode.

### State machine

`Idle` (no hand or no pose) → `Gun` (stable pose) → `Shoot` (emits `shoot`) → `Cooldown` (250 ms by default, configurable) → back to `Gun` if the pose persists, or to `Idle`.

If tracking is lost: emit `trackingLost`, freeze the aim for about 300 ms, then show an on-screen notice.

## Settings (settings screen, persisted in `localStorage`)

- Gesture mode: `thumb` / `recoil` / `both`.
- Shoot gesture sensitivity (threshold) per mode.
- Cooldown between shots.
- Aim smoothing (One Euro Filter parameters, with presets: Precise / Balanced / Smooth).
- Image mirroring (enabled by default).
- Camera selection (if several are available).
- Show camera preview and drawn landmarks (on/off).
- Debug overlay: fps, camera→inference latency, gesture→shot latency (on/off).
- Input: camera or mouse.
- Music and effects volume.

Changes must apply live, without reloading. Validate stored values on load (if corrupt, fall back to defaults).

## Performance budget

- Target: **≥ 30 stable inference fps** on a mid-range Android device; ≥ 55 fps game rendering.
- Input→on-screen-shot latency: **p95 < 150 ms** on desktop.
- Model input at 640x480 or lower. A single Hand Landmarker with `numHands: 1`.
- No per-frame allocations in the hot path (reuse objects and arrays).
- Inference runs on the main thread in phase 1. **Move it to a Web Worker (with transferable `ImageBitmap`) only if measurements show it blocks rendering.** Measure before optimizing.
- Instrument from the start with `performance.now()`. The debug overlay is mandatory, not optional.

## MediaPipe: model and runtime

- Serve the WASM runtime and the model **from the application's own domain** (not from a third-party CDN), so that they can be cached with custom headers and do not depend on external availability.
- `pnpm setup:mediapipe` must copy `node_modules/@mediapipe/tasks-vision/wasm/*` to `public/mediapipe/wasm/` and download the `hand_landmarker.task` model to `public/models/`. Official model URL (verify it is still valid): `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`.
- Preload the model in the `Preload`/`Calibration` scene with a progress bar.
- If the GPU delegate fails, retry with CPU and show a reduced-performance notice in the debug overlay.

## Camera and privacy

- Request permission with an explanatory screen **before** the browser dialog. Handle clearly: permission denied, no camera, camera in use.
- Video **never leaves the device**: nothing is recorded or uploaded. State this in the interface (short text on the start screen).
- The camera requires HTTPS in production (provided by Cloudflare Pages) or `localhost` in development.
- **Calibration** screen: show the hand, confirm the gun pose is detected and allow testing a shot before starting.

## Assets and licenses

- **Only assets with a free, verifiable license are versioned.** Main source for sprites and HUD: **Kenney "Shooting Gallery"** (CC0): `https://kenney.nl/assets/shooting-gallery`. It includes targets, ducks of various shapes and types, HUD elements and prebuilt texts.
- Shot sound: **The Free Firearm Sound Library** (CC0, OpenGameArt) or custom effects. For the arcade style (impact, duck down, reload, UI) generate effects with **jsfxr** and store the resulting `.wav`/`.mp3` files. Music: pending, CC0 only.
- Sprites, sounds, music or characters from Nintendo, or from any unlicensed third party, must not be included in the repository or the deployment. The dog and other characters from the original game are not replicated.
- Every asset is registered in `CREDITS.md` with name, author, source URL and license, updated in the same commit that adds the asset.
- Code references assets only through `src/assets/manifest.ts` (logical name → path), so the whole set can be swapped without touching game logic.
- To test locally with personal assets, use the `assets-local/` folder (in `.gitignore`) and a `manifest.local.ts` that overrides the manifest. This folder and file are never committed or deployed.

## Game design (baseline)

- Rounds with ducks flying along different trajectories; 3 shots per wave; score depends on the duck type and the streak.
- Progressive difficulty: higher speed, more simultaneous ducks, less predictable trajectories.
- **Generous** hitboxes (gestures have more latency and less precision than a click) and a small aim-assist margin, both configurable in `config.ts`.
- Clear feedback on every shot: sound, flash, particles, slight camera shake, floating score text.
- High score stored in `localStorage`.
- All interface text is in English.

## Code conventions

- Strict TypeScript: `any` is forbidden (use `unknown` and narrow). No `// @ts-ignore` unless justified in a comment.
- Small modules with a single responsibility; pure functions for all gesture math.
- No magic numbers: named constants in `core/config.ts`.
- Imports use the `@/` alias → `src/`.
- Naming: `PascalCase` for classes and scenes, `camelCase` for functions and variables, `UPPER_SNAKE_CASE` for global constants.
- Comments are reserved for behavior that is not self-evident from the code.
- Formatting is enforced by Prettier; code is not manually aligned.
- `console.log` is not permitted in committed code. Use a simple logger toggled from the debug overlay.
- Commits are small and follow the Conventional Commits format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- New dependencies must be justified in the commit message. Prefer what is already in the stack.

## Testing

- **Vitest** for `gestures/`: tests based on landmark recordings in `tests/fixtures/*.json` (gun pose, thumb drop, recoil, open hand, noise, tracking loss). Cover hysteresis, cooldown and the aim buffer of the `recoil` mode.
- The debug overlay includes a **"Record 3 s of landmarks"** button that downloads a JSON file to use as a fixture.
- **Playwright** with `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream` to verify that the app starts, requests the camera, loads the model and reaches the menu. Use `MouseInput` for the game itself.
- Every fixed gesture bug must leave a fixture or test that reproduces it.

## Deployment (Cloudflare Pages)

- Build: `pnpm build`, output in `dist/`.
- `public/_headers` with long immutable caching for `/mediapipe/*`, `/models/*` and `/assets/*` (hashed file names where applicable) and short caching for `index.html`.
- The PWA must not block the first visit by precaching the model: cache it at runtime instead.
- Verify correct MIME types for `.wasm` and `.task`.

## Work plan by phases

Phases are executed sequentially. Each phase is committed on completion before the next one begins.

**Phase 0 — Skeleton.** Vite + strict TS + ESLint/Prettier + Vitest + folder structure + `eventBus` + `settings`. Acceptance: `pnpm dev`, `typecheck`, `lint` and `test` pass.

**Phase 1 — Camera and gesture prototype (no Phaser).** Camera, Hand Landmarker, landmark drawing, gun pose, both shoot detectors, FSM, debug overlay with fps and latency, fixture recording. Acceptance: real fps and latency are visible on a mid-range Android device and on desktop; both modes fire reliably; gesture tests pass. **This phase decides whether the performance budget is viable; document the measured numbers in `docs/perf.md`.**

**Phase 2 — Base game with Phaser.** Scenes, ducks, crosshair, ammo, score, rounds, consuming events only. Test with `MouseInput` first, then with the camera. Kenney assets through the manifest + `CREDITS.md`.

**Phase 3 — Settings and calibration.** Full settings screen, calibration, camera error handling, persistence.

**Phase 4 — Polish.** Audio (jsfxr), particles, feedback, progressive difficulty, loading states, basic accessibility (mouse/keyboard mode, lighting notice).

**Phase 5 — Production.** PWA, cache headers, Cloudflare Pages deployment, E2E, README with a GIF/video of the gesture in action, and `docs/perf.md`.

**Phase 6 (optional, only if measurements require it).** Move inference to a Web Worker.

## Restrictions

- Code under `game/` must not access landmarks or MediaPipe.
- Gesture geometry must not use absolute pixels; all distances are normalized by hand size.
- MediaPipe and the model must not be loaded from third-party CDNs.
- Camera video recordings and images of the user must never be committed.
- No backend, analytics or telemetry may be introduced without explicit approval.
- The stack and the phase plan must not be changed without prior review.
- Assets must not be committed without a corresponding entry in `CREDITS.md`.

## Decision process

Decisions that affect the stack, the license of an asset or the performance budget require review before implementation. Each proposal should present two options together with a justified recommendation.

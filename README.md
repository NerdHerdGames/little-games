# Little Games

A deliberately small, child-friendly, offline-capable browser game collection. The first game, **Star Collector**, is fully playable by touch and also supports keyboards and standard browser gamepads.

## Prerequisites

- Node.js 20.19+ (Node 24 LTS is recommended)
- npm 10+
- A current Chromium, Firefox, or Safari browser

## Installation

```sh
npm install
```

No external assets or runtime services are used.

## Local development

```sh
npm run dev
```

Open the printed local URL. Vite listens on localhost by default; add `-- --host` when testing from a tablet on the same trusted network.

## Testing and validation

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run validate:games
```

`npm run validate` runs formatting, linting, type checking, unit tests, game-registry validation, and a production build.

## Production build

```sh
npm run build
npm run preview
```

Deploy the contents of `dist/` to any static HTTPS host. The manifest uses relative scope/start paths, so a public URL or subdirectory works without a server application.

## PWA testing

PWA installation and service workers require HTTPS (localhost is the development exception). Run a production build and preview it, open browser DevTools → Application, confirm the manifest and service worker, install the app, load it once, then switch DevTools Network to **Offline** and reload. The game should remain playable. Service-worker behavior is intentionally disabled during normal Vite development.

## Android tablet testing

1. Serve the production build over HTTPS, or use `npm run dev -- --host` for same-network layout testing.
2. Open the URL in current Chrome on the tablet and choose **Install app** / **Add to Home screen**.
3. Test landscape orientation, all four simultaneous-safe touch controls, collection, restart, sound, reduced motion, and offline relaunch.
4. Check both a small and large tablet and verify Android display/font scaling does not hide controls.

## Bluetooth-controller testing

Pair the controller in Android settings, open the game, and press a controller button so the browser grants gamepad access. The left stick or D-pad moves; the south/A button confirms; east/B cancels; Start pauses. Disconnect and reconnect during play to verify touch remains available. Browser/OS mappings vary, so test the target controller model.

## Controls

- Touch: large on-screen D-pad and **Go!** button
- Keyboard: arrows or WASD; Enter/Space confirms; Escape cancels; P pauses
- Gamepad: left stick/D-pad; south button confirms; east button cancels; Start pauses

The analog dead zone is configured in `src/config/settings.ts`. Gameplay uses device-independent actions from `ActionState`, including held, newly pressed, and released states.

## Adding another game

1. Add pure rules and tests under `src/games/<game-id>/`.
2. Add a Phaser scene under `src/scenes/`; only read controls through the shared `actions` service.
3. Add the scene to the scene list in `src/main.ts`.
4. Add one metadata entry to `src/games/registry.ts`.
5. Ensure touch alone can complete it, honor mute/reduced motion, and avoid external runtime assets.
6. Run `npm run validate`.

## Architecture

- `src/core`: app-wide preferences and services
- `src/input`: logical action state plus isolated touch, keyboard, and gamepad adapters
- `src/games`: game metadata and independently testable rules
- `src/scenes`: Phaser presentation/gameplay scenes
- `src/ui`: reusable Phaser UI helpers
- `src/config`: dimensions and tunable settings
- `public/assets`: reserved for local, distributable game assets (the initial game uses primitives)

There is no audio asset in the initial sample, so the mute control persists the shared preference and is ready for future sounds; the first game itself remains silent.

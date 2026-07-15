# Little Games

A child-friendly, offline-capable Phaser game collection for Android tablets. The default game library currently contains **Star Collector**, **Dwarf Planet Explorer**, and **Solar System Telescope**.

Star Collector is a small movement-and-collection game. Dwarf Planet Explorer contains five dwarf-planet missions. Solar System Telescope lets children drag through a generated star field, tap the Sun or any of the eight planets, see its name, and optionally hear it spoken by the device.

The app uses only local code and generated Phaser shapes. It has no accounts, ads, analytics, tracking, purchases, or gameplay network requests.

## Prerequisites and installation

- Node.js 20.19 or newer (Node 24 recommended)
- npm 10 or newer

```sh
npm install
```

## Local development

```sh
npm run dev
```

Open the URL printed by Vite. For layout testing from a tablet on the same trusted network:

```sh
npm run dev -- --host
```

## Tests and validation

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run validate:games
npm run build
```

Run every check with `npm run validate`. Unit tests cover logical input transitions, analog dead-zone behavior, settings persistence, progress migration/reset, all five badges, mission rules, and Free Explore data.

## Five missions

- **Ceres:** guide a rover to three bright crater areas.
- **Pluto:** assemble five pieces of Pluto’s heart-shaped region.
- **Haumea:** swipe or hold a movement control to spin a round world into Haumea's stretched shape.
- **Makemake:** pan a telescope field to find Makemake and its moon.
- **Eris:** guide a probe through five deep-space checkpoints.

Completing all five unlocks a calm all-worlds celebration. Free Explore provides illustrations, facts, mission replay, and optional locally provided speech for every dwarf planet.

## Production build

```sh
npm run build
npm run preview
```

Deploy `dist/` to any static HTTPS host. The PWA uses relative start/scope paths, so it can be hosted at a root URL or public subpath.

## Publish with GitHub Pages

The workflow at `.github/workflows/deploy-pages.yml` validates, builds, and publishes the game whenever a commit is pushed to `main`. It can also be started manually from the repository's **Actions** tab.

Before the first deployment, open the GitHub repository and choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. Push the project to the `main` branch, then follow the deployment URL shown by the completed workflow.

The workflow sets Vite's base path from the repository name so application assets and the offline service worker work at `https://USERNAME.github.io/REPOSITORY/`. For a user site repository named `USERNAME.github.io` or a custom domain, change `VITE_BASE_PATH` in the workflow to `/`.

## PWA and offline testing

1. Build and preview the production app.
2. Open DevTools → Application and verify the manifest and active service worker.
3. Load every screen once, install the app, and then enable **Offline** in DevTools Network.
4. Reload and open each mission plus Free Explore. All local files should be served from the precache.

Service workers require HTTPS outside localhost.

## Android tablet testing

1. Open the HTTPS deployment in current Chrome on an Android tablet.
2. Install it with **Install app** or **Add to Home screen**.
3. Test in landscape at multiple Android display/font sizes.
4. Verify every screen with touch only: menus, all five missions, pause panels, fact cards, celebration, badges, Free Explore, settings, and parent information.
5. Confirm reduced motion removes twinkling/pulsing animation and settings survive an app restart.
6. Complete all five badges and verify the celebration and Free Explore routes.
7. Hold the parent reset button for two seconds and verify a short tap does not erase progress.
8. Relaunch in airplane mode after one successful online load.

## Bluetooth-controller testing

Pair the controller in Android settings, open the game, and press a controller button so the browser exposes it. Verify D-pad/left-stick selection in menus and Free Explore, movement in Ceres/Makemake/Eris, placement in Pluto, held movement spinning in Haumea, south/A confirmation, east/B cancellation, and Start pause. Disconnecting the controller must leave touch fully usable; reconnecting should work without reloading.

## Controls

- Touch: large on-screen arrows and **Go!**, plus large scene buttons
- Keyboard: arrows/WASD, Enter/Space, Escape, and P
- Standard gamepad: D-pad/left stick, south button, east button, and Start

Device adapters feed shared logical actions. Scenes never read keyboard or gamepad APIs directly. The analog dead zone is configured in `src/config/settings.ts`.

## Architecture

- `src/core`: app services and scene transitions
- `src/input`: action state and isolated device adapters
- `src/data`: dwarf-planet facts and metadata
- `src/storage`: local badge progress
- `src/accessibility`: optional local browser speech synthesis
- `src/games/ceres`, `src/games/pluto`, `src/games/haumea`, `src/games/makemake`, and `src/games/eris`: Phaser-independent mission rules
- `src/games/puzzle`: reusable placement-puzzle state and validation
- `src/games/timing`: reusable timing-window, angular-distance, and reduced-motion rules
- `src/games/search`: reusable ordered visual-search state, hints, and completion callbacks
- `src/games/registry.ts`: top-level games displayed by the library grid
- `src/scenes`: missions, navigation, fact cards, celebration, Free Explore, settings, and parent information
- `src/ui`: reusable buttons and menu focus
- `src/config`: shared dimensions and input tuning
- `public/assets`: reserved for optimized local assets; initial art uses Phaser primitives

## Adding another dwarf-planet mission

1. Mark the planet playable in `src/data/planets.ts`.
2. Put pure mission state/rules and tests in `src/games/<planet-id>/`.
3. Add its Phaser scene under `src/scenes` and register it in `src/main.ts`.
4. Read controls only from the shared `actions` service; touch must complete the entire mission.
5. Add fact text to the local data layer and reuse or extend the fact-card presentation.
6. Unlock only the matching badge through `ProgressStore`; do not add points, streaks, or currency.
7. Honor mute and reduced motion, use local/generated assets, and run `npm run validate`.

## Adding another top-level game

1. Add the game’s first Phaser scene under `src/scenes` and register it in `src/main.ts`.
2. Add one entry to `src/games/registry.ts` with its title, description, scene key, symbol, and accent color.
3. Use shared input and preferences; touch must be sufficient to complete the game.
4. Add device-independent rules and tests under `src/games/<game-id>`.
5. Run `npm run validate`. The game library grid renders catalog entries automatically.

## Current placeholder limitations

- All planets, the rover, craters, bright spots, and badges are intentionally simple generated shapes.
- Star Collector, Solar System Telescope, and all five dwarf-planet missions are playable. Illustrations and sound feedback remain generated placeholders.
- There are no bundled sounds. The mute preference also disables optional browser text-to-speech.
- Speech voice and pronunciation depend on voices already installed in the browser/operating system; no external speech service is used.

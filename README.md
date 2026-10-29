# Little Games

A child-friendly, offline-capable Phaser game collection for Android tablets. The default game library currently contains **United States Puzzle**, **Sun & Planet Explorer**, **Moon Explorer**, **Rocket Workshop**, **Star Collector**, **Dwarf Planet Explorer**, **Solar System Telescope**, **Fish Tank Quiz**, **Planet Fact Match**, **Dwarf Planet Fact Match**, **Solar System Order**, **Solar System Puzzle**, **Fish Shape Match**, **Shape Flip Match**, **Tractor Trailer Trip**, and **Asteroid Patrol**.

Star Collector is a small movement-and-collection game. Dwarf Planet Explorer contains five dwarf-planet missions. Solar System Telescope lets children explore the Sun, eight planets, and five dwarf planets. Fish Tank Quiz asks simple sea-animal questions before releasing six animals into a swimming tank. Planet Fact Match asks children to drag each of the eight planets to a matching fact and earn stars. Dwarf Planet Fact Match provides the same calm matching activity for Ceres, Pluto, Haumea, Makemake, and Eris. Solar System Order places the Sun, eight planets, and five dwarf planets into a near-to-far sequence. Solar System Puzzle is a separate flat orbit-map puzzle with a fixed Sun, thirteen empty slots, draggable worlds, optional name hints, and gentle distance clues. Its schematic uses average distance, not current orbital positions or true scale. Fish Shape Match asks children to find circle, square, and triangle fish in red, green, and blue. Shape Flip Match uses those same nine combinations in a spoken 18-card memory game. Tractor Trailer Trip asks children to hold Right or Go, then drag three randomly selected farm animals onto the trailers. Asteroid Patrol is a calm auto-shooter where children guide a shielded spaceship, clear five waves of harmless space rocks, and choose friendly upgrades.

**Rocket Workshop** lets children cycle through three noses, cabins, fin sets, and engines to create 81 different rockets. Every piece changes the rocket's speed, lift-off time, or wobble. Choose any of the eight planets or five dwarf planets using the shared pixel planet art, then watch a short automatic flight and safe arrival in orbit. Pause, replay, pick another planet, or change the rocket. All combinations arrive safely; distances and speeds are pretend, not an astronomy simulation. The workshop uses project-owned SVG pixel rocket pieces, so no additional art is required. Sound and still-view controls use the saved app preferences. Touch targets remain at least 64 CSS pixels, including on small screens, with scrolling where needed.

**Moon Explorer** starts with a world picker: Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Haumea, Makemake, and Eris. Every moon from the bundled NASA/JPL catalogue appears in its world's 3D overview, including provisional designations. The October 14, 2026 snapshot contains 465 moons: Earth 1, Mars 2, Jupiter 115, Saturn 293, Uranus 29, Neptune 16, Pluto 5, Haumea 2, Makemake 1, and Eris 1. Mercury, Venus, and Ceres are excluded because they have no known moons. All moons are selectable through pages of eight large buttons, with individual close-ups, parent-world focus, drag/pinch controls, pause, manual steps, spoken facts, and saved mute/reduced-motion settings. NASA imagery is retained for Earth and its Moon; the other surfaces are clearly labeled project-owned illustrations. Display sizes and orbits are schematic, not ephemerides. The renderer uses instanced moon meshes and batched orbit paths to handle large systems. Data sources and refresh instructions are in `src/games/moon-explorer/CATALOGUE.md`; original image credits remain in `public/assets/games/earth-moon-explorer/CREDITS.md`.

**Sun & Planet Explorer** adds a separate 3D solar-system view alongside Moon Explorer. The Sun stays at the center while all eight planets follow circular orbit paths, with the inner planets moving faster. Drag, pinch, or use the large turn/zoom buttons; choose All together, Sun, or any planet for a close-up. Saturn has rings, Jupiter has illustrated bands and a storm, and Earth reuses the existing local NASA surface map. Pause, step all planets manually, hide orbit paths, and read short facts aloud. Saved mute and still-view preferences apply. Sizes, spacing, orbital periods, and planet spins are illustrative, not to scale or tied to real dates. Other surface maps are generated locally. An interactive 2D orbit diagram preserves the controls and facts if WebGL is unavailable. The Three.js view is loaded on entry and disposed on exit; it shares the existing offline renderer chunk and Earth image.

The app uses only local code, local planet art, generated Phaser/SVG shapes, and the locally installed Three.js renderer for the explicitly requested 3D prototype. It has no accounts, ads, analytics, tracking, purchases, or gameplay network requests to external services. Three.js is loaded when the explorer opens and its GPU resources are released when it closes. Low-detail sphere meshes, 2K textures, a capped render resolution, and a 30 FPS animation limit keep the prototype lightweight. The app's service worker caches the renderer and JPEG textures for offline use. Devices without working WebGL 2 show a labeled picture view with facts and navigation instead.

**United States Puzzle** offers all 50 states, one randomly ordered piece at a time.
Drag each colored, labeled piece from the toolbox into its matching map outline,
or tap an outline. Correct pieces snap into place and remain colored on the map;
other drops return to the toolbox without losing progress. Alaska and Hawaii use
insets. Every new piece starts in the whole-map view, with optional Closer view.
Drops within 48 CSS pixels of the matching outline snap into place, including
nearby neighboring outlines. After five unsuccessful attempts with the same piece,
the game places it automatically; the count resets for the next piece. Cancelled
drags and toolbox taps do not count. A question-mark hint can identify the current
outline. A collapsible list of named slots provides
an alternative for keyboard, controller, and screen-reader users. State names can
be read aloud using local speech, and the saved mute preference applies. There are
no automatic animations, timers, penalties, or gameplay network requests. Complete
the map and replay with a new order. Boundary sources and licensing are documented
in `src/games/states-puzzle/CREDITS.md`. Test dragging, small-state zoom, and speech
on the target Android tablet before release.

**Moon Phases Puzzle** lets players drag eight labeled Moon phases into named
spots in a circle around Earth: New Moon at left, waxing phases below, Full Moon
at right, and waning phases above. The central globe reuses the locally bundled
NASA Blue Marble texture (credits in `public/assets/games/earth-moon-explorer/CREDITS.md`).
One shuffled piece appears at a time; tapping a spot or
using the named-slot buttons also works. Wrong drops return to the tray without
losing progress. Optional picture hints show the Northern Hemisphere phase
illustrations. All art is bundled locally; there are no timers, penalties, or
automatic animations. Sound and local speech follow the saved mute setting.
Complete all eight phases and replay with a new order. Check touch dragging,
readability, and local speech on the target Android tablet before release.

**Piano Player** has a collapsible songbook occupying at most 20% of the view,
a labeled chromatic A3–G♯4 octave, and key colors matched to the supplied keyboard
photo. Free play and three guided songs are included: the supplied **This Is
Halloween** sheet excerpt, **Ode to Joy**, and **Mary Had a Little Lamb**. Song notes
show letter names, colors, and the supplied fingering/lyric cues. Correct notes
turn gray with checkmarks; each completed row moves out and the next row enters
above the keyboard. Incorrect keys still sound and leave progress unchanged.
There is no tempo requirement or penalty. Start again, switch songs, hide labels,
or return to free play at any time. Sound is synthesized locally with Web Audio;
saved mute and reduced-motion preferences apply. The song/piano area uses a 30/70
split on tablet screens, with scrolling to preserve 64-pixel keys on narrow
screens. Check note audio, touch, and row transitions on the target Android tablet.

**Paint by Numbers** adds 28 original local vector pictures in Space (Solar System
and all eight planets), Vehicles (police car, ambulance, fire truck, school bus,
garbage truck, race car, airplane, motorcycle), Animals (cat, dog, lion, butterfly,
turtle, fish), and Food (pizza, pasta, chicken tenders with mac ’n’ cheese,
breakfast, sandwich with chips). Pick a collection and picture, select a numbered
color in the right-hand palette, then drag to brush it into matching sections.
The workspace uses an 85% picture / 15% palette split. Strokes are clipped to
visible matching sections, including where shapes overlap; wrong colors leave
the picture unchanged. Three brush sizes, numbered labels, per-color completion,
gentle edge cleanup after 88% coverage, and a confirmed picture reset support calm
touch play. The current picture is retained while browsing; choosing another
picture or leaving the game starts fresh. Saved mute applies; there are no
automatic animations or gameplay network requests. Review the original artwork in
`src/games/paint-by-numbers/art.ts` and test brush feel on the target Android tablet.

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
- `src/games/moon-explorer`: world picker, offline moon catalogue, disposable Three.js system view, and renderer-independent orbit/camera rules
- `src/games/solar-orbit-explorer`: Sun-centered 3D view, 2D fallback, and tested orbit/camera rules
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
- The solar-system explorer uses circular coplanar orbits and illustrated planet surfaces. Its 3D view and touch gestures still need manual checks on the target Android tablet.
- Moon Explorer uses smooth spheres, enlarged small moons, schematic orbits, and generated illustrative surfaces where no source image is bundled. Moon counts reflect a dated snapshot and will need updates as discoveries are announced. It does not model terrain height, eclipses, or real-time positions. Performance should be checked on the target Android tablet.

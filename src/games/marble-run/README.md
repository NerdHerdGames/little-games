# Marble Run Builder

A local, account-free 2D toy workshop registered as `MarbleRun` in Little Games.
Uses the installed Phaser 4.2.1 scene lifecycle and its bundled Matter 0.20 runtime;
there are no new runtime dependencies or remote assets.

## Playing

- Drag a toy from the palette, or tap its card and then tap the board. The large
  palette arrows reveal more toys on touchscreens. Select the hand to stop placing.
- **Snap** highlights explicit endpoint ports. Nearby free ports align their
  positions and opposing tangents; occupied ports show a crossed ring. Pieces
  can also start a separate run. Moving, rotating, scaling, or deleting a connected
  piece disconnects it. **Connect** can reconnect nearby endpoints.
- **Free** allows arbitrary positions and overlaps. **Tune** changes the length
  of suitable tracks in Free mode. Modes never rearrange existing pieces.
- Rotate a chosen toy before placement or select a placed piece and rotate it in
  15-degree steps. Duplicate, delete, undo, and redo work without keyboard shortcuts.
- Drag empty board space to pan, pinch or wheel to zoom, or use the large view
  controls. Fit shows the entire creation. Follow tracks the first active marble
  with a gentle camera; still view keeps the camera stationary.
- **Play** starts/resumes physics; **Pause** freezes it. **Build** resets the
  simulation to its original piece transforms for editing. Rolling 1 or 5 starts
  simulation automatically. The infinity button toggles a spaced continuous stream.
  Reset clears all marbles, queued releases, counts, gate changes, and race results
  while retaining the original track. Editing is locked during play and pause.
- **Marbles** changes color/symbol, size, mass density, bounce, appearance, trails,
  launch speed, gravity, sound volume, and the current play idea. Changes apply to
  newly released marbles; gravity applies immediately. Mute/still-view preferences
  use the app's shared saved preferences.
- **Ideas** contains a gentle run, a two-lane race, a musical staircase, color
  baskets, and a chain reaction. Loading or clearing can be undone.
- **Saves** stores up to 24 named runs in this browser. The latest board is also
  remembered automatically. Storage errors are reported; private/restricted storage
  does not prevent play. Leaving the game stops audio and disposes the physics world,
  input listeners, and overlay.

## Components and real mechanics

36 component types are defined in `registry.ts`. Straight/short/long/flat tracks,
curves, quarter turns, half pipes, vertical drops, platforms, walls, funnels,
loops, and three-port splitters use segmented collision geometry.

Starts dispense batches from every placed source simultaneously. Musical bars and
bells play eight configurable synthesized notes; drums play a short low tone.
Bumpers use restitution, springs and launchers apply an upward velocity, conveyors
apply tangential force to contacting marbles, shelves and elevators move on a
bounded sinusoidal path, wheels rotate colliders, seesaws use a constrained pivot,
pendulums use a length constraint, and dominoes are dynamic rigid bodies. Magnets
and repellers apply distance-limited forces. Portals with matching symbols cycle
between each other, preserving velocity and using a cooldown to avoid bouncing
between portals immediately. Unpaired portals do nothing until paired.

Gate state can be configured in Build mode. Pressure plates toggle every ordinary
gate in the simulation. Color gates pass only matching categories; rainbow gates
pass all colors. Counters count crossings. Baskets collect marbles and show counts;
color-sorting baskets only collect matching symbols (rainbow accepts all). A finish
sensor records the first marble and announces its symbol. Reset restarts the race.
There is no timer, score requirement, penalty, or failure state.

## Architecture

- `types.ts`, `registry.ts`: serializable data and reusable component definitions.
- `connections.ts`: transformed ports, compatibility, alignment, link validation,
  and geometry-based hit testing. Position, outward orientation, connection type,
  and accepted types are explicit. Physics engine objects never enter saves.
- `construction.ts`: device-independent placement previews, editing and history.
- `camera.ts`: screen/world transforms, anchored zoom, pan, and fit.
- `physics.ts`, `matter.ts`: isolated Matter world, collision geometry, marble
  lifecycle, mechanics, and a narrowly typed facade for Phaser's bundled runtime.
- `render.ts`: procedural Canvas 2D art; physics uses fixed world coordinates.
- `document.ts`: bounded undo history, schema validation, and local storage.
- `audio.ts`: locally synthesized, rate-limited sound through shared `AudioSession`.
- `ui.ts`, `style.css`, `MarbleRunScene.ts`: responsive UI and lifecycle orchestration.
- `src/input/ConstructionAdapter.ts`: device events become shared `ActionState`
  construction actions. Individual game code never reads pointer/device APIs.

Physics advances at a fixed 120 Hz with a bounded frame accumulator. Velocity is
capped at 18 Matter units per 60 Hz reference step, keeping substep travel smaller
than track thickness plus the smallest marble diameter. Curves use short segments
with slight overlap at joins. The workshop caps pieces at 300 and marbles (including
queued releases) at 100. Marbles far outside the workspace or older than 90 seconds
are recycled. Hidden tabs sleep using the app lifecycle; elapsed background time
is never replayed. Reduced motion disables trails and automatic camera following,
while physical motion remains essential to the toy.

Saves use the `little-games-marble-runs-v1` localStorage namespace and a version-1
JSON format: pieces (type/ID/position/rotation/scale/properties), explicit links,
mode, experience, gravity, grid, and marble settings. Invalid versions, transforms,
settings, excessive objects, duplicate IDs, unknown types, and corrupt saves are
rejected. Broken/stale connections are removed during validation.

## Validation and review

Run `npm run validate` for formatting, lint, strict TypeScript, all unit tests,
registry validation, and the production/PWA build. Marble-specific tests cover
port tangents and occupancy, curves, branch ports, free overlap, mode preservation,
preview cancellation, pre-placement rotation, undo/redo, save corruption/quota
errors, camera anchoring, fast collisions, batch caps, springs, musical contacts,
color gates, portals, moving/pivoting bodies, pressure switches, magnets, and races.
Input-adapter tests cover capture, drag/tap, pinch cancellation, wheel normalization,
interruption, teardown, and native settings controls.

Manual release review should focus on real Android touch/scroll behavior, sound
balance, long sessions with 100 marbles and many curved pieces, and offline PWA
relaunch on the target tablet. Browser automation can verify interactions and
layouts but does not establish physical tablet performance or audio quality.

## Remaining extensions

The current release is a playable foundation with advanced toys, not every possible
component in the original brief. Deferred work includes a dedicated 2D spiral,
standalone buttons/targets with configurable wiring, linked component groups,
multi-selection, direct drag rotation/length handles, gamepad building controls,
per-lane race progress displays, save thumbnails and JSON import/export, and
background music. Switch plates currently target all gates rather than individually
wired mechanisms. Musical examples use configurable individual notes, not an
editable score or sequencer. Elevators and moving shelves are periodic rather than
programmable. Ramps change scale uniformly, including thickness. Small, schematic
2D loop seams can still require experimentation with launch speed and gravity.

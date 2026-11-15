# Marble Studio — 3D Marble Run Builder

Run `npm install` and `npm run dev`, then choose **3D Marble Run Builder** on the
first page of Little Games. This is a Phaser scene with a lazily loaded Three.js
workshop and bundled Rapier WASM. It uses the existing launcher, action service,
mute/reduced-motion preferences, PWA, and Android asset pipeline.

## Build and play

- Pick one of 59 procedurally illustrated pieces in nine toy-box categories.
  Choose **Add piece** to confirm the translucent preview. A green dot marks a
  compatible, unoccupied connection. New tracks start at the selected/open exit,
  so a complete run can be built using buttons alone.
- **Snap together** solves connector position, forward direction, and up direction
  using quaternions. **Free build** preserves the same pieces and allows arbitrary
  positions, intersections, and X/Y/Z rotations. Drag objects or use the large
  arrows, raise/lower controls, and rotation buttons. More ways to build exposes
  grid alignment and draggable axis arrows; Settings adjusts movement/turn steps. Structural pieces
  can scale; pillars scale in height while keeping a narrow footprint.
- Tap a placed piece to select it, or use **Next piece** and **Find piece**.
  Copy, delete, and 60 undo/redo snapshots are available. Clearing or loading an
  example can be undone. The table holds up to 160 pieces.
- One finger selects/drags; two fingers cancel an unfinished drag and orbit or
  pinch. **Turn view** enables one-finger camera orbit. Camera buttons offer top,
  front, side, overview, follow, and a smoothed marble POV. Pan buttons are in
  Settings. Follow/POV and trails are suppressed by the shared still-view setting.
- Release 1, 5, or 10 marbles **per enabled dispenser**, or use continuous release.
  Piece options can start a marble on another track. Reset removes marbles and
  resets counters, gates, and dominoes; it preserves the construction. The default
  simultaneous limit is 40, adjustable to 20 or 80.
- Settings include six physics presets, eleven marble appearances, size, mass,
  bounce, trails, glow, mute, volume, and a quiet optional original melody.
  Feedback is synthesized locally; available local speech voices read piece names.
- **Ideas** contains six complete constructions. The initial Rainbow ride is
  ready to roll. Adventure choices preserve all pieces: creative sandbox, timed
  racing with synchronized gates and finish results/replay, musical runs with
  editable notes, color sorting with matching-bin counts, and linked chain reactions.
- Piece options configure notes, colors, launch/magnet/belt/wheel strength,
  machine enablement, and links. Matching sorter marbles take the left branch;
  other colors take the right branch. Triggers toggle one linked mechanism.
  Teleporters use their chosen link, or another portal when unlinked.
- Save & load keeps up to 12 named constructions and thumbnails on this device.
  Reusing a name updates a save. Versioned JSON stores plain transforms, connector
  metadata, settings, marble options, adventure, and camera preferences. Loading
  validates versions, types, finite values, bounds, quaternion norms, IDs, and
  connections. No runtime Three.js or Rapier objects are serialized.

## Implementation map

| Module                                 | Responsibility                                                        |
| -------------------------------------- | --------------------------------------------------------------------- |
| `MarbleRun3DScene`                     | Existing Phaser navigation, lazy loading, lifecycle                   |
| `MarbleRun3DGame`                      | Logical actions and orchestration                                     |
| `TrackPieceRegistry`                   | Sampled paths, connector frames, component configurations             |
| `TrackPieceFactory`                    | Shared procedural geometry, materials, mechanism visuals              |
| `ConnectionSystem3D`                   | Compatibility, complete connector transforms, validation              |
| `ConstructionController3D`             | Preview, transforms, duplication, history                             |
| `PhysicsWorld`                         | Rapier bodies, marble pool, fixed steps, collision events, mechanisms |
| `SceneManager`, `CameraManager`        | Disposable rendering, picking, cameras, instanced trails              |
| `GameModeManager`, `AudioManager`      | Adventure definitions/replay and bounded local sound                  |
| `SaveManager`, `MarbleRun3DUI`         | Validated persistence and accessible native controls                  |
| `src/input/ConstructionGestureAdapter` | Device events translated to shared logical actions                    |

Physics runs at 120 Hz with bounded catch-up, CCD, sleeping, and separate collision
groups for marbles, fixed tracks, sensors, movable mechanisms, and decoration.
Static complex tracks use the indexed procedural collision surface. Junctions
omit overlapping interior rails. Motorized tracks are kinematic; the wheel uses
eight compound paddles, the pendulum has a moving collision bob, and dominoes are
dynamic. Springs, trampolines, magnets, conveyors, portals, and linked switches
operate on actual bodies rather than animated marble paths.

Rendering shares geometries/materials, caps DPR at 1.5, limits shadow casters,
reduces resolution/shadows after sustained slow frames, pools marble meshes/bodies,
and instances trail dots. Idle scenes stop redrawing once the camera settles.
Hidden documents stop updating. Shutdown frees WASM world/event queues, GPU
resources, audio voices/context, observers, pointer captures, listeners, and DOM.
PWA precaching includes the lazy physics chunk; there are no runtime CDN requests.

To add a passive track, add a registry definition with a sampled path and
connectors. The factory, snapping, collision generation, palette, and persistence
then support it automatically. New interactive behaviors also need their physical
response in `PhysicsWorld` and any corresponding options in the UI.

## Validation and practical limits

`npm run validate` runs formatting, lint, strict typechecking, the complete unit
suite, registry validation, and a production/PWA build. New tests exercise all
compatible connector pairs under rotated/scaled transforms, history, hostile save
data, pointer cancellation/cleanup, actual example completion in Rapier, sorting,
chain gates, moving paddles, domino contacts, pooling, limits, funnels, and CCD.

Browser checks cover editing/history, save/load, modes, pause/reset, preferences,
navigation/re-entry, 1440/1024/800/390px layouts, and real browser touch events for
dragging and two-finger cancellation/zoom. Target-device Android frame rate,
sound balance, gamepad feel, and motion comfort still warrant hands-on testing.

This is a creative toy simulation rather than a structural engineering model:
supports do not enforce load-bearing constraints; motorized lifts/seesaws run
simple cycles; arbitrary free-build arrangements can jam or launch marbles.
Loops require enough entry momentum, and custom overlapping tracks can obstruct
one another. Replay resets and reruns a race rather than recording a video.
Transparency/glow are lightweight material effects. WebGL 2 is required; an
explicit error with access to saves/navigation appears if 3D cannot initialize.
Saves remain local to the current browser/device; there is no cloud sharing.

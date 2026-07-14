# Permanent Development Rules

- Keep the app framework-free: ordinary HTML, TypeScript, and Phaser unless a future task explicitly changes this.
- Keep TypeScript strict. Do not weaken compiler or lint rules to bypass an error.
- Gameplay reads logical actions from `src/input`; it must never read keyboard, pointer, touch, or gamepad APIs directly.
- Touch must be sufficient to complete every game. Touch targets should be at least 64 CSS pixels.
- Shared systems belong in `src/core`, `src/input`, `src/ui`, or `src/config`; game-specific rules belong under `src/games/<game-id>`.
- Game rules should be device-independent and unit tested. Register every game in `src/games/registry.ts`.
- Use generated/local graphics and audio only. Gameplay must make no external requests.
- Do not add accounts, ads, analytics, tracking, purchases, loot boxes, streaks, or manipulative rewards.
- Avoid punitive failure, harsh sounds, flashing, and color-only communication. Maintain contrast and readable text.
- Honor the saved mute and reduced-motion preferences in every game.
- Preserve offline PWA behavior and public-subpath hosting. Do not introduce runtime CDN dependencies.
- Before finishing a change, run `npm run validate` and fix every failure.

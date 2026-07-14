# Dwarf Planet Explorer Development Rules

## Project purpose

This repository contains small, child-friendly browser games designed primarily for Android tablets.

The current application is **Dwarf Planet Explorer**. New missions must use the established planet data, progress, settings, transition, focus, and input systems.

Games must be easy to play, safe for children, accessible, installable as a PWA, and shareable through a public URL.

## Required validation

Before completing a coding task, run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Permanent Development Rules

- Keep the app framework-free: ordinary HTML, TypeScript, and Phaser unless a future task explicitly changes this.
- Keep TypeScript strict. Do not weaken compiler or lint rules to bypass an error.
- Gameplay reads logical actions from `src/input`; it must never read keyboard, pointer, touch, or gamepad APIs directly.
- Gameplay input must use the shared `ActionState` service (the project InputManager), never device APIs.
- Touch must be sufficient to complete every game. Touch targets should be at least 64 CSS pixels.
- Shared systems belong in `src/core`, `src/input`, `src/ui`, or `src/config`; game-specific rules belong under `src/games/<game-id>`.
- Game rules should be device-independent and unit tested. Register every game in `src/games/registry.ts`.
- Use generated/local graphics and audio only. Gameplay must make no external requests.
- Do not add accounts, ads, analytics, tracking, purchases, loot boxes, streaks, or manipulative rewards.
- Avoid punitive failure, harsh sounds, flashing, and color-only communication. Maintain contrast and readable text.
- Honor the saved mute and reduced-motion preferences in every game.
- Preserve offline PWA behavior and public-subpath hosting. Do not introduce runtime CDN dependencies.
- Before finishing a change, run `npm run validate` and fix every failure.

Fix failures caused by the task before finishing.

## Input rules

- Every game must be completely playable with touch.
- Keyboard and gamepad support are optional enhancements.
- Gameplay code must use the shared action-based input system.
- Do not directly read Phaser keyboard, pointer, or gamepad APIs from individual games.
- Use logical actions such as `confirm`, `primaryAction`, and `moveLeft`.
- Apply an analog dead zone to gamepad sticks.
- Detect newly pressed actions separately from held actions.
- Do not require hover behavior.

## Child-safety rules

- Do not add advertising.
- Do not add analytics or tracking.
- Do not require accounts.
- Do not make external requests during gameplay.
- Do not add purchases, streak pressure, loot boxes, or manipulative engagement systems.
- Avoid punitive failure states and harsh feedback.
- Avoid flashing or rapidly alternating visuals.
- Do not rely exclusively on color to communicate information.

## Accessibility rules

- Use large touch targets.
- Support reduced motion.
- Support muting.
- Use readable text and sufficient contrast.
- Keep instructions short and clear.
- Provide visual feedback for interactive elements.
- Design for landscape tablet use first, while remaining responsive.

## Architecture

- Shared systems belong under `src/core`, `src/input`, or `src/ui`.
- Individual games belong under `src/games`.
- Keep game-specific code isolated.
- Prefer composition over deep inheritance.
- Keep game rules independent of Phaser where practical so they can be unit tested.
- Avoid unnecessary dependencies.
- Avoid introducing React unless explicitly requested.

## Phaser practices

- Verify APIs against the installed Phaser version and current official documentation.
- Do not copy old Phaser examples without checking compatibility.
- Clean up event listeners when scenes shut down.
- Pause or reduce work when the document is hidden.
- Avoid creating new objects every frame.
- Use responsive positions rather than assuming one fixed screen resolution.

## Assets

- Do not introduce copyrighted assets without explicit approval.
- Prefer project-owned assets, public-domain assets, or generated primitives.
- Optimize images and audio for tablet delivery.
- Include attribution when an asset license requires it.

## Task completion

When finishing a task:

1. Summarize the implementation.
2. List validation commands that were run.
3. Report any failures or limitations honestly.
4. Identify files that deserve manual review.

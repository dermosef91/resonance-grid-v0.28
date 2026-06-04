# CLAUDE.md

Guidance for working in **Resonance Grid** — a browser-based roguelike survival
game with an Afrofuturist black/white/orange neon aesthetic (canvas 2D, Vite +
React shell, TypeScript). Also ships as an Android app via Capacitor.

## Commands

- `npm run dev` — local dev server (Vite).
- `npm run build` — **the verification step**: runs `tsc && vite build`. Must pass before merge.
- `npm run preview` — serve the production build.
- Env: set `GEMINI_API_KEY` in `.env.local` (see README).

There are **no tests and no linter** in this repo. "Verifying a change" means:
1. `npm run build` (type safety + bundle), and
2. manual check via the in-game **DebugMenu** (`hooks/useDebugLogic.ts`) to
   force-spawn entities, and the **Compendium** (`components/CompendiumScreen.tsx`,
   auto-populated from `ALL_ENEMIES_DB`).

> Gotcha: if `node_modules` is missing, `tsc` floods with `Cannot find module
> 'react'` / JSX errors. Those are noise — filter output to `services/` to see
> errors in non-UI logic.

## Deploy

Merging/pushing to `main` triggers `.github/workflows/deploy-pages.yml`, which
builds and publishes to GitHub Pages automatically (no manual step):
**https://dermosef91.github.io/resonance-grid-v0.28/**. There is no staging env.

## Code map

- `types.ts` — all shared interfaces + the `EnemyType` enum. `constants.ts` — `COLORS`, `BALANCE`, graphics quality.
- `services/data/*` — **tunable, data-driven content**: `enemies`, `weapons`, `waves`, `upgrades`, `biomes`.
- `services/systems/*` — per-frame update systems (`EnemySystem`, `CollisionSystem`, `ProjectileSystem`, `PlayerSystem`, `WeaponSystem`, `PickupSystem`, `MissionSystem`).
- `services/ai/*` — enemy AI: `behaviors/` implement `IEnemyBehavior`; `EnemyBehaviors.ts` is the registry.
- `services/renderers/*` — neon draw functions (`mobRenderers.ts`, `bosses/*`); `index.ts` is the render registry. `neonRender.ts` is the drawing kit.
- `services/weapons/*` — weapon strategies; `services/audio/*` — synth/scheduler; `services/objectPools.ts` — pooling.
- `gameLogic.ts` — factories (`spawnEnemy`, projectiles, particles) and the `WeaponStrategies` registry.

## Core architecture: data + registry/strategy

Almost everything extensible follows the same shape — **add a data row, then
register a handler keyed by an enum**. Same pattern for enemies, enemy renderers,
and weapons (`WeaponStrategies[weapon.type]`). Prefer extending via data +
handlers over editing engine systems.

### Recipe: add an enemy (7 touch-points)

1. `types.ts` → add to `EnemyType` enum (and any new `Enemy` fields).
2. `services/data/enemies.ts` → add a `MASS` entry **and** an `ALL_ENEMIES_DB` row.
3. `services/ai/behaviors/MobBehaviors.ts` → implement `IEnemyBehavior`.
4. `services/ai/EnemyBehaviors.ts` → register the behavior.
5. `services/renderers/mobRenderers.ts` → add a `drawX()` using the neon kit.
6. `services/renderers/index.ts` → register the renderer.
7. `services/data/waves.ts` → add to a `GRP_*` and/or `LATE_GAME_GROUPS` pool (otherwise it never spawns).

> An enum value with no `ALL_ENEMIES_DB` row is a dangling pitfall (e.g.
> `FERROFLUID_SLIME` exists in the enum but has no data/handlers).

## Engine conventions & invariants

- **Object pooling**: never `new` a projectile/particle — use `getProjectile` /
  `getVisualParticle` / `getTextParticle`. When you add a field to `Projectile`,
  reset it in `objectPools.ts` or state leaks between reused instances.
- **Frame-based timing**: everything counts frames at ~60fps (`attackTimer++`,
  projectile `duration`), never milliseconds.
- **Reuse `Enemy` fields before inventing new ones**: `gravityPull` (the pull on
  the player is applied centrally in `EnemySystem`), `customData` (arbitrary
  per-behavior state), `slowTimer` / `stunTimer` / `bleedTimer`, `immuneTimers`
  (per-weapon hit cooldown), `opacity`, and `beamData` projectiles for tethers/lasers.
- **AI contract**: `IEnemyBehavior.update(enemy, player, ctx) → AIResult`
  (`velocity`, `newProjectiles`, `newEnemies`, `newParticles`, `screenShake`).
  `ctx.spawnEnemy` enables mobile spawners; `ctx.allEnemies` enables auras/links.
- **Damage gating** lives in two places: `CollisionSystem.ts` (projectile→enemy)
  and `EnemySystem.ts` (enemy→player contact). Follow the existing special-case
  style (Trinity shield damage reduction, Monolith reflection, front-arc blocks).
- **Balance levers**: `BALANCE.ENEMY_SCALING_RATE` (≈1.07/wave),
  `BALANCE.XP_GROWTH_RATE`; `MASS` drives separation + knockback resistance;
  player i-frames = 30 frames; `damage = max(1, dmg − armor)`.

## Rendering & performance

- Use the neon kit (`neonStroke` / `neonPoly` / `neonOrb`) with `project3D` /
  `projectSimple` from `renderUtils.ts`. Enemy renderers are called **already
  translated** to the enemy's position (boss pulse is applied centrally).
- The kit deliberately avoids `ctx.shadowBlur` and branches on
  `GRAPHICS_QUALITY` (LOW vs HIGH) for the mobile frame budget — keep new
  renderers cheap on LOW (the wide-halo/core passes are HIGH-only).
- There is a global glow multiplier: `renderService` calls
  `setGlowPulse(beatPulse(frame, ...))` each frame. It is **frame-based**, *not*
  wired to the audio engine. The audio side tracks its own `beatNumber`
  (`ThemeScheduler`/`Instruments`); the `setGlowPulse` hook exists if you ever
  want to drive visuals from the real beat, but they are not currently linked.

## Aesthetic guardrails

Keep new content on-theme: Afrofuturist **black / white / orange** palette
(`COLORS`), neon wireframe look, and African-mythology-flavored naming
(cf. *Utatu*, *Shango*, *Aido-Hwedo*, *Sankofa*, *Anansi*).

## Mobile / platform

Capacitor Android target (`capacitor.config.json`, `webDir: dist`,
appId `com.resonancegrid.game`). Rewarded ads via `@capacitor-community/admob`,
wrapped in `services/AdManager.ts` (`adManager`) and used from
`components/ui/GameOverScreen.tsx`. AdMob calls are native-only — guard
web/dev paths accordingly.

## Workflow

- Branch, commit, open a PR; squash-merge to `main` (which auto-deploys).
- Do not commit `node_modules` / `dist` (gitignored).

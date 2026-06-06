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

The workflow also triggers on certain `claude/*` feature branches — check
`.github/workflows/deploy-pages.yml` for the current branch list.

## Directory structure

```
resonance-grid-v0.28/
├── types.ts              # All shared interfaces + enums (EnemyType, MissionType, GameStatus, …)
├── constants.ts          # COLORS, BALANCE, CANVAS_*, PLAYER_BASE_STATS, DASH, ZOOM_LEVEL
├── index.html / index.tsx / App.tsx   # React entry point
├── services/
│   ├── gameLogic.ts      # Factories: spawnEnemy, createProjectile, particles, etc.
│   ├── gameData.ts       # Re-exports data + BASE_WEAPONS / ARTIFACTS shorthand
│   ├── objectPools.ts    # getProjectile / getVisualParticle / getTextParticle
│   ├── PhysicsSystem.ts  # checkCollision, SpatialHash (200-unit grid), resolveStaticCollision
│   ├── renderService.ts  # Frame render pipeline; calls setGlowPulse each frame
│   ├── renderUtils.ts    # Color lerp, project3D / projectSimple
│   ├── InputSystem.ts    # Keyboard / gamepad / touch abstraction
│   ├── audioEngine.ts    # AudioContext manager + beat sync
│   ├── persistence.ts    # loadMetaState / saveMetaState (localStorage key: resonance_grid_meta_v1)
│   ├── graphicsSettings.ts  # Quality mode toggle, HiDPI
│   ├── AdManager.ts      # @capacitor-community/admob wrapper (native-only)
│   ├── trackingService.ts   # Analytics
│   ├── ai/
│   │   ├── types.ts         # IEnemyBehavior, AIContext, AIResult
│   │   ├── EnemyBehaviors.ts  # Registry: EnemyType → IEnemyBehavior
│   │   ├── utils.ts           # AI math helpers
│   │   └── behaviors/
│   │       ├── MobBehaviors.ts   # ~25 regular-enemy behaviors
│   │       └── BossBehaviors.ts  # 8 boss behaviors
│   ├── audio/
│   │   ├── Synth.ts          # Web Audio oscillator/envelope
│   │   ├── Instruments.ts    # playKick, playSnare, etc.; note→freq
│   │   ├── ThemeScheduler.ts # Beat scheduling, mission themes
│   │   └── constants.ts      # SCALES (pentatonic/blues/minor), WeaponMix
│   ├── data/
│   │   ├── enemies.ts    # MASS record + ALL_ENEMIES_DB (hp/speed/damage/xp/radius/color)
│   │   ├── weapons.ts    # BASE_WEAPONS (11) + WEAPON_AUGMENTS (2 per weapon)
│   │   ├── upgrades.ts   # BASE_ARTIFACTS, GLITCH_UPGRADES, PERMANENT_UPGRADES (11 tiers)
│   │   ├── waves.ts      # GRP_* enemy pools, mission lists, generateRunWaves() → 21 waves
│   │   └── biomes.ts     # ColorPalette definitions (bg/grid/nebula colors)
│   ├── postFx/
│   │   ├── PostProcessor.ts  # WebGL bloom / CRT / color grading
│   │   └── shaders.ts        # GLSL shaders
│   ├── renderers/
│   │   ├── neonRender.ts     # Drawing kit: neonStroke / neonPoly / neonOrb
│   │   ├── index.ts          # EnemyRenderRegistry: EnemyType → draw fn
│   │   ├── mobRenderers.ts   # ~25 regular-enemy draw fns
│   │   ├── playerRenderer.ts
│   │   ├── projectileRenderer.ts
│   │   ├── effectRenderer.ts
│   │   ├── pickupRenderer.ts
│   │   ├── backgroundRenderer.ts
│   │   ├── ObstacleRenderer.ts
│   │   ├── MissionRenderer.ts
│   │   ├── evolvedEffects.ts
│   │   ├── playerAttachments.ts
│   │   └── bosses/           # VanguardRenderer, HiveMindRenderer, CyberKrakenRenderer,
│   │                         # ShangoRenderer, AidoHwedoRenderer, TrinityRenderer,
│   │                         # SolarSeraphRenderer, ChronosGriotRenderer
│   ├── systems/
│   │   ├── PlayerSystem.ts       # Movement, dash, regen, position history
│   │   ├── EnemySystem.ts        # AI dispatch, timers, gravity pull, death/drops
│   │   ├── WeaponSystem.ts       # Cooldowns, weapon leveling, augment tracking
│   │   ├── ProjectileSystem.ts   # Physics, homing, boomerang, beam, chain, etc.
│   │   ├── CollisionSystem.ts    # Projectile→enemy + enemy→player damage gating
│   │   ├── PickupSystem.ts       # Magnetism, XP/health/currency/supply pickup logic
│   │   └── MissionSystem.ts      # Mission init, progress, completion, entity spawning
│   └── weapons/
│       ├── weaponTypes.ts    # WeaponBehavior interface
│       ├── index.ts          # WeaponStrategies registry: WeaponType → fn
│       └── behaviors/
│           ├── standard.ts       # handleProjectile, handleCone, handleHoming
│           ├── area.ts           # handleOrbital, handleAura, handleShockwave, handleRhythmWave
│           ├── special.ts        # handleBeam, handleBoomerang, handleChain, handleTrail,
│           │                     # handleParadoxPendulum, handleFractal
│           └── kaleidoscope.ts   # handleKaleidoscope (white → RGB split on impact)
├── components/
│   ├── Common.tsx            # Shared UI primitives
│   ├── CompendiumScreen.tsx  # Enemy encyclopedia (auto-populated from ALL_ENEMIES_DB)
│   ├── Joystick.tsx          # Virtual stick for mobile
│   ├── UIOverlays.tsx        # Screen composition / exports
│   ├── WeaponIcon3D.tsx      # Animated weapon canvas widget
│   └── ui/
│       ├── MainMenu.tsx
│       ├── GameHUD.tsx           # Health bar, weapons, wave counter, mission progress
│       ├── LevelUpScreen.tsx     # 3 random UpgradeOptions
│       ├── AugmentScreen.tsx     # 2 augment choices per weapon
│       ├── GameOverScreen.tsx    # End-of-run summary, meta rewards, rewarded-ad hook
│       ├── PauseMenu.tsx
│       ├── MissionCompleteScreen.tsx
│       └── DebugMenu.tsx         # Cheat panel for testing
└── hooks/
    ├── useGameEngine.ts    # Master loop: calls all systems, orchestrates state → React
    ├── useGameState.ts     # Initialises entity refs; getInitialPlayer applies meta upgrades
    ├── useEnemyManager.ts  # addEnemies: spawns groups per wave config
    ├── useUpgradeLogic.ts  # generateUpgrades, selectUpgrade, generateAugments, applyAugment
    ├── useDebugLogic.ts    # Force-spawn enemies/missions/pickups
    └── useMenuNav.ts       # Menu state machine
```

## Code map (quick reference)

- `types.ts` — all shared interfaces + the `EnemyType` enum. `constants.ts` — `COLORS`, `BALANCE`, graphics quality.
- `services/data/*` — **tunable, data-driven content**: `enemies`, `weapons`, `waves`, `upgrades`, `biomes`.
- `services/systems/*` — per-frame update systems (`EnemySystem`, `CollisionSystem`, `ProjectileSystem`, `PlayerSystem`, `WeaponSystem`, `PickupSystem`, `MissionSystem`).
- `services/ai/*` — enemy AI: `behaviors/` implement `IEnemyBehavior`; `EnemyBehaviors.ts` is the registry.
- `services/renderers/*` — neon draw functions (`mobRenderers.ts`, `bosses/*`); `index.ts` is the render registry. `neonRender.ts` is the drawing kit.
- `services/weapons/*` — weapon strategies; `services/audio/*` — synth/scheduler; `services/objectPools.ts` — pooling.
- `gameLogic.ts` — factories (`spawnEnemy`, projectiles, particles).

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
> `FERROFLUID_SLIME` exists in the enum but has no data/handlers). Always keep
> all 7 touch-points in sync.

**Current enemy roster** (for reference when picking names / checking for gaps):
DRONE, SWARMER, SENTINEL, TANK, GHOST, LANCER, ELITE_DRONE, NEON_COBRA,
INFERNO_SPINNER, BINARY_SENTINEL, LASER_LOTUS, ORBITAL_SNIPER, UTATU,
MANDELBROT_MITE, PRISMATIC_MONOLITH, SANKOFA_TOTEM, KINTSUGI_WRAITH,
CALABASH_VOID, ANANSI_BROOD_POD, SANKOFA_SIPHON, OBSIDIAN_HEART, MIRROR_DJINN,
DATAMOSH_CORRUPTOR, ASASE_COLOSSUS, FERROFLUID_SLIME (enum-only, no data yet),
plus boss types: BOSS_VANGUARD, BOSS_HIVE_MIND, BOSS_CYBER_KRAKEN, BOSS_SHANGO,
BOSS_AIDO_HWEDO, BOSS_TRINITY_CUBE (has shield sub-parts), BOSS_SOLAR_SERAPH,
BOSS_CHRONOS_GRIOT.

### Recipe: add a weapon (4 touch-points)

1. `types.ts` → extend the `WeaponType` union (e.g. `'MY_WEAPON'`).
2. `services/data/weapons.ts` → add a row to `BASE_WEAPONS` and optionally two `WEAPON_AUGMENTS` entries.
3. `services/weapons/behaviors/` → implement a `WeaponBehavior` function in the appropriate file (`standard.ts` / `area.ts` / `special.ts`) or a new file.
4. `services/weapons/index.ts` → register `WeaponStrategies['MY_WEAPON'] = myFn`.

**Current weapons**: spirit_lance (PROJECTILE), cyber_kora (HOMING), void_aura (AURA),
nanite_swarm (ORBITAL), solar_chakram (BOOMERANG), void_wake (TRAIL), drum_echo (RHYTHM_WAVE),
paradox_pendulum (PARADOX), kaleidoscope_gaze (KALEIDOSCOPE), fractal_bloom (FRACTAL),
ancestral_resonance (BEAM).

### Recipe: add a mission (3 touch-points)

1. `types.ts` → add to `MissionType` enum.
2. `services/data/waves.ts` → add to `SIMPLE_MISSIONS` or `ADVANCED_MISSIONS` pool so it gets selected during wave generation.
3. `services/systems/MissionSystem.ts` → add init logic and per-frame progress logic for the new type (follow the existing switch-case style).

**Current missions**: SURVIVE, ELIMINATE, DATA_RUN, BOSS, KING_OF_THE_HILL,
PAYLOAD_ESCORT, RITUAL_CIRCLE, SHADOW_STEP, ENTANGLEMENT, THE_GREAT_FILTER,
EVENT_HORIZON, SOLAR_STORM, RESCUE.

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
- **AI slot budget**: `EnemySystem.ts` gates expensive AI to 20 active enemies per
  frame — new behaviors that are computationally heavy should respect this ceiling.
- **React state vs refs**: Game state (positions, timers, hp) lives in `useRef` to
  avoid re-renders. Only UI-visible summaries (inventory list, wave counter, boss hp)
  are mirrored into React state in `useGameEngine.ts`.

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
- **WebGL post-processing** (`services/postFx/PostProcessor.ts`) is lazily
  initialised in `useGameEngine.ts`; fall back gracefully if WebGL context is
  unavailable (mobile Safari quirks). The PostProcessor handles bloom, CRT
  scanlines, and color grading via GLSL shaders in `postFx/shaders.ts`.
- **Spatial hash** in `PhysicsSystem.ts` uses 200-unit cells — keep entity
  radii sane (>200 radius entities won't benefit from broad-phase culling).

## Audio system

`ThemeScheduler.ts` drives all in-game music via Web Audio API synthesis
(`Synth.ts` + `Instruments.ts`). Key notes:

- Beat sync is maintained internally (`beatNumber`) — this is *not* linked to the
  `setGlowPulse` visual beat (they drift independently).
- Mission-specific themes are switched in `ThemeScheduler`; each `MissionType`
  can have a bespoke rhythm (SHADOW_STEP uses a chugging motor pattern, SOLAR_STORM
  uses an alarm motif).
- `WeaponMix` in `audio/constants.ts` controls per-weapon audio intensity — adjust
  there before touching raw synth parameters.
- Never call Web Audio APIs directly from game-logic systems; route through
  `audioEngine.ts` or `ThemeScheduler.ts`.

## Meta-progression & persistence

`services/persistence.ts` reads/writes `localStorage` under the key
`resonance_grid_meta_v1`. The `MetaState` shape (defined in `types.ts`) tracks:
currency, runsCompleted, bossesDefeated[], unlockedItems[], permanentUpgrades{},
maxWaveCompleted, personalBests.

Default unlocked items: `spirit_lance`, `void_aura`, `cyber_kora`,
`harmonic_tuner`, `data_siphon`, `attractor_field`, `titan_frame`.

Permanent upgrades (11 tiers, configured in `services/data/upgrades.ts`):
Neural Fortitude, Plasma Output, Flux Engine, Void Expander, Chronos Regulator,
Gravity Well, Data Mining, Crypto Mining, Nano-Weave Armor, Biosynthesis,
Backup Matrix. Applied at game-start in `useGameState.ts → getInitialPlayer()`.

## Aesthetic guardrails

Keep new content on-theme: Afrofuturist **black / white / orange** palette
(`COLORS`), neon wireframe look, and African-mythology-flavored naming
(cf. *Utatu*, *Shango*, *Aido-Hwedo*, *Sankofa*, *Anansi*, *Asase*, *Calabash*).

## Mobile / platform

Capacitor Android target (`capacitor.config.json`, `webDir: dist`,
appId `com.resonancegrid.game`). Rewarded ads via `@capacitor-community/admob`,
wrapped in `services/AdManager.ts` (`adManager`) and used from
`components/ui/GameOverScreen.tsx`. AdMob calls are native-only — guard
web/dev paths accordingly.

Mobile uses `ZOOM_LEVEL = 0.6` (vs 0.8 desktop) and `GRAPHICS_QUALITY = 'LOW'`
(auto-detected via screen size in `constants.ts`).

## Workflow

- Branch, commit, open a PR; squash-merge to `main` (which auto-deploys).
- Do not commit `node_modules` / `dist` (gitignored).
- The DebugMenu (`hooks/useDebugLogic.ts`) is the fastest way to verify new
  enemies or missions in-game — use `handleDebugSpawn` / `handleDebugMission`.
  The Compendium screen (`components/CompendiumScreen.tsx`) shows all
  `ALL_ENEMIES_DB` rows automatically; a missing row = invisible enemy.

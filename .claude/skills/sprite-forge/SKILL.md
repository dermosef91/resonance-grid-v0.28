---
name: sprite-forge
description: Generate consistent game sprite assets from text prompts using OpenAI GPT Image (gpt-image-1), with reference-image chaining for cross-asset and per-character consistency. Use when generating, regenerating, or extending the Resonance Grid sprite set.
---

# sprite-forge

Generates transparent-background PNG sprites for Resonance Grid in the locked
"Bronze Relief / Bio-mechanical" style (see `style.md`), driven by a manifest.

## Files
- `style.md` — global style preamble, prepended to every prompt. Edit this to shift the whole look.
- `manifest.json` — the asset list (`assets: [{ id, category, size, prompt, references? }]`).
- `generate.mjs` — the generator (Node 20+, no dependencies).

## Key handling (IMPORTANT)
The script reads the API key from the `OPENAI_API_KEY` environment variable.
NEVER hard-code the key in any file, manifest, or commit. Keep it in the env only.

## Usage
```bash
# Dry run — print assembled prompts + topo order, no API calls, no cost:
node .claude/skills/sprite-forge/generate.mjs --dry-run

# Generate a subset (the test run):
OPENAI_API_KEY=*** node .claude/skills/sprite-forge/generate.mjs --only _style_anchor,player,drone,elite_drone,xp_gem

# Generate everything in the manifest (skips files that already exist):
OPENAI_API_KEY=*** node .claude/skills/sprite-forge/generate.mjs

# Force regenerate even if the PNG exists:
OPENAI_API_KEY=*** node .claude/skills/sprite-forge/generate.mjs --only player --force
```

Env knobs: `SPRITE_MODEL` (default `gpt-image-1`), `SPRITE_QUALITY` (`low|medium|high`, default `high`).

## How consistency is achieved
1. `style.md` is prepended to every prompt.
2. `references` lists other asset ids (or file paths). When present, the asset is
   created via the **image edits** endpoint with those PNGs as visual references,
   so it matches established art. Assets are generated in dependency order
   (references first). Use a shared `_style_anchor` reference for global cohesion,
   and a character's base sprite as a reference for its variants / animation frames.

## Output
- `public/sprites/<category>/<id>.png` (transparent)
- `public/sprites/sprite-index.json` — `{ id: "sprites/<category>/<id>.png" }` map consumed by the runtime sprite loader.

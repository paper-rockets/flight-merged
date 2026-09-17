# Ghibli Flight — Handoff (2026-09-17)

Kiki's witch-flying game. Everything below is saved in this folder.

## Start the game
- Ask Claude: **"start the Ghibli Flight server"** → opens http://localhost:8140
  (Claude's browser pane uses the `ghibli-flight` entry in `C:\Users\macie\.claude\.claude\launch.json`, port 8140)
- Or double-click **`1_run_server.bat`** (opens on port 3000)
- Game code: `index.html` (almost everything) and `world-layout.js` (islands + terrain shapes)

## What was done this session
**Speed**
- Only real trees are drawn (was drawing ~4,500 hidden ones). 20M → ~1.5–3M triangles.
- Far trees use a light model (leaves + simple trunk); full model only within 150m.
- Ground rebuild reuses what's already there (37ms → 3.5ms per step).
- Fog hides everything past ~500m near the ground, so trees stop at 520m.
- FPS counter now shows real draw calls / triangles (the "calls" number is correct — instancing keeps it low).

**World**
- World is ~3x smaller (islands), hills narrower and lower (smooth, not sharp).
- Added rivers, ponds, soft ridges and gentle cliff steps.
- Fixed the noise bug that made cliff walls / saw-tooth edges (lookup table wasn't doubled).
- Trees: pines only, much denser, placed on the visible ground (no floating), 2.5x bigger.

**Look & menus**
- Sky: gradient sky dome (ported from Wanderlust-V — gradient only). Fog uses the horizon colour.
- Map: small paper-style minimap bottom-left; click it or press **M** for the big map, click a spot to fly there, **Esc** closes.
- Settings menu starts fully closed (press **H** or click Settings).
- Stars hidden during the day (they were punching holes in clouds) and drawn behind clouds at night.
- Clouds: **original clouds kept** (user rejected the rebuilt puffy/solid versions).

## Where the editor controls are (Settings → …)
- **Environment → God Rays**: Enabled, Intensity, Decay, Density, Weight
- **Environment → Clouds**: per layer (Low / High / Giant) — on/off, How Many, Size, Color
- **Cloud Editor**: 5 pastel tint colours + opacity per layer
- **Atmosphere → Sky & Gradients**: Zenith / Mid-Sky / Horizon (+Fog) colours, Gradient Curve, Mid-Height Offset, Horizon Band Glow, Sunset / Day presets (colours apply to the current time of day)
- **System Settings → Save All Settings**: saves slider values in the *browser* (not the folder)

## Knobs in the code
- `world-layout.js`: `WORLD_SCALE` (0.3 island size), `HILL_SCALE` (0.65 hill width), `HILL_HEIGHT`; landforms in `applyLandforms`
- `index.html`: `TREE_VIEW_DIST` (520, tree range + fog), `TREE_LOD_RADIUS` (150), `TREE_CELL_SIZE` (20 = tree spacing), `PINE_SLOTS`, `TERRAIN_SIZE` (3200)

## User preferences (important)
- Plain language, no jargon.
- **"Commit" = save to disk.** Files are saved as soon as they're edited.
- Wants smooth, soft terrain edges — never sharp/jagged.
- Clouds: liked the original soft, distant, see-through look. Disliked solid, hard-edged, dark, pastel-muddy, or strongly shaded versions. Any cloud change: small steps, show before going further.
- Change only what's asked (e.g. sky: gradient only, no sun/clouds from Wanderlust-V).

## Open items / ideas
- Clouds "with a tad of relief" is still wanted but not solved — try very small changes on the original clouds.
- Sunset sky is strong red/orange (a softer version was reverted along with the clouds).
- Capybaras look very large next to Kiki and trees.
- Crystal Land is still the spikiest biome.
- There's a hidden `.git` folder (~86 MB) in this folder from an earlier "commit" misunderstanding. The user doesn't use git — ask before deleting it.
- Cloud experiment copies live in Claude's temp scratchpad (may be gone next session).

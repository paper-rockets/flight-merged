# 🧹 Kiki's Flight — Procedural 3D Flying Engine

Welcome to **Kiki's Flight**, an infinite procedural 3D flying game built with raw Three.js, toon shading, zero external image textures, custom WebGL shaders, and high-performance instanced mesh recycling.

---

## 🚀 Quick Start (Run Locally)

### **Option 1: Direct File Launch (No Install Needed)**
1. Double-click `LAUNCH_GAME_SERVER.bat` or `1_run_server.bat` in this folder.
2. Open your browser to `http://localhost:8000` (or `http://localhost:3000`).

### **Option 2: Node / Vite Dev Server**
```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

---

## 🎮 Controls

* **Pitch & Yaw (Steering)**: `W` / `A` / `S` / `D` or `Arrow Keys`
* **Boost Flight**: Hold `Shift` *(Spawns dynamic aerodynamic wind trails)*
* **Camera Orbit**: Mouse movement / drag
* **Time of Day Cycle**: In-game UI button (Smoothly lerps between **Day ☀️**, **Twilight 🌅**, and **Night 🌙**)

---

## 🌟 Key Architecture & Engine Features

* **Zero Texture Rule**: 100% of terrain, trees, grass, buildings, clouds, and water are generated procedurally using WebGL primitives and GLSL math. No PNGs or JPGs are loaded.
* **Infinite Multi-Biome Chunking**: World terrain streams dynamically in a 3x3 grid around player position across **6 distinct biomes**:
  1. 🌾 **Plains**: Gentle rolling hills and dense wildflower fields.
  2. 🌿 **Ghibli Valley**: Emerald grass, procedural Ghibli oaks, and floating seeds.
  3. 🌴 **Lush Jungle**: High tropical canopies, crooked trunks, and localized volumetric fog.
  4. 🏝️ **Archipelago**: Oceanic islands, glassy lagoons, and seagull companion AI.
  5. 🏔️ **Mountains**: Rugged alpine peaks and dense spruce forests.
  6. 💎 **Crystal Land**: Bioluminescent crystal spires and glowing flora.
* **35,000+ Instanced Props at 60 FPS**: Micro-props (grass, flowers, rocks, trees) use matrix recycling pool loops (`THREE.InstancedMesh`) to maintain peak performance without runtime garbage collection pauses.
* **Custom Ocean Fragment Shader**: Shader logic (`waterMat.onBeforeCompile`) generates procedural surface ripples, depth darkening, and inland water ripple-suppression over island heightmaps.
* **Infinite Cloud Super-Clusters**: 450 puffy `IcosahedronGeometry` blobs clustered into 18 cumulonimbus formations pinned infinitely to camera position.
* **Procedural Web Audio API**: Ambient synth chord progressions and speed-linked low-pass wind noise generated natively in-browser without external audio files.

---

## 📁 Repository Structure

```
GAME/
├── index.html                  # Core Single-File 3D Production Engine
├── DEVELOPMENT_LOG.md          # Comprehensive Architecture & Project Timeline Log
├── TerrainEditor.js            # Real-Time In-Game Terrain Heightmap & Biome Tweaker
├── particleWhaleGenerator.js   # Ambient Sky Particle Whale System
│
├── terrain-plains.js           # Plains Biome Generation Module
├── terrain-ghibli.js           # Ghibli Valley Biome Module
├── terrain-jungle.js           # Lush Jungle Biome Module
├── terrain-archipelago.js      # Archipelago Biome Module
├── terrain-mountains.js        # Mountains Biome Module
├── terrain-magical.js          # Magical Biome Module
├── terrain-crystal.js          # Crystal Land Biome Module
│
├── kiki-draco.glb              # Draco-Compressed Kiki Character Model
├── kiki-lowpoly.glb            # Low-Poly Kiki Model Variant
├── Princess.glb                # Secondary Character Model
│
├── LAUNCH_GAME_SERVER.bat      # One-Click Local Python Server Launcher
├── 1_run_server.bat            # Alternative Batch Server Script
└── package.json                # Project Dependencies & Vite Scripts
```

---

## 🛠️ Utility Tools Included

* **GLB & Draco Model Inspector**: Located at `../simple_loader.html` for previewing and inspecting 3D `.glb` assets.
* **Billboard Generator**: Located at `../billboard_maker.html` for creating procedural foliage billboards.

---

## 📄 Documentation

For full architectural details, complete multi-biome specifications, and the project's historical development log, refer to [`DEVELOPMENT_LOG.md`](DEVELOPMENT_LOG.md).

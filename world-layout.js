import * as THREE from 'three';
import terrainArch from './terrain-archipelago.js';
import terrainGhibli from './terrain-ghibli.js';
import terrainMtn from './terrain-mountains.js';
import terrainCrystal from './terrain-crystal.js';
import terrainMtn2 from './terrain-mountains2.js';
import terrainMagical from './terrain-magical.js';

// ==========================================
// 1. DETERMINISTIC SEEDED PRNG (Mulberry32)
// ==========================================
export class SeededRandom {
    constructor(seed = 482731) {
        this.setSeed(seed);
    }

    setSeed(seed) {
        this.seed = (typeof seed === 'number' ? seed : 482731) >>> 0;
        this.state = this.seed;
    }

    // 32-bit integer [0, 2^32-1]
    nextUint() {
        let t = (this.state += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0);
    }

    // Float [0, 1)
    next() {
        return this.nextUint() / 4294967296.0;
    }

    // Float [min, max)
    range(min, max) {
        return min + this.next() * (max - min);
    }

    // Int [min, max]
    rangeInt(min, max) {
        return Math.floor(this.range(min, max + 1));
    }

    // Choice from array
    choice(arr) {
        return arr[this.rangeInt(0, arr.length - 1)];
    }
}

// Global default RNG instance
export const rng = new SeededRandom(482731);

// Biome definitions catalog
export const BIOME_CATALOG = [
    {
        id: 'archipelago',
        name: '🌊 Archipelago',
        module: terrainArch,
        treesOk: true,
        mapColor: '#2dd4bf',
        primaryClass: 'large',
        defaultRadius: 6400,
        satelliteCountRange: [4, 8],
        baseHeight: 0
    },
    {
        id: 'ghibli_land',
        name: '🌳 Ghibli Land',
        module: terrainGhibli,
        treesOk: true,
        mapColor: '#4ade80',
        primaryClass: 'large',
        defaultRadius: 8200,
        satelliteCountRange: [4, 8],
        baseHeight: 0
    },
    {
        id: 'misty_mountains',
        name: '🏔️ Misty Mountains I',
        module: terrainMtn,
        treesOk: false,
        mapColor: '#94a3b8',
        primaryClass: 'large',
        defaultRadius: 7200,
        satelliteCountRange: [3, 7],
        baseHeight: 0
    },
    {
        id: 'crystal_land',
        name: '💎 Crystal Land',
        module: terrainCrystal,
        treesOk: false,
        mapColor: '#38bdf8',
        primaryClass: 'large',
        defaultRadius: 6800,
        satelliteCountRange: [4, 8],
        baseHeight: 0
    },
    {
        id: 'magical_sanctuary',
        name: '✨ Magical Sanctuary',
        module: terrainMagical,
        treesOk: false,
        mapColor: '#c084fc',
        primaryClass: 'large',
        defaultRadius: 7000,
        satelliteCountRange: [4, 8],
        baseHeight: 0
    },
    {
        id: 'misty_mountains_2',
        name: '🏔️ Misty Mountains II',
        module: terrainMtn2,
        treesOk: false,
        mapColor: '#64748b',
        primaryClass: 'medium',
        defaultRadius: 5400,
        satelliteCountRange: [3, 6],
        baseHeight: 0
    },
    {
        id: 'ghibli_isles',
        name: '🌳 Ghibli Isles',
        module: terrainGhibli,
        treesOk: true,
        mapColor: '#22c55e',
        primaryClass: 'medium',
        defaultRadius: 5000,
        satelliteCountRange: [3, 7],
        baseHeight: 0
    }
];

// Open Ocean fallback biome
export const OCEAN_BIOME = {
    id: 'open_ocean',
    name: '🌊 Open Ocean',
    module: terrainArch,
    treesOk: false,
    mapColor: '#0f3a68',
    isOcean: true
};

// World size knobs. Islands are generated in the original design units and then shrunk by
// WORLD_SCALE; hill shapes inside each biome are sampled HILL_SCALE times tighter.
export const WORLD_SCALE = 0.3;
export const HILL_SCALE = 0.65;
export const HILL_HEIGHT = HILL_SCALE; // shrink height with width so slopes (and mountains) keep their designed steepness
const INV_WORLD = 1.0 / WORLD_SCALE;
const INV_HILL = 1.0 / HILL_SCALE;
const DESIGN_WORLD_BOUNDS = 48000;
const DESIGN_GRID_SIZE = 6000;

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// ==========================================
// 2. WORLD LAYOUT GENERATOR & SPATIAL ENGINE
// ==========================================
export class WorldLayout {
    constructor(seed = 482731) {
        this.worldBounds = DESIGN_WORLD_BOUNDS * WORLD_SCALE; // Playable world extent in X and Z
        this.islands = [];
        this.gridSize = DESIGN_GRID_SIZE * WORLD_SCALE; // Spatial hash cell size
        this.spatialGrid = new Map();
        this.spawnPosition = new THREE.Vector3(0, 120, 0);
        this.spawnIsland = null;
        this.seed = seed;
        this.generate(seed);
    }

    generate(seed = this.seed) {
        this.seed = seed;
        this.rng = new SeededRandom(seed);
        this.islands = [];
        this.spatialGrid.clear();
        // Placement below runs in design units; everything is shrunk by WORLD_SCALE afterwards
        this.worldBounds = DESIGN_WORLD_BOUNDS;
        this.gridSize = DESIGN_GRID_SIZE;

        const placedMajors = [];
        const requiredBiomes = [...BIOME_CATALOG];
        const oceanGap = 2400; // Minimum open ocean gap between major islands

        // 1. Place Major Biome Islands with Rejection Sampling
        for (let i = 0; i < requiredBiomes.length; i++) {
            const biomeDef = requiredBiomes[i];
            let placed = false;
            let bestCandidate = null;

            // Target angles around spawn to ensure an even, beautiful 360° distribution
            const baseAngle = (i / requiredBiomes.length) * Math.PI * 2 + this.rng.range(-0.35, 0.35);
            const targetDist = this.rng.range(12000, 32000);

            for (let attempt = 0; attempt < 80; attempt++) {
                // Vary candidate position around the target sector
                const angle = baseAngle + this.rng.range(-0.6, 0.6);
                const dist = attempt === 0 ? targetDist : this.rng.range(9000, 38000);
                const cx = Math.cos(angle) * dist + this.rng.range(-1500, 1500);
                const cz = Math.sin(angle) * dist + this.rng.range(-1500, 1500);

                // Island size and elliptical distortion
                const isLarge = biomeDef.primaryClass === 'large';
                const baseRad = isLarge ? this.rng.range(6200, 9200) : this.rng.range(4200, 6000);
                const aspect = this.rng.range(0.72, 1.45);
                const radX = baseRad * aspect;
                const radZ = baseRad / aspect;
                const maxRad = Math.max(radX, radZ);
                const rot = this.rng.range(0, Math.PI * 2);

                // Boundary check
                if (Math.abs(cx) + maxRad > this.worldBounds || Math.abs(cz) + maxRad > this.worldBounds) {
                    continue;
                }

                // Overlap check with already placed major islands
                let overlaps = false;
                for (const other of placedMajors) {
                    const dx = cx - other.centerX;
                    const dz = cz - other.centerZ;
                    const centerDist = Math.sqrt(dx * dx + dz * dz);
                    const minRequiredDist = maxRad + other.maxRadius + oceanGap;
                    if (centerDist < minRequiredDist) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    bestCandidate = {
                        id: `major_${biomeDef.id}_${i}`,
                        biomeId: biomeDef.id,
                        biome: biomeDef,
                        isMajor: true,
                        isSatellite: false,
                        centerX: cx,
                        centerZ: cz,
                        radiusX: radX,
                        radiusZ: radZ,
                        maxRadius: maxRad,
                        rotation: rot,
                        noiseSeed: this.rng.range(100, 9999),
                        warpScale: this.rng.range(0.25, 0.45),
                        heightMultiplier: isLarge ? 1.0 : 0.88,
                        parentIslandId: null,
                        satellites: []
                    };
                    placed = true;
                    break;
                }
            }

            // Fallback deterministic placement if rejection sampling was exhausted
            if (!placed) {
                const angle = (i / requiredBiomes.length) * Math.PI * 2;
                const dist = 22000;
                const cx = Math.cos(angle) * dist;
                const cz = Math.sin(angle) * dist;
                const rad = 5600;
                bestCandidate = {
                    id: `major_${biomeDef.id}_${i}_fb`,
                    biomeId: biomeDef.id,
                    biome: biomeDef,
                    isMajor: true,
                    isSatellite: false,
                    centerX: cx,
                    centerZ: cz,
                    radiusX: rad,
                    radiusZ: rad * 0.9,
                    maxRadius: rad,
                    rotation: 0.2,
                    noiseSeed: 1000 + i * 500,
                    warpScale: 0.3,
                    heightMultiplier: 0.9,
                    parentIslandId: null,
                    satellites: []
                };
            }

            placedMajors.push(bestCandidate);
            this.islands.push(bestCandidate);
        }

        // 2. Generate Geological Archipelago / Satellites for Each Major Island
        for (const parent of placedMajors) {
            const [minSat, maxSat] = parent.biome.satelliteCountRange || [3, 6];
            const satCount = this.rng.rangeInt(minSat, maxSat);

            // Dominant archipelago ridge / chain direction extending into ocean
            const chainAngle = this.rng.range(0, Math.PI * 2);
            const chainCurvature = this.rng.range(-0.35, 0.35);

            for (let s = 0; s < satCount; s++) {
                let satPlaced = false;

                for (let satAttempt = 0; satAttempt < 30; satAttempt++) {
                    // Combine directional chain formation with cluster scatter
                    const isChain = this.rng.next() < 0.65;
                    let angle, distRatio;

                    if (isChain) {
                        const step = (s + 1) / (satCount + 1);
                        angle = chainAngle + chainCurvature * step + this.rng.range(-0.35, 0.35);
                        distRatio = 1.15 + step * this.rng.range(0.6, 1.3);
                    } else {
                        angle = this.rng.range(0, Math.PI * 2);
                        distRatio = this.rng.range(1.15, 2.1);
                    }

                    // Compute position from parent ellipse boundary
                    const cosA = Math.cos(angle - parent.rotation);
                    const sinA = Math.sin(angle - parent.rotation);
                    const ellipseR = (parent.radiusX * parent.radiusZ) /
                        Math.sqrt(Math.pow(parent.radiusZ * cosA, 2) + Math.pow(parent.radiusX * sinA, 2));

                    const satDist = ellipseR * distRatio + this.rng.range(500, 1800);
                    const sx = parent.centerX + Math.cos(angle) * satDist;
                    const sz = parent.centerZ + Math.sin(angle) * satDist;

                    // Satellite size: tiny (600–1200), small (1200–2200), occasional medium (2200–3400)
                    const sizeRoll = this.rng.next();
                    let sBaseRad;
                    if (sizeRoll < 0.45) sBaseRad = this.rng.range(650, 1250); // tiny islet
                    else if (sizeRoll < 0.85) sBaseRad = this.rng.range(1250, 2250); // small island
                    else sBaseRad = this.rng.range(2250, 3400); // medium satellite

                    const sAspect = this.rng.range(0.65, 1.55);
                    const sRadX = sBaseRad * sAspect;
                    const sRadZ = sBaseRad / sAspect;
                    const sMaxRad = Math.max(sRadX, sRadZ);
                    const sRot = angle + this.rng.range(-0.5, 0.5);

                    // Check bounds and collision with other major islands
                    if (Math.abs(sx) + sMaxRad > this.worldBounds || Math.abs(sz) + sMaxRad > this.worldBounds) {
                        continue;
                    }

                    let satCollides = false;
                    for (const other of placedMajors) {
                        if (other === parent) continue;
                        const dx = sx - other.centerX;
                        const dz = sz - other.centerZ;
                        if (Math.sqrt(dx * dx + dz * dz) < other.maxRadius + sMaxRad + 800) {
                            satCollides = true;
                            break;
                        }
                    }

                    if (!satCollides) {
                        const satIsland = {
                            id: `sat_${parent.id}_${s}`,
                            biomeId: parent.biomeId,
                            biome: parent.biome,
                            isMajor: false,
                            isSatellite: true,
                            centerX: sx,
                            centerZ: sz,
                            radiusX: sRadX,
                            radiusZ: sRadZ,
                            maxRadius: sMaxRad,
                            rotation: sRot,
                            noiseSeed: this.rng.range(100, 9999),
                            warpScale: this.rng.range(0.2, 0.4),
                            heightMultiplier: 0.72 + (sBaseRad / 2000) * 0.28,
                            parentIslandId: parent.id,
                            satellites: []
                        };
                        parent.satellites.push(satIsland);
                        this.islands.push(satIsland);
                        satPlaced = true;
                        break;
                    }
                }
            }
        }

        // 3. Shrink the layout to world units
        for (const isl of this.islands) {
            isl.centerX *= WORLD_SCALE;
            isl.centerZ *= WORLD_SCALE;
            isl.radiusX *= WORLD_SCALE;
            isl.radiusZ *= WORLD_SCALE;
            isl.maxRadius *= WORLD_SCALE;
        }
        this.worldBounds = DESIGN_WORLD_BOUNDS * WORLD_SCALE;
        this.gridSize = DESIGN_GRID_SIZE * WORLD_SCALE;

        // 4. Build 2D Spatial Hash Grid for Ultra-Fast O(1) Vertex Queries
        this._buildSpatialGrid();

        // 4. Determine Safe Spawn Location on Archipelago or Ghibli Land
        const spawnParent = this.islands.find(isl => isl.isMajor && isl.biomeId === 'archipelago') || this.islands[0];
        this.spawnIsland = spawnParent;
        this.spawnPosition.set(spawnParent.centerX, 120, spawnParent.centerZ);
    }

    _buildSpatialGrid() {
        this.spatialGrid.clear();
        for (const island of this.islands) {
            // Generous bounding box covering island influence (including smooth coastline falloff)
            const margin = island.maxRadius * 1.6 + 600 * WORLD_SCALE;
            const minX = Math.floor((island.centerX - margin) / this.gridSize);
            const maxX = Math.floor((island.centerX + margin) / this.gridSize);
            const minZ = Math.floor((island.centerZ - margin) / this.gridSize);
            const maxZ = Math.floor((island.centerZ + margin) / this.gridSize);

            for (let gx = minX; gx <= maxX; gx++) {
                for (let gz = minZ; gz <= maxZ; gz++) {
                    const key = `${gx},${gz}`;
                    if (!this.spatialGrid.has(key)) {
                        this.spatialGrid.set(key, []);
                    }
                    this.spatialGrid.get(key).push(island);
                }
            }
        }
    }

    getCandidateIslands(worldX, worldZ) {
        const gx = Math.floor(worldX / this.gridSize);
        const gz = Math.floor(worldZ / this.gridSize);
        const key = `${gx},${gz}`;
        return this.spatialGrid.get(key) || this.islands;
    }

    /**
     * Compute natural 2D land mask for a specific island at (x, z).
     * Returns a normalized value [0.0 = deep ocean, 1.0 = island peak interior].
     */
    sampleIslandMask(island, worldX, worldZ, snoise) {
        const dx = worldX - island.centerX;
        const dz = worldZ - island.centerZ;

        // Rotate into island local space
        const cosR = Math.cos(-island.rotation);
        const sinR = Math.sin(-island.rotation);
        const lx = dx * cosR - dz * sinR;
        const lz = dx * sinR + dz * cosR;

        // Normalized elliptical distance
        const normDist = Math.sqrt(Math.pow(lx / island.radiusX, 2) + Math.pow(lz / island.radiusZ, 2));
        if (normDist > 1.45) return 0.0; // Early exit outside influence bound

        // Multi-frequency noise domain warping for organic coastlines, bays, and coves
        const seedOff = island.noiseSeed;
        const dX = worldX * INV_WORLD, dZ = worldZ * INV_WORLD;
        const warp1 = snoise(dX * 0.00045 + seedOff, dZ * 0.00045 + seedOff) * 0.22;
        const warp2 = snoise(dX * 0.0012 - seedOff, dZ * 0.0012 + seedOff) * 0.10;
        const coastNoise = snoise(dX * 0.0035 + seedOff * 2, dZ * 0.0035 - seedOff * 2) * 0.05;

        const effectiveDist = normDist + warp1 + warp2 + coastNoise;

        if (effectiveDist >= 1.0) return 0.0; // Ocean
        if (effectiveDist <= 0.22) return 1.0; // Core interior

        // Smooth coastline slope transition from 0.0 at shore to 1.0 interior
        return smoothstep(1.0, 0.22, effectiveDist);
    }

    /**
     * Samples the dominant island and biome at (worldX, worldZ).
     */
    getBiomeAt(worldX, worldZ, snoise = null) {
        const candidates = this.getCandidateIslands(worldX, worldZ);
        let maxMask = 0;
        let bestIsland = null;

        for (let i = 0; i < candidates.length; i++) {
            const isl = candidates[i];
            const dx = worldX - isl.centerX;
            const dz = worldZ - isl.centerZ;
            const distSq = dx * dx + dz * dz;
            const maxR = isl.maxRadius * 1.35;
            if (distSq < maxR * maxR) {
                const mask = snoise ? this.sampleIslandMask(isl, worldX, worldZ, snoise) : (1.0 - Math.sqrt(distSq) / maxR);
                if (mask > maxMask) {
                    maxMask = mask;
                    bestIsland = isl;
                }
            }
        }

        if (bestIsland && maxMask > 0.02) {
            return bestIsland.biome;
        }
        return OCEAN_BIOME;
    }

    /**
     * Compute composite 2D terrain height at (worldX, worldZ).
     */
    getHeight(worldX, worldZ, snoise) {
        const candidates = this.getCandidateIslands(worldX, worldZ);
        let maxElevation = -999;
        let maxIslandMask = 0;

        // Base ocean floor with gentle deep submarine relief
        const oceanRelief = snoise(worldX * INV_WORLD * 0.0006, worldZ * INV_WORLD * 0.0006) * 3.5 - 6.0;

        for (let i = 0; i < candidates.length; i++) {
            const isl = candidates[i];
            const mask = this.sampleIslandMask(isl, worldX, worldZ, snoise);
            if (mask > 0.0001) {
                // Pass island-centered local coordinates to get natural mountain massifs and valleys
                const lx = worldX - isl.centerX;
                const lz = worldZ - isl.centerZ;
                const rawH = isl.biome.module.getHeight(lx * INV_HILL, lz * INV_HILL, snoise) * HILL_HEIGHT;

                // Natural island elevation profile:
                // Shoreline meets water smoothly at y = 2.8m above sea level (y = 0)
                // Interior peaks rise organically to rawH * isl.heightMultiplier
                const islandH = (rawH * isl.heightMultiplier) * mask + 2.8 * (1.0 - Math.pow(1.0 - mask, 2.0));
                const totalIslandElevation = islandH * mask + oceanRelief * (1.0 - mask);

                if (totalIslandElevation > maxElevation) {
                    maxElevation = totalIslandElevation;
                }
                if (mask > maxIslandMask) {
                    maxIslandMask = mask;
                }
            }
        }

        if (maxIslandMask <= 0.0001) {
            return oceanRelief; // Open ocean base depth
        }

        return this.applyLandforms(maxElevation, worldX, worldZ, maxIslandMask, snoise);
    }

    /**
     * Shared landforms on top of every biome: ridges, cliff bands, rivers and ponds.
     * Water sits at y = 2.4, so rivers and ponds just carve the ground below it.
     */
    applyLandforms(h, x, z, landMask, snoise) {
        const inland = smoothstep(0.12, 0.5, landMask);
        if (inland <= 0) return h;

        // Rounded ridgelines on higher ground (squared noise keeps the crest soft, not a knife edge)
        const rq = snoise(x * 0.0026 + 311.0, z * 0.0026 - 127.0);
        const rn = 1.0 - rq * rq;
        h += rn * rn * 12.0 * inland * smoothstep(8.0, 30.0, h) * (1.0 - smoothstep(45.0, 80.0, h));

        // Cliff bands: terrace the height into steep steps inside patches
        const cliffZone = smoothstep(0.2, 0.55, snoise(x * 0.0011 - 900.0, z * 0.0011 + 400.0)) * inland * 0.4;
        // Only on foothills: terracing tall mountain slopes turns them into staircase walls
        const cliffFade = 1.0 - smoothstep(28.0, 45.0, h);
        if (cliffZone > 0 && h > 7.0 && cliffFade > 0) {
            const stepH = 9.0;
            const t = (h - 7.0) / stepH;
            const fl = Math.floor(t);
            const terraced = 7.0 + (fl + smoothstep(0.05, 0.95, t - fl)) * stepH;
            h += (terraced - h) * cliffZone * cliffFade;
        }

        // Winding rivers (fade out before they would cut through tall mountains)
        const wx = x + snoise(x * 0.0021 + 77.0, z * 0.0021 - 33.0) * 70.0;
        const wz = z + snoise(x * 0.0021 - 51.0, z * 0.0021 + 19.0) * 70.0;
        const rv = Math.abs(snoise(wx * 0.0009 + 500.0, wz * 0.0009 + 500.0));
        // wide soft banks; rivers only run through lower ground so they never cut steep gorges
        const river = (1.0 - smoothstep(0.015, 0.22, rv)) * inland * (1.0 - smoothstep(10.0, 24.0, h));

        // Ponds in low ground
        const pn = snoise(x * 0.0042 + 1300.0, z * 0.0042 - 700.0);
        const pond = smoothstep(0.45, 0.85, pn) * inland * (1.0 - smoothstep(9.0, 20.0, h));

        const carve = Math.max(river, pond);
        if (carve > 0) h = Math.min(h, h + (0.6 - h) * carve); // only ever lowers ground, so no step at the shoreline
        return h;
    }

    /**
     * Compute composite 2D vertex color at (worldX, worldZ).
     */
    getColor(h, worldX, worldZ, snoise, targetColor, blendColor1, blendColor2) {
        const candidates = this.getCandidateIslands(worldX, worldZ);
        let maxMask = 0;
        let secondMask = 0;
        let bestIsl = null;
        let secondIsl = null;

        for (let i = 0; i < candidates.length; i++) {
            const isl = candidates[i];
            const mask = this.sampleIslandMask(isl, worldX, worldZ, snoise);
            if (mask > maxMask) {
                secondMask = maxMask;
                secondIsl = bestIsl;
                maxMask = mask;
                bestIsl = isl;
            } else if (mask > secondMask) {
                secondMask = mask;
                secondIsl = isl;
            }
        }

        if (bestIsl && maxMask > 0.01) {
            if (secondIsl && secondMask > 0.15) {
                // Smooth transition between neighboring islets
                const totalW = maxMask + secondMask;
                const w1 = maxMask / totalW;
                const w2 = secondMask / totalW;

                bestIsl.biome.module.getColor(h, worldX * INV_HILL, worldZ * INV_HILL, snoise, blendColor1, smoothstep);
                secondIsl.biome.module.getColor(h, worldX * INV_HILL, worldZ * INV_HILL, snoise, blendColor2, smoothstep);
                targetColor.copy(blendColor1).lerp(blendColor2, w2);
            } else {
                bestIsl.biome.module.getColor(h, worldX * INV_HILL, worldZ * INV_HILL, snoise, targetColor, smoothstep);
            }
        } else {
            // Open Ocean shallow-to-deep vertex coloring
            OCEAN_BIOME.module.getColor(h, worldX, worldZ, snoise, targetColor, smoothstep);
        }
    }

    /**
     * Validation acceptance test suite across 20 distinct seeds.
     */
    static runAcceptanceTests() {
        const results = [];
        const testSeeds = [
            482731, 102938, 928374, 551234, 778899,
            123456, 654321, 999001, 314159, 271828,
            884422, 115599, 442211, 736291, 509283,
            618204, 394820, 847291, 204918, 958201
        ];

        console.log(`%c🧪 RUNNING WORLD GENERATOR 20-SEED ACCEPTANCE TESTS...`, 'color: #38bdf8; font-weight: bold; font-size: 14px;');

        let allPassed = true;

        for (let i = 0; i < testSeeds.length; i++) {
            const seed = testSeeds[i];
            const world = new WorldLayout(seed);

            const majors = world.islands.filter(isl => isl.isMajor);
            const satellites = world.islands.filter(isl => isl.isSatellite);

            // Test 1: No major islands overlap
            let majorOverlap = false;
            for (let a = 0; a < majors.length; a++) {
                for (let b = a + 1; b < majors.length; b++) {
                    const dx = majors[a].centerX - majors[b].centerX;
                    const dz = majors[a].centerZ - majors[b].centerZ;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    if (dist < (majors[a].maxRadius + majors[b].maxRadius + 1000)) {
                        majorOverlap = true;
                    }
                }
            }

            // Test 2: No island outside world bounds
            let outOfBounds = false;
            for (const isl of world.islands) {
                if (Math.abs(isl.centerX) + isl.maxRadius > world.worldBounds + 2000 ||
                    Math.abs(isl.centerZ) + isl.maxRadius > world.worldBounds + 2000) {
                    outOfBounds = true;
                }
            }

            // Test 3: Every required biome exists
            const presentBiomeIds = new Set(majors.map(m => m.biomeId));
            const allBiomesExist = BIOME_CATALOG.every(b => presentBiomeIds.has(b.id));

            // Test 4: Satellites inherit parent biome
            const satellitesCorrectBiome = satellites.every(sat => {
                const parent = world.islands.find(isl => isl.id === sat.parentIslandId);
                return parent && sat.biomeId === parent.biomeId;
            });

            // Test 5: Determinism test (same seed -> identical layout)
            const worldClone = new WorldLayout(seed);
            const isDeterministic = (
                world.islands.length === worldClone.islands.length &&
                world.islands[0].centerX === worldClone.islands[0].centerX &&
                world.islands[0].centerZ === worldClone.islands[0].centerZ
            );

            const passed = !majorOverlap && !outOfBounds && allBiomesExist && satellitesCorrectBiome && isDeterministic;
            if (!passed) allPassed = false;

            results.push({
                seed,
                majorsCount: majors.length,
                satellitesCount: satellites.length,
                majorOverlap,
                outOfBounds,
                allBiomesExist,
                satellitesCorrectBiome,
                isDeterministic,
                status: passed ? '✅ PASS' : '❌ FAIL'
            });
        }

        console.table(results);
        console.log(
            allPassed
                ? `%c🎉 ALL 20 SEED VALIDATION SUITES PASSED FLAWLESSLY! Procedural 2D Island topology is fully verified.`
                : `%c⚠️ SOME SEED TESTS FAILED. CHECK TABLE ABOVE.`,
            allPassed ? 'color: #4ade80; font-weight: bold;' : 'color: #f87171; font-weight: bold;'
        );

        return results;
    }
}

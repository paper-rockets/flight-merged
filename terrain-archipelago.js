import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x133e75);
const colorShallowWater = new THREE.Color(0x2780a4);
const colorSand = new THREE.Color(0xf5e3b3);
const colorIslandGrass = new THREE.Color(0x6ec93e);
const colorEmeraldGrass = new THREE.Color(0x43ad38);
const colorOliveGrass = new THREE.Color(0x82be35);
const colorHigh = new THREE.Color(0x78d450);
const colorIslandRock = new THREE.Color(0x7d6a54);
const colorDirt = new THREE.Color(0xd2aa7d);
const scratchPatchColor = new THREE.Color();

export default {
    name: "🌊 Water Archipelago",
    shoreName: "🌊 Water Archipelago",
    getHeight(x, z, snoise) {
        // Multi-scale tropical island terrain: sandy shores, lush palm hills, and gentle ridges
        const wx = x + snoise(x * 0.0009 + 25.0, z * 0.0009 + 25.0) * 300.0;
        const wz = z + snoise(x * 0.0009 - 35.0, z * 0.0009 + 35.0) * 300.0;

        const n1 = snoise(wx * 0.0008, wz * 0.0008);
        const n2 = snoise(wx * 0.0022 + 80.0, wz * 0.0022 - 80.0);
        const n3 = snoise(x * 0.006 + 150.0, z * 0.006 + 150.0);
        const n4 = snoise(x * 0.016, z * 0.016);

        // Gentle central tropical peaks and rolling plateaus
        const peaks = Math.pow(Math.max(0, n1 * 0.65 + n2 * 0.35 + 0.3), 1.5) * 52.0;
        const detail = n3 * 8.0 + n4 * 2.5;

        // Atoll lagoons in some areas
        const lagoonN = snoise(wx * 0.003 + 500.0, wz * 0.003 - 500.0);
        const lagoonCarve = lagoonN > 0.65 ? (lagoonN - 0.65) * 18.0 : 0.0;

        return Math.max(1.5, peaks + detail + 4.0 - lagoonCarve);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const meadowNoise = snoise(x * 0.0035, z * 0.0035);
        const oliveNoise = snoise(x * 0.008 + 200, z * 0.008 + 200);

        if (h < 0.6) {
            tempColor.copy(colorDeepWater);
        } else if (h < 1.8) {
            tempColor.lerpColors(colorDeepWater, colorShallowWater, smoothstep(0.6, 1.8, h));
        } else if (h < 3.2) {
            tempColor.lerpColors(colorShallowWater, colorSand, smoothstep(1.8, 3.2, h));
        } else if (h < 5.8) {
            tempColor.copy(colorSand);
        } else if (h < 8.5) {
            tempColor.lerpColors(colorSand, colorIslandGrass, smoothstep(5.8, 8.5, h));
        } else if (h < 32) {
            scratchPatchColor.copy(colorIslandGrass);
            if (meadowNoise > 0.08) scratchPatchColor.lerp(colorEmeraldGrass, Math.min(1, (meadowNoise - 0.08) * 2.8));
            if (oliveNoise > 0.12) scratchPatchColor.lerp(colorOliveGrass, Math.min(1, (oliveNoise - 0.12) * 2.8));
            tempColor.lerpColors(scratchPatchColor, colorHigh, smoothstep(8.5, 32, h));
        } else if (h < 48) {
            tempColor.lerpColors(colorHigh, colorIslandRock, smoothstep(32, 48, h));
        } else {
            tempColor.lerpColors(colorIslandRock, colorDirt, smoothstep(48, 70, h));
        }
    }
};

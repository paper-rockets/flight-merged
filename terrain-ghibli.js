import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x1a4a8c);
const colorSand = new THREE.Color(0xf2e1b8);
const colorIslandGrass = new THREE.Color(0x76d149);
const colorEmeraldGrass = new THREE.Color(0x56b847);
const colorOliveGrass = new THREE.Color(0x8cc440);
const colorHigh = new THREE.Color(0x89e05e);
const colorIslandRock = new THREE.Color(0x8a725a);
const colorDirt = new THREE.Color(0xdcb58a);
const scratchPatchColor = new THREE.Color();

export default {
    name: "🌳 Ghibli Land",
    shoreName: "░ Continental Shore",
    getHeight(x, z, snoise) {
        // Multi-octave natural rolling hills, gentle valleys, and green meadows
        const wx = x + snoise(x * 0.0008 + 42.0, z * 0.0008 - 42.0) * 350.0;
        const wz = z + snoise(x * 0.0008 - 84.0, z * 0.0008 + 84.0) * 350.0;

        const n1 = snoise(wx * 0.00065, wz * 0.00065);
        const n2 = snoise(wx * 0.0018 + 50.0, wz * 0.0018 + 50.0);
        const n3 = snoise(x * 0.006 + 100.0, z * 0.006 + 100.0);
        const n4 = snoise(x * 0.018 + 200.0, z * 0.018 + 200.0);

        const rollingHills = (n1 * 0.55 + n2 * 0.32) * 58.0 + (n3 * 10.0 + n4 * 3.0) + 18.0;

        // Gentle river valleys
        const rn = Math.abs(snoise(wx * 0.0012 + 150.0, wz * 0.0012 + 150.0));
        let valleyCarve = 0;
        if (rn < 0.08) {
            const t = 1.0 - rn / 0.08;
            valleyCarve = t * t * (3.0 - 2.0 * t) * 12.0;
        }

        return Math.max(3.0, rollingHills - valleyCarve);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const meadowNoise = snoise(x * 0.0035, z * 0.0035);
        const oliveNoise = snoise(x * 0.008 + 200, z * 0.008 + 200);

        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorSand);
        } else if (h < 6.2) {
            tempColor.lerpColors(colorSand, colorIslandGrass, smoothstep(4.2, 6.2, h));
        } else if (h < 25) {
            scratchPatchColor.copy(colorIslandGrass);
            if (meadowNoise > 0.15) scratchPatchColor.lerp(colorEmeraldGrass, Math.min(1, (meadowNoise - 0.15) * 2.5));
            if (oliveNoise > 0.2) scratchPatchColor.lerp(colorOliveGrass, Math.min(1, (oliveNoise - 0.2) * 2.5));
            tempColor.lerpColors(scratchPatchColor, colorHigh, smoothstep(6.2, 25, h));
        } else if (h < 38) {
            tempColor.lerpColors(colorHigh, colorIslandRock, smoothstep(25, 38, h));
        } else {
            tempColor.lerpColors(colorIslandRock, colorDirt, smoothstep(38, 55, h));
        }
    }
};

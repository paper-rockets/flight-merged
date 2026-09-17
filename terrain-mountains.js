import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x1a4a8c);
const colorSand = new THREE.Color(0xf2e1b8);
const colorMountainGrass = new THREE.Color(0x4b7043); // Dark alpine green
const colorMountainRock = new THREE.Color(0x5a5e6b);  // Slate grey rock
const colorSnow = new THREE.Color(0xf5f6fa);          // Crisp snow white

export default {
    name: "🏔️ Misty Mountains",
    shoreName: "░ Mountain Shore",
    getHeight(x, z, snoise) {
        // Multi-octave domain warped fractal noise for majestic, natural alpine peaks
        const wx = x + snoise(x * 0.0007 + 11.2, z * 0.0007 + 33.4) * 450.0;
        const wz = z + snoise(x * 0.0007 - 55.6, z * 0.0007 + 77.8) * 450.0;

        const n1 = snoise(wx * 0.00055, wz * 0.00055);
        const n2 = snoise(wx * 0.0015 + 40.0, wz * 0.0015 - 40.0);
        const n3 = snoise(x * 0.0045 + 120.0, z * 0.0045 + 120.0);
        const n4 = snoise(x * 0.012, z * 0.012);

        // Smooth organic mountain massif with alpine peaks
        const massif = Math.pow(Math.max(0, n1 * 0.65 + n2 * 0.35 + 0.35), 1.8) * 165.0;
        const ridges = Math.pow(Math.max(0, snoise(wx * 0.0012 + 200, wz * 0.0012 + 200)), 2.0) * 45.0;
        const detail = n3 * 14.0 + n4 * 4.0;

        return Math.max(3.0, massif + ridges + detail + 8.0);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const nNoise = snoise(x * 0.008, z * 0.008) * 6.0;
        const snowStart = 60.0 + nNoise;
        const snowFull = 110.0 + nNoise;

        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorSand);
        } else if (h < 18.0) {
            tempColor.lerpColors(colorSand, colorMountainGrass, smoothstep(4.2, 18.0, h));
        } else if (h < snowStart) {
            tempColor.lerpColors(colorMountainGrass, colorMountainRock, smoothstep(18.0, snowStart, h));
        } else {
            tempColor.lerpColors(colorMountainRock, colorSnow, smoothstep(snowStart, snowFull, h));
        }
    }
};

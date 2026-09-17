import * as THREE from 'three';

const colorDeepWater    = new THREE.Color(0x1a4a8c);
const colorSand         = new THREE.Color(0xf2e1b8);
const colorMountainGrass= new THREE.Color(0x4b7043);
const colorMountainRock = new THREE.Color(0x5a5e6b);
const colorSnow         = new THREE.Color(0xf5f6fa);

export default {
    name: "🏔️ Misty Mountains II",
    shoreName: "░ Mountain Shore II",
    getHeight(x, z, snoise) {
        // Multi-octave domain-warped alpine range
        const wx = x + snoise(x * 0.00065 + 73.1, z * 0.00065 + 19.4) * 480.0;
        const wz = z + snoise(x * 0.00065 - 41.8, z * 0.00065 + 88.2) * 480.0;

        const n1 = snoise(wx * 0.0005, wz * 0.0005);
        const n2 = snoise(wx * 0.0013 + 120.0, wz * 0.0013 - 120.0);
        const n3 = snoise(x * 0.004 + 250.0, z * 0.004 + 250.0);
        const n4 = snoise(x * 0.012, z * 0.012);

        const massif = Math.pow(Math.max(0, n1 * 0.65 + n2 * 0.35 + 0.38), 1.85) * 190.0;
        const ridges = Math.pow(Math.max(0, snoise(wx * 0.001 + 330, wz * 0.001 + 330)), 2.0) * 55.0;
        const detail = n3 * 16.0 + n4 * 5.0;

        return Math.max(3.0, massif + ridges + detail + 10.0);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const nNoise = snoise(x * 0.008 + 50, z * 0.008 + 50) * 6.0;
        const snowStart = 65.0 + nNoise;
        const snowFull = 120.0 + nNoise;

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

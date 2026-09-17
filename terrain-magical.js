import * as THREE from 'three';

const colorDeepWater = new THREE.Color(0x0a1c3a); // Dark navy water
const colorSand = new THREE.Color(0xb2ebf2);       // Glowing pale cyan shore sand
const colorMagicalViolet = new THREE.Color(0xab47bc); // Purple/violet mystical grass
const colorMagicalPink = new THREE.Color(0xf8bbd0);   // Soft glowing pink highlight grass
const colorMagicalRock = new THREE.Color(0x311b92);   // Deep indigo basalt rock
const colorDirt = new THREE.Color(0x1a0933);          // Dark void ground

export default {
    name: "✨ Magical Sanctuary",
    shoreName: "░ Magical Shore",
    getHeight(x, z, snoise) {
        // Multi-scale surreal plateaus and gentle floating rock towers
        const wx = x + snoise(x * 0.0008 + 55.0, z * 0.0008 + 55.0) * 380.0;
        const wz = z + snoise(x * 0.0008 - 77.0, z * 0.0008 + 77.0) * 380.0;

        const n1 = snoise(wx * 0.0007, wz * 0.0007);
        const n2 = snoise(wx * 0.002 + 80.0, wz * 0.002 - 80.0);
        const n3 = snoise(x * 0.006 + 150.0, z * 0.006 + 150.0);

        const plateau = Math.pow(Math.max(0, n1 * 0.65 + n2 * 0.35 + 0.35), 1.6) * 75.0;
        const detail = n3 * 12.0;

        // Magical geological pillars
        const pillarN = snoise(wx * 0.005 + 400.0, wz * 0.005 - 400.0);
        const pillars = Math.pow(Math.max(0, pillarN - 0.55) / 0.45, 2.0) * 60.0;

        return Math.max(3.0, plateau + detail + pillars + 12.0);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorSand);
        } else if (h < 6.2) {
            tempColor.lerpColors(colorSand, colorMagicalViolet, smoothstep(4.2, 6.2, h));
        } else if (h < 25) {
            tempColor.lerpColors(colorMagicalViolet, colorMagicalPink, smoothstep(6.2, 25, h));
        } else if (h < 38) {
            tempColor.lerpColors(colorMagicalPink, colorMagicalRock, smoothstep(25, 38, h));
        } else {
            tempColor.lerpColors(colorMagicalRock, colorDirt, smoothstep(38, 55, h));
        }
    }
};

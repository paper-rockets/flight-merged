import * as THREE from 'three';
function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}


const colorDeepWater = new THREE.Color(0x1a4a8c);
const colorSand = new THREE.Color(0xf2e1b8);
const colorMountainGrass = new THREE.Color(0x4b7043);
const colorMountainRock = new THREE.Color(0x5a5e6b);
const colorSnow = new THREE.Color(0xf5f6fa);

// Rocky Mountain-style diagonal spine: chain runs NW-SE across the world
// Zone is 22000–34000 in world Z, so spine crosses the center at Z≈28000
const CHAIN_CENTER_Z = 28000;
const CHAIN_ANGLE = Math.PI / 5.5; // ~32.7° diagonal like the Rockies
const _cosA = Math.cos(CHAIN_ANGLE);
const _sinA = Math.sin(CHAIN_ANGLE);

export default {
    name: "🏔️ Misty Mountains",
    shoreName: "░ Mountain Shore",
    getHeight(x, z, snoise) {
        // Perpendicular distance from the diagonal spine
        const perpDist = x * _cosA - (z - CHAIN_CENTER_Z) * _sinA;
        const alongChain = x * _sinA + (z - CHAIN_CENTER_Z) * _cosA;

        // Fast quadratic falloff from spine axis (avoids expensive Math.exp per vertex)
        const spineW = 1100;
        const spineT = Math.max(0.0, 1.0 - (perpDist / spineW) * (perpDist / spineW));
        const spineFactor = spineT * spineT;

        // Ridge noise along the chain — alternating peaks and mountain passes
        const n1 = snoise(alongChain * 0.0007, alongChain * 0.00015);
        let ridge = 1.0 - Math.abs(n1);
        ridge = ridge * ridge;

        // Rocky roughness detail
        const n2 = snoise(x * 0.003, z * 0.003);
        const n3 = snoise(x * 0.009, z * 0.009);

        // Undulating foothills on both sides of the spine
        const foothills = Math.max(8.0, snoise(x * 0.0015, z * 0.0015) * 32.0 + 18.0);

        const peaks = ridge * 195.0 * spineFactor + n2 * 18.0 + n3 * 6.0;

        return Math.max(6.0, foothills + peaks);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, colorSand, smoothstep(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(colorSand);
        } else if (h < 15.0) {
            tempColor.lerpColors(colorSand, colorMountainGrass, smoothstep(4.2, 15.0, h));
        } else if (h < 55.0) {
            tempColor.lerpColors(colorMountainGrass, colorMountainRock, smoothstep(15.0, 55.0, h));
        } else {
            tempColor.lerpColors(colorMountainRock, colorSnow, smoothstep(55.0, 110.0, h));
        }
    }
};

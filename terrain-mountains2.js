import * as THREE from 'three';
function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}


const colorDeepWater    = new THREE.Color(0x1a4a8c);
const colorSand         = new THREE.Color(0xf2e1b8);
const colorMountainGrass= new THREE.Color(0x4b7043);
const colorMountainRock = new THREE.Color(0x5a5e6b);
const colorSnow         = new THREE.Color(0xf5f6fa);

// Second Misty Mountains chain — mirror of the first but centered at Z=58000
const CHAIN_CENTER_Z = 58000;
const CHAIN_ANGLE = Math.PI / 5.5; // same ~32.7° diagonal as first chain
const _cosA = Math.cos(CHAIN_ANGLE);
const _sinA = Math.sin(CHAIN_ANGLE);

export default {
    name: "🏔️ Misty Mountains II",
    shoreName: "░ Mountain Shore II",
    getHeight(x, z, snoise) {
        const perpDist   = x * _cosA - (z - CHAIN_CENTER_Z) * _sinA;
        const alongChain = x * _sinA + (z - CHAIN_CENTER_Z) * _cosA;

        const spineW = 1100;
        const spineT = Math.max(0.0, 1.0 - (perpDist / spineW) * (perpDist / spineW));
        const spineFactor = spineT * spineT;

        // Slightly different ridge seed to avoid identical silhouette
        const n1 = snoise(alongChain * 0.0007 + 50.0, alongChain * 0.00015 + 50.0);
        let ridge = 1.0 - Math.abs(n1);
        ridge = ridge * ridge;

        const n2 = snoise(x * 0.003 + 50, z * 0.003 + 50);
        const n3 = snoise(x * 0.009 + 50, z * 0.009 + 50);

        const foothills = Math.max(8.0, snoise(x * 0.0015 + 50, z * 0.0015 + 50) * 32.0 + 18.0);
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

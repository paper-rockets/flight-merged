import * as THREE from 'three';

function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

const colorDeepWater = new THREE.Color(0x1a4a8c);
const colorSand = new THREE.Color(0xf2e1b8);
const colorMud = new THREE.Color(0x8c6947);        // Wet tropical mud / riverbank
const colorJungleGrass = new THREE.Color(0x389c45); // Tropical emerald
const colorJungleHigh = new THREE.Color(0x286330);  // Deep canopy green
const colorIslandRock = new THREE.Color(0x8a725a);
const colorDirt = new THREE.Color(0xdcb58a);

const tempShore = new THREE.Color();

export default {
    name: "🌴 Lush Jungle",
    shoreName: "░ Jungle Shore",
    palette: [
        { key: 'water', label: 'Deep Water',    color: colorDeepWater },
        { key: 'sand',  label: 'Sand',          color: colorSand },
        { key: 'mud',   label: 'Riverbank Mud', color: colorMud },
        { key: 'grass', label: 'Jungle Grass',  color: colorJungleGrass },
        { key: 'high',  label: 'Canopy Green',  color: colorJungleHigh },
        { key: 'rock',  label: 'Rock',          color: colorIslandRock },
        { key: 'dirt',  label: 'Dirt',          color: colorDirt },
    ],
    getHeight(x, z, snoise) {
        const n1 = snoise(x * 0.002, z * 0.002);
        const n2 = snoise(x * 0.008, z * 0.008);
        const n3 = snoise(x * 0.02, z * 0.02);
        let ridge = 1.0 - Math.abs(n1);
        ridge = ridge * ridge;
        const h = ridge * 65.0 - 2.0 + n2 * 14.0 + n3 * 4.0;
        let finalH = h + 8.0;
        finalH = finalH < 7.5 ? 7.5 + (finalH - 7.5) * 0.15 : finalH;

        // River 1: Main winding river along Z axis (20-40m channel)
        const riverPath1 = Math.sin(z * 0.0003) * 300 + Math.cos(z * 0.0007) * 150;
        const riverDist1 = Math.abs(x - riverPath1);
        const riverWidth1 = 16 + snoise(x * 0.001, z * 0.001) * 5; // Half-width 11-21m (channel 22-42m)
        if (riverDist1 < riverWidth1) {
            const factor1 = 1.0 - smoothstep(0, riverWidth1, riverDist1);
            finalH = finalH * (1.0 - factor1) + 1.0 * factor1;
        }

        // River 2: Secondary winding river along X axis
        const riverPath2 = Math.sin(x * 0.0004 + 2.5) * 250 + Math.cos(x * 0.0008 + 1.2) * 120;
        const riverDist2 = Math.abs(z - riverPath2);
        const riverWidth2 = 14 + snoise(x * 0.0012 + 50, z * 0.0012 + 50) * 4; // Half-width 10-18m (channel 20-36m)
        if (riverDist2 < riverWidth2) {
            const factor2 = 1.0 - smoothstep(0, riverWidth2, riverDist2);
            finalH = finalH * (1.0 - factor2) + 1.2 * factor2;
        }

        // Small lakes: High-frequency noise threshold
        const lakeN = snoise(x * 0.0015, z * 0.0015 + 100);
        if (lakeN > 0.72 && finalH < 20) {
            const t = Math.min((lakeN - 0.72) / 0.15, 1.0);
            const c = smoothstep(0, 1, t);
            const targetLakeH = 1.5 + (lakeN - 0.72) * 3;
            finalH = finalH * (1.0 - c) + targetLakeH * c;
        }

        return finalH;
    },
    getColor(h, x, z, snoise, tempColor, smoothstepFn) {
        const step = smoothstepFn || smoothstep;

        // Dynamic shore tint mixing sand and tropical river mud
        const mudN = snoise(x * 0.01, z * 0.01);
        if (mudN > 0.0) {
            tempShore.lerpColors(colorSand, colorMud, Math.min(1.0, mudN * 1.5));
        } else {
            tempShore.copy(colorSand);
        }

        if (h < 1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 2.35) {
            tempColor.lerpColors(colorDeepWater, tempShore, step(1.0, 2.35, h));
        } else if (h < 4.2) {
            tempColor.copy(tempShore);
        } else if (h < 6.2) {
            tempColor.lerpColors(tempShore, colorJungleGrass, step(4.2, 6.2, h));
        } else if (h < 25) {
            tempColor.lerpColors(colorJungleGrass, colorJungleHigh, step(6.2, 25, h));
        } else if (h < 38) {
            tempColor.lerpColors(colorJungleHigh, colorIslandRock, step(25, 38, h));
        } else {
            tempColor.lerpColors(colorIslandRock, colorDirt, step(38, 55, h));
        }
    }
};

import * as THREE from 'three';

const colorSand = new THREE.Color(0xf2e1b8);

export default {
    name: "🌊 Open Ocean",
    shoreName: "🌊 Open Ocean",
    palette: [
        { key: 'sand', label: 'Deep Sand', color: colorSand },
    ],
    getHeight(x, z, snoise, zone) {
        // Deep underwater dunes to ensure no bits stick out of the ocean
        const duneNoise = snoise(x * 0.001, z * 0.001);
        return -25.0 + duneNoise * 5.0; 
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        tempColor.copy(colorSand);
    }
};

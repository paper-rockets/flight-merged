import * as THREE from 'three';

const colorDeepWater  = new THREE.Color(0x0d2d5a);
const colorCrystalSea = new THREE.Color(0x2ab0c5);
const colorSand       = new THREE.Color(0xc8e8f2);
const colorValleyFloor= new THREE.Color(0x4ecdc4);
const colorCrystalLow = new THREE.Color(0x7fffd4);
const colorCrystalMid = new THREE.Color(0xa78bfa);
const colorCrystalHigh= new THREE.Color(0xe0b0ff);
const colorSpire      = new THREE.Color(0xffffff);

export default {
    name: '💎 Crystal Land',
    nightGlowMult: 1.5,
    setNightGlowMult(val) {
        this.nightGlowMult = typeof val === 'number' ? val : parseFloat(val);
    },
    getNightGlowMult() {
        return this.nightGlowMult;
    },
    setGroundColors(hexArray) {
        if (hexArray[0]) colorSand.set(hexArray[0]);
        if (hexArray[1]) colorValleyFloor.set(hexArray[1]);
        if (hexArray[2]) colorCrystalLow.set(hexArray[2]);
        if (hexArray[3]) colorCrystalMid.set(hexArray[3]);
        if (hexArray[4]) colorCrystalHigh.set(hexArray[4]);
        if (hexArray[5]) colorSpire.set(hexArray[5]);
    },
    getHeight(x, z, snoise) {
        // Multi-scale quartz valley and crystalline ridges
        const wx = x + snoise(x * 0.0008 + 15.0, z * 0.0008 - 15.0) * 350.0;
        const wz = z + snoise(x * 0.0008 - 15.0, z * 0.0008 + 15.0) * 350.0;

        const n1 = snoise(wx * 0.0007, wz * 0.0007);
        const n2 = snoise(wx * 0.002 + 40.0, wz * 0.002 - 40.0);
        const valley = (n1 * 0.6 + n2 * 0.4) * 32.0 + 20.0;

        // Crystal spire peaks
        const spikeN1 = snoise(x * 0.006 + 300, z * 0.006 - 200);
        const spikeN2 = snoise(x * 0.009 - 500, z * 0.009 + 400);

        const s1 = Math.max(0, spikeN1 - 0.52) / 0.48;
        const s2 = Math.max(0, spikeN2 - 0.58) / 0.42;

        const spires = (s1 * s1 * 80.0) + (s2 * s2 * 60.0);

        return Math.max(3.0, valley + spires);
    },
    getColor(h, x, z, snoise, tempColor, smoothstep) {
        const shimmer = snoise(x * 0.025 + 1000, z * 0.025 + 1000) * 0.5 + 0.5;

        if (h < -1.0) {
            tempColor.copy(colorDeepWater);
        } else if (h < 1.0) {
            tempColor.lerpColors(colorDeepWater, colorCrystalSea, smoothstep(-1.0, 1.0, h));
        } else if (h < 3.5) {
            tempColor.copy(colorSand);
        } else if (h < 14.0) {
            tempColor.lerpColors(colorSand, colorValleyFloor, smoothstep(3.5, 14.0, h));
        } else if (h < 25.0) {
            tempColor.lerpColors(colorValleyFloor, colorCrystalLow, smoothstep(14.0, 25.0, h));
        } else if (h < 55.0) {
            const t = smoothstep(25.0, 55.0, h);
            tempColor.lerpColors(colorCrystalLow, colorCrystalMid, t);
            if (shimmer > 0.65) tempColor.lerp(colorCrystalHigh, (shimmer - 0.65) * 1.5);
        } else {
            tempColor.lerpColors(colorCrystalMid, colorSpire, smoothstep(55.0, 95.0, h));
        }
    }
};

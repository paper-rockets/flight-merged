import * as THREE from 'three';

const toonVertexShader = `
varying vec2 vWaterUv;
varying vec3 vWaterWorldPos;

uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;

void main() {
  vWaterUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  float wave1 = sin(worldPos.x * uWaveFrequency * 0.1 + uTime * uWaveSpeed) * cos(worldPos.z * uWaveFrequency * 0.1 + uTime * uWaveSpeed * 0.8);
  float wave2 = sin(worldPos.x * uWaveFrequency * 0.25 - uTime * uWaveSpeed * 1.2) * 0.5;
  float waveOffset = (wave1 + wave2) * uWaveAmplitude;
  vec3 modifiedPosition = position;
  modifiedPosition.y += waveOffset;
  vWaterWorldPos = (modelMatrix * vec4(modifiedPosition, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(modifiedPosition, 1.0);
}
`;

const toonFragmentShader = `
varying vec2 vWaterUv;
varying vec3 vWaterWorldPos;

uniform float uTime;
uniform vec3 uColorNear;
uniform vec3 uColorFar;
uniform vec3 uFoamColor;
uniform float uTextureSize;
uniform float uWaterOpacity;
uniform vec3 uCameraPos;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec3 finalColor = uColorNear;
    vec2 worldUV = vWaterWorldPos.xz * 0.05 * (uTextureSize * 0.04);
    float noiseBase = snoise(worldUV * 2.8 + sin(uTime * 0.3));
    noiseBase = noiseBase * 0.5 + 0.5;
    vec3 colorBase = vec3(noiseBase);
    vec3 foam = smoothstep(0.08, 0.001, colorBase);
    foam = step(0.5, foam);
    float noiseWaves = snoise(worldUV + sin(uTime * -0.1));
    noiseWaves = noiseWaves * 0.5 + 0.5;
    vec3 colorWaves = vec3(noiseWaves);
    float threshold = 0.6 + 0.01 * sin(uTime * 2.0);
    vec3 waveEffect = 1.0 - (smoothstep(threshold + 0.03, threshold + 0.032, colorWaves) + smoothstep(threshold, threshold - 0.01, colorWaves));
    waveEffect = step(0.5, waveEffect);
    vec3 combinedEffect = min(waveEffect + foam, 1.0);
    vec3 baseColor = mix(finalColor, uColorFar, 0.5);
    vec3 foamEffect = foam * uFoamColor;
    finalColor = (1.0 - combinedEffect) * baseColor + combinedEffect * uFoamColor;
    float alphaVal = mix(uWaterOpacity * 0.6, uWaterOpacity, length(foamEffect));
    
    // Fade out alpha at extreme distance to hide the hard geometric mesh edge
    float distToCamera = length(vWaterWorldPos.xz - uCameraPos.xz);
    float edgeFade = smoothstep(3000.0, 4800.0, distToCamera);
    alphaVal *= (1.0 - edgeFade);
    gl_FragColor = vec4(finalColor, alphaVal);
}
`;

export function createDefaultWater() {
    const waterGeo = new THREE.PlaneGeometry(10000, 10000);
    waterGeo.rotateX(-Math.PI / 2);

    const waterUniforms = {
        uTime: { value: 0 }
    };

    const waterMat = new THREE.MeshStandardMaterial({ 
        color: 0x4da9e8, 
        transparent: false, 
        opacity: 1.0,
        roughness: 0.1,
        metalness: 0.2
    });

    waterMat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = waterUniforms.uTime;

        shader.vertexShader = `
            varying vec3 vWorldPos;
        ` + shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
            `#include <worldpos_vertex>`,
            `#include <worldpos_vertex>
             vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`
        );

        shader.fragmentShader = `
            uniform float uTime;
            varying vec3 vWorldPos;

            vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
            float snoise(vec2 v){
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
                i = mod(i, 289.0);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ; m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox; m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g; g.x  = a0.x  * x0.x  + h.x  * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }
        ` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <color_fragment>`,
            `#include <color_fragment>
             vec2 uv = vWorldPos.xz * 0.1; // Much smaller, more tightly packed ripples
             float n1 = 1.0 - abs(snoise(uv + vec2(uTime * 0.1, uTime * 0.05)));
             float n2 = 1.0 - abs(snoise(uv * 1.5 - vec2(uTime * 0.15, -uTime * 0.05)));
             float caustics = pow(n1, 6.0) + pow(n2, 6.0) * 0.5;

             // Keep shimmer and caustics active across ALL water (full ocean and archipelago)
             caustics = clamp(caustics, 0.0, 1.0);
             diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.95, 1.0), caustics * 0.65);
            `
        );
    };

    const mesh = new THREE.Mesh(waterGeo, waterMat);
    mesh.position.y = 2.4;
    mesh.receiveShadow = true;

    return {
        mesh,
        uniforms: waterUniforms,
        dispose: () => {
            waterGeo.dispose();
            waterMat.dispose();
        }
    };
}

export function createToonWater() {
    const waterGeo = new THREE.PlaneGeometry(10000, 10000, 128, 128);
    waterGeo.rotateX(-Math.PI / 2);

    const waterUniforms = {
        uTime: { value: 0 },
        uCameraPos: { value: new THREE.Vector3(0, 0, 0) },
        uColorNear: { value: new THREE.Color('#00fccd') },
        uColorFar: { value: new THREE.Color('#1ceeff') },
        uFoamColor: { value: new THREE.Color('#ffffff') },
        uWaveSpeed: { value: 1.0 },
        uWaveAmplitude: { value: 0.3 },
        uWaveFrequency: { value: 0.3 },
        uTextureSize: { value: 45.0 },
        uWaterOpacity: { value: 0.85 }
    };

    const waterMat = new THREE.ShaderMaterial({
        vertexShader: toonVertexShader,
        fragmentShader: toonFragmentShader,
        uniforms: waterUniforms,
        transparent: true,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(waterGeo, waterMat);
    mesh.position.y = 2.4;
    mesh.receiveShadow = true;

    return {
        mesh,
        uniforms: waterUniforms,
        dispose: () => {
            waterGeo.dispose();
            waterMat.dispose();
        }
    };
}

const realisticVertexShader = `
out vec2 vWaterUv;
out vec3 vWaterWorldPos;

uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveHeight;
uniform float uOceanScale;
uniform float uSwellWavelength;
uniform float uSea;

uniform vec2 uW_dir[10];
uniform float uW_st[10];
uniform float uW_ph[10];
uniform float uW_k[10];
uniform float uW_c[10];

void main() {
    vWaterUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec2 xz = worldPos.xz * uOceanScale;

    vec3 disp = vec3(0.0);
    for (int i = 0; i < 10; i++) {
        float a = (uW_st[i] * uSea * uSwellWavelength) / uW_k[i];
        float phase = uW_k[i] * (dot(uW_dir[i], xz) - uTime * uWaveSpeed * uW_c[i]) + uW_ph[i];
        float f = mod(phase, 6.28318530718);
        disp.x += a * uW_dir[i].x * cos(f);
        disp.y += a * sin(f) * uWaveHeight;
        disp.z += a * uW_dir[i].y * cos(f);
    }

    vec3 modifiedPos = position + disp;
    vec4 finalWorldPos = modelMatrix * vec4(modifiedPos, 1.0);
    vWaterWorldPos = finalWorldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * finalWorldPos;
}
`;

const realisticFragmentShader = `
in vec2 vWaterUv;
in vec3 vWaterWorldPos;
out vec4 fragColor;

uniform float uTime;
uniform vec3 uCameraPos;
uniform float uSea;
uniform float uWaveSpeed;
uniform float uWaveHeight;
uniform float uOceanScale;
uniform float uSwellWavelength;
uniform float uDetailAmount;
uniform float uChopPatchiness;
uniform float uFoamAmount;
uniform float uFoamEnabled;
uniform float uWaterOpacity;
uniform float uTimeOfDay;
uniform float uBloomIntensity;
uniform float uStarDensity;

uniform vec3 uShallowColor;
uniform vec3 uDeepColor;
uniform vec3 uFoamColor;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uHorizonColor;
uniform vec3 uZenithColor;

uniform vec2 uW_dir[10];
uniform float uW_st[10];
uniform float uW_ph[10];
uniform float uW_k[10];
uniform float uW_c[10];

vec2 hash2(vec2 p) {
    uvec2 q = uvec2(ivec2(p)) * uvec2(1597334673U, 3812015801U);
    q = (q.x ^ q.y) * uvec2(1597334673U, 3812015801U);
    return vec2(q) * (1.0 / float(0xffffffffU)) * 2.0 - 1.0;
}

float gradNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float period = 1024.0;
    vec2 i00 = mod(i, period);
    vec2 i10 = mod(i + vec2(1.0, 0.0), period);
    vec2 i01 = mod(i + vec2(0.0, 1.0), period);
    vec2 i11 = mod(i + vec2(1.0, 1.0), period);
    float n00 = dot(hash2(i00), f);
    float n10 = dot(hash2(i10), f - vec2(1.0, 0.0));
    float n01 = dot(hash2(i01), f - vec2(0.0, 1.0));
    float n11 = dot(hash2(i11), f - vec2(1.0, 1.0));
    return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
}

float fbm(vec2 p) {
    return gradNoise(p)
         + gradNoise(p * 2.04 + vec2(17.3, 9.1)) * 0.5
         + gradNoise(p * 4.11 + vec2(42.7, 28.6)) * 0.25;
}

float detailHeight(vec2 xz, float time) {
    vec2 driftA = vec2(time * 0.55 * uWaveSpeed, time * 0.32 * uWaveSpeed);
    vec2 driftB = vec2(time * -0.4 * uWaveSpeed, time * 0.5 * uWaveSpeed);
    return fbm(xz * 0.85 + driftA) + fbm(xz * 2.1 + driftB) * 0.45;
}

vec3 calcWaveNormal(vec2 rawXz, float time, float sea) {
    vec2 xz = rawXz * uOceanScale;
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    for (int i = 0; i < 10; i++) {
        float q = uW_st[i] * sea * uWaveHeight;
        float phase = uW_k[i] * (dot(uW_dir[i], xz) - time * uWaveSpeed * uW_c[i]) + uW_ph[i];
        float f = mod(phase, 6.28318530718);
        float s = sin(f);
        float co = cos(f);
        tangent.x -= q * uW_dir[i].x * uW_dir[i].x * s;
        tangent.y += q * uW_dir[i].x * co;
        tangent.z -= q * uW_dir[i].x * uW_dir[i].y * s;
        binormal.x -= q * uW_dir[i].x * uW_dir[i].y * s;
        binormal.y += q * uW_dir[i].y * co;
        binormal.z -= q * uW_dir[i].y * uW_dir[i].y * s;
    }
    return normalize(cross(binormal, tangent));
}

float calcWaveCrest(vec2 rawXz, float time, float sea) {
    vec2 xz = rawXz * uOceanScale;
    float h = 0.0;
    for (int i = 0; i < 10; i++) {
        float a = (uW_st[i] * sea * uSwellWavelength) / uW_k[i];
        float phase = uW_k[i] * (dot(uW_dir[i], xz) - time * uWaveSpeed * uW_c[i]) + uW_ph[i];
        float f = mod(phase, 6.28318530718);
        h += a * sin(f) * uWaveHeight;
    }
    return h;
}

vec3 hash33(vec3 p) {
    vec3 q = vec3(
        dot(p, vec3(127.1, 311.7, 74.7)),
        dot(p, vec3(269.5, 183.3, 246.1)),
        dot(p, vec3(113.5, 271.9, 124.6))
    );
    return fract(sin(q) * 43758.5453);
}

vec3 starField(vec3 dir, float time, vec3 sunDir, float starDensity) {
    float up = max(dir.y, 0.0);
    float nightFactor = smoothstep(0.12, -0.25, sunDir.y);

    vec3 p3d = normalize(dir) * 280.0;
    vec3 cell = floor(p3d);
    vec3 localP = fract(p3d) - 0.5;
    vec3 rnd = hash33(cell);

    vec3 starOffset = (rnd - 0.5) * 0.8;
    float dist = length(localP - starOffset);

    float starPoint = smoothstep(0.16, 0.02, dist);
    float starMagnitude = pow(rnd.z, 7.0) * 2.2 + 0.15;

    float twinkle = sin(rnd.y * 30.0 + time * 2.5) * 0.3 + 0.7;

    float galacticLat = dir.x * 0.5 + dir.y * 0.8 - dir.z * 0.3;
    float milkyWayMask = smoothstep(0.45, 0.0, abs(galacticLat)) * up;
    float milkyWayDust = fbm(dir.xy * 4.0 + vec2(12.3, 4.5)) * 0.5 + 0.5;
    vec3 milkyWayGlow = vec3(0.03, 0.05, 0.11) * milkyWayMask * milkyWayDust * nightFactor;

    vec3 starTint = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.85, 0.6), rnd.x);
    vec3 stars = starTint * starPoint * starMagnitude * twinkle * up * nightFactor * starDensity;

    return stars + milkyWayGlow;
}

vec3 skyColor(vec3 rawDir, vec3 sunDir, vec3 sunCol, vec3 horizCol, vec3 zenithCol, vec3 deepCol) {
    vec3 dir = normalize(rawDir);
    float up = clamp(dir.y, -0.15, 1.0);
    vec3 sky = mix(horizCol, zenithCol, pow(max(up, 0.0), 0.42));

    vec3 hazeColor = deepCol * 1.4 + horizCol * 0.25;
    sky = mix(sky, hazeColor, 1.0 - smoothstep(-0.15, 0.0, dir.y));

    float s = max(dot(dir, sunDir), 0.0);
    sky += sunCol * pow(s, 10.0) * 0.18;
    sky += sunCol * smoothstep(0.9994, 0.9998, s) * 30.0 * (0.2 + uBloomIntensity * 2.0);
    
    // Add stars!
    sky += starField(dir, uTime, sunDir, uStarDensity);
    
    return sky;
}

void main() {
    vec3 P = vWaterWorldPos;
    vec2 xz = P.xz;

    vec3 n0 = calcWaveNormal(xz, uTime, uSea);
    float crest = calcWaveCrest(xz, uTime, uSea);

    float h0 = detailHeight(xz, uTime);
    float hx = detailHeight(xz + vec2(0.1, 0.0), uTime);
    float hz = detailHeight(xz + vec2(0.0, 0.1), uTime);

    float chopMask = fbm(xz * 0.045 + vec2(uTime * 0.018 * uWaveSpeed, uTime * -0.012 * uWaveSpeed)) * 0.5 + 0.5;
    float nonUniformChop = mix(0.35, 1.65, chopMask * uChopPatchiness);
    float crestChopMult = mix(0.55, 1.45, smoothstep(-0.4, 1.1, crest));

    vec3 detail = vec3(h0 - hx, 0.0, h0 - hz) * (1.5 * (uSea * 0.6 + 0.4) * uDetailAmount * nonUniformChop * crestChopMult);
    vec3 N = normalize(n0 + detail);

    vec3 V = normalize(uCameraPos - P);
    vec3 sunDir = normalize(uSunDir);

    // Color body — bias strongly toward deep color; shallow tint only on wave peaks
    float colorTurbulence = fbm(xz * 0.035 + vec2(uTime * 0.015 * uWaveSpeed, uTime * -0.01 * uWaveSpeed)) * 0.12;
    float shallowBlend = clamp(crest * 0.08 + 0.18 + colorTurbulence, 0.0, 0.45);
    vec3 body = mix(uDeepColor, uShallowColor, shallowBlend);

    float sss = pow(max(dot(V, sunDir), 0.0), 3.0) * max(crest, 0.0) * 0.18;
    body += mix(uShallowColor, uSunColor, 0.5) * sss;

    vec3 R = reflect(-V, N);
    R.y = max(R.y, 0.04);
    R = normalize(R);

    // Proper physical fresnel for a deeper water look
    float NdotV = max(dot(N, V), 0.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - NdotV, 5.0);
    vec3 skyCol = skyColor(R, sunDir, uSunColor, uHorizonColor, uZenithColor, uDeepColor);
    vec3 color = mix(body, skyCol, fresnel);

    vec3 H = normalize(sunDir + V);
    float glitterNoise = fbm(xz * 2.1 + vec2(uTime * -0.4 * uWaveSpeed, uTime * 0.5 * uWaveSpeed)) * 0.5 + 0.5;
    // Tight specular highlights like original demo
    float glitter = pow(max(dot(N, H), 0.0), 500.0) * mix(0.4, 3.4, glitterNoise);
    float sheen = pow(max(dot(N, H), 0.0), 48.0) * 0.12;
    color += uSunColor * (glitter + sheen);

    float foamNoise = fbm(xz * 1.1 + vec2(uTime * 0.22 * uWaveSpeed, uTime * 0.14 * uWaveSpeed)) * 0.5 + 0.5;
    float foam = smoothstep(0.5, 0.95, foamNoise) * smoothstep(1.0, 2.0, crest) * uFoamAmount * uFoamEnabled;

    color = mix(color, uFoamColor, clamp(foam * 0.85, 0.0, 1.0));

    // Fade out alpha at extreme distance to hide the hard geometric mesh edge
    float camDist = length(uCameraPos - P);
    float edgeFade = smoothstep(3000.0, 4800.0, camDist);

    fragColor = vec4(color, uWaterOpacity * (1.0 - edgeFade));
}
`;

export function createRealisticWater() {
    const waterGeo = new THREE.PlaneGeometry(10000, 10000, 128, 128);
    waterGeo.rotateX(-Math.PI / 2);

    const waterUniforms = {
        uTime: { value: 0 },
        uCameraPos: { value: new THREE.Vector3(0, 0, 0) },
        uSea: { value: 0.45 },
        uWaveSpeed: { value: 1.0 },
        uWaveHeight: { value: 1.0 },
        uOceanScale: { value: 1.0 },
        uSwellWavelength: { value: 1.0 },
        uDetailAmount: { value: 1.0 },
        uChopPatchiness: { value: 1.0 },
        uFoamAmount: { value: 1.0 },
        uFoamEnabled: { value: 1.0 },
        uWaterOpacity: { value: 0.85 },
        uTimeOfDay: { value: 0.55 },
        uBloomIntensity: { value: 0.4 },
        uStarDensity: { value: 1.0 },
        uShallowColor: { value: new THREE.Color('#0e5257') },
        uDeepColor: { value: new THREE.Color('#04171c') },
        uFoamColor: { value: new THREE.Color('#ebf5fc') },
        uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        uSunColor: { value: new THREE.Color('#ffffff') },
        uHorizonColor: { value: new THREE.Color('#85aece') },
        uZenithColor: { value: new THREE.Color('#12336b') },
        uW_dir: { value: [
            new THREE.Vector2(0.97014, 0.24254), new THREE.Vector2(0.65518, 0.75598),
            new THREE.Vector2(-0.72719, 0.68646), new THREE.Vector2(0.35212, -0.93596),
            new THREE.Vector2(-0.42284, -0.90620), new THREE.Vector2(0.92429, -0.38169),
            new THREE.Vector2(-0.85303, 0.52185), new THREE.Vector2(0.15132, 0.98849),
            new THREE.Vector2(-0.55249, -0.83352), new THREE.Vector2(0.78308, 0.62191)
        ]},
        uW_st: { value: [0.11, 0.10, 0.08, 0.07, 0.05, 0.04, 0.03, 0.02, 0.015, 0.01] },
        uW_ph: { value: [0.0, 1.2, 2.4, 0.5, 3.1, 4.2, 1.8, 5.0, 0.9, 3.7] },
        uW_k: { value: [0.084907, 0.14612, 0.22848, 0.38785, 0.64114, 0.98175, 1.53248, 2.32711, 3.49066, 5.71199] },
        uW_c: { value: [0.91219, 1.19665, 1.49636, 1.94960, 2.50663, 3.10180, 3.87535, 4.77553, 5.84880, 7.48164] }
    };

    const waterMat = new THREE.ShaderMaterial({
        vertexShader: realisticVertexShader,
        fragmentShader: realisticFragmentShader,
        uniforms: waterUniforms,
        transparent: true,
        side: THREE.DoubleSide,
        glslVersion: THREE.GLSL3
    });

    const mesh = new THREE.Mesh(waterGeo, waterMat);
    mesh.position.y = 2.4;
    mesh.receiveShadow = true;

    return {
        mesh,
        uniforms: waterUniforms,
        dispose: () => {
            waterGeo.dispose();
            waterMat.dispose();
        }
    };
}

export function switchWaterMode(mode, scene, currentWaterMesh, camera) {
    let prevPos = new THREE.Vector3(0, 2.4, 0);
    let prevScale = new THREE.Vector3(1, 1, 1);
    let prevVisible = true;

    if (currentWaterMesh) {
        prevPos.copy(currentWaterMesh.position);
        prevScale.copy(currentWaterMesh.scale);
        prevVisible = currentWaterMesh.visible;
        if (scene) {
            scene.remove(currentWaterMesh);
        }
        if (currentWaterMesh.geometry) {
            currentWaterMesh.geometry.dispose();
        }
        if (currentWaterMesh.material) {
            currentWaterMesh.material.dispose();
        }
    }

    let state;
    if (mode === 'toon') {
        state = createToonWater();
    } else if (mode === 'realistic') {
        state = createRealisticWater();
    } else {
        state = createDefaultWater();
    }

    state.mesh.position.copy(prevPos);
    state.mesh.scale.copy(prevScale);
    state.mesh.visible = prevVisible;

    if (scene) {
        scene.add(state.mesh);
    }

    if (camera && state.uniforms.uCameraPos) {
        state.uniforms.uCameraPos.value.copy(camera.position);
    }

    return {
        mesh: state.mesh,
        uniforms: state.uniforms,
        mode: mode,
        dispose: state.dispose
    };
}


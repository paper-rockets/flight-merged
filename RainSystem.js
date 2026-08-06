import * as THREE from 'three';

const VERTEX_SHADER = /* glsl */`
uniform float uTime;
uniform vec3 uPlayerPos;
uniform float uIntensity;
uniform float uSpeed;
uniform float uSize;
uniform float uWindAngle;

attribute float aOffsetX;
attribute float aOffsetZ;
attribute float aPhase;
attribute float aSpeed;

varying vec2 vUv;

void main() {
  vUv = uv;

  // Calculate raindrop fall Y (drops fall Y=80 to Y=0 relative to phase)
  float fallY = mod(aPhase - uTime * 40.0 * uSpeed * aSpeed, 80.0);

  // Horizontal wind drift
  float windDriftX = sin(uWindAngle) * uTime * 10.0;
  float windDriftZ = cos(uWindAngle) * uTime * 10.0;

  // Keep drops bounded within a 200x200m area centered on uPlayerPos
  float dropX = mod(aOffsetX + windDriftX + 100.0, 200.0) - 100.0;
  float dropZ = mod(aOffsetZ + windDriftZ + 100.0, 200.0) - 100.0;

  vec3 worldCenter = vec3(
    uPlayerPos.x + dropX,
    uPlayerPos.y + fallY - 40.0,
    uPlayerPos.z + dropZ
  );

  // Velocity vector in world space for screen-space quad alignment
  vec3 fallVel = vec3(
    sin(uWindAngle) * 5.0 * uSpeed,
    -40.0 * uSpeed * aSpeed,
    cos(uWindAngle) * 5.0 * uSpeed
  );

  // Transform world center to view space
  vec4 mvPosition = modelViewMatrix * vec4(worldCenter, 1.0);

  // Transform velocity vector to view space
  vec3 viewVel = mat3(modelViewMatrix) * fallVel;

  vec2 dirY = length(viewVel.xy) > 0.001 ? normalize(viewVel.xy) : vec2(0.0, -1.0);
  vec2 dirX = vec2(-dirY.y, dirY.x);

  // Stretch quad vertically and keep it thin horizontally
  vec2 quadOffset = dirX * (position.x * uSize * 0.08) + dirY * (position.y * uSize * 1.0);

  mvPosition.xy += quadOffset;

  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT_SHADER = /* glsl */`
uniform float uIntensity;
uniform vec3 uRainColor;

varying vec2 vUv;

void main() {
  float alpha = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
  alpha *= uIntensity * 0.6;
  gl_FragColor = vec4(uRainColor, alpha);
}
`;

export function createRainSystem(scene) {
  const COUNT = 8000;
  let userVisible = true;

  // Base quad geometry
  const baseGeo = new THREE.PlaneGeometry(1, 1);
  const instGeo = new THREE.InstancedBufferGeometry();
  instGeo.index = baseGeo.index;
  instGeo.setAttribute('position', baseGeo.attributes.position);
  instGeo.setAttribute('uv', baseGeo.attributes.uv);

  // Instance attributes
  const offsetsX = new Float32Array(COUNT);
  const offsetsZ = new Float32Array(COUNT);
  const phases = new Float32Array(COUNT);
  const speeds = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    offsetsX[i] = (Math.random() - 0.5) * 200.0;
    offsetsZ[i] = (Math.random() - 0.5) * 200.0;
    phases[i] = Math.random() * 80.0;
    speeds[i] = 0.8 + Math.random() * 0.4;
  }

  instGeo.setAttribute('aOffsetX', new THREE.InstancedBufferAttribute(offsetsX, 1));
  instGeo.setAttribute('aOffsetZ', new THREE.InstancedBufferAttribute(offsetsZ, 1));
  instGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  instGeo.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPlayerPos: { value: new THREE.Vector3() },
    uIntensity: { value: 0.5 },
    uSpeed: { value: 2.0 },
    uSize: { value: 1.0 },
    uWindAngle: { value: 45.0 * Math.PI / 180.0 },
    uRainColor: { value: new THREE.Color('#c8d8f0') }
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending
  });

  const mesh = new THREE.Mesh(instGeo, material);
  mesh.frustumCulled = false;

  if (scene) {
    scene.add(mesh);
  }

  function update(dt, playerX, playerY, playerZ) {
    uniforms.uTime.value += dt;
    uniforms.uPlayerPos.value.set(playerX, playerY, playerZ);
  }

  function setIntensity(v) {
    const val = Math.max(0, Math.min(1, v));
    uniforms.uIntensity.value = val;
    instGeo.instanceCount = Math.floor(COUNT * val);
    mesh.visible = userVisible && val > 0;
  }

  function setSpeed(v) {
    uniforms.uSpeed.value = v;
  }

  function setSize(v) {
    uniforms.uSize.value = v;
  }

  function setWindAngle(deg) {
    uniforms.uWindAngle.value = (deg * Math.PI) / 180.0;
  }

  function setColor(hexString) {
    uniforms.uRainColor.value.set(hexString);
  }

  function setVisible(bool) {
    userVisible = !!bool;
    mesh.visible = userVisible && uniforms.uIntensity.value > 0;
  }

  function dispose() {
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
    instGeo.dispose();
    material.dispose();
    baseGeo.dispose();
  }

  return {
    mesh,
    update,
    setIntensity,
    setSpeed,
    setSize,
    setWindAngle,
    setColor,
    setVisible,
    dispose
  };
}

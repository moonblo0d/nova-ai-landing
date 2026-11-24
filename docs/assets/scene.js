// 3D-сцена: «AI-ядро» — сфера, що «дихає» шумом у шейдері, кільце частинок і реакція на скрол та мишу.
import * as THREE from "three";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  varying vec3 vNormal;
  varying float vNoise;

  // 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT)
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    float n = snoise(normal * 1.6 + uTime * 0.35);
    vNoise = n;
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position + normal * n * uAmp;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  varying vec3 vNormal;
  varying float vNoise;
  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.2);
    vec3 base = mix(uColorA, uColorB, smoothstep(-0.6, 0.6, vNoise));
    vec3 color = mix(base, uColorC, fresnel * 0.9);
    gl_FragColor = vec4(color + fresnel * 0.35, 1.0);
  }
`;

export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.32 },
    uColorA: { value: new THREE.Color("#7c5cff") },
    uColorB: { value: new THREE.Color("#22d3ee") },
    uColorC: { value: new THREE.Color("#f472b6") },
  };
  const isMobile = window.matchMedia("(max-width: 680px)").matches;
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.35, isMobile ? 48 : 96),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader })
  );
  scene.add(core);

  // Кільце частинок навколо ядра
  const count = isMobile ? 900 : 1800;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 2.1 + Math.random() * 1.6;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 0.6 * (r - 1.6);
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const ring = new THREE.Points(ringGeo, new THREE.PointsMaterial({
    size: isMobile ? 0.03 : 0.022, color: "#a5b4fc", transparent: true, opacity: 0.75, depthWrite: false,
  }));
  ring.rotation.x = 0.35;
  scene.add(ring);

  // Зоряний фон
  const starsGeo = new THREE.BufferGeometry();
  const stars = new Float32Array(600 * 3).map(() => (Math.random() - 0.5) * 40);
  starsGeo.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ size: 0.04, color: "#ffffff", transparent: true, opacity: 0.35 })));

  // Позиції ядра для кожного «етапу» сторінки (data-stage секцій)
  const isTablet = !isMobile && window.matchMedia("(max-width: 1100px)").matches;
  const stages = isMobile
    ? [[0.95, 1.85, 0.46], [1.0, 1.9, 0.4], [-1.0, 1.9, 0.4], [1.0, 1.85, 0.4], [-0.95, 1.9, 0.4], [1.0, 1.9, 0.4], [0, 1.6, 0.5]]
    : isTablet
      ? [[1.7, 0.9, 0.72], [1.9, 0.4, 0.6], [-1.8, 0.6, 0.6], [1.8, -0.2, 0.6], [0, 1.9, 0.45], [-1.9, 0.2, 0.6], [0, 0, 0.95]]
      : [[1.9, 0, 1], [2.6, 0.2, 0.75], [-2.4, 0, 0.8], [2.4, -0.3, 0.7], [0, 2.2, 0.55], [-2.5, 0.2, 0.7], [0, 0, 1.15]];
  const target = { x: stages[0][0], y: stages[0][1], s: stages[0][2] };
  const pointer = { x: 0, y: 0 };
  // Стартуємо одразу в позиції першого екрана, щоб ядро не перекривало заголовок під час завантаження
  core.position.set(target.x, target.y, 0);
  core.scale.setScalar(target.s);

  const sections = [...document.querySelectorAll("[data-stage]")];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const [x, y, s] = stages[Number(e.target.dataset.stage)] || stages[0];
        Object.assign(target, { x, y, s });
      }
    });
  }, { threshold: 0.45 });
  sections.forEach((s) => io.observe(s));

  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) tick(); });

  function tick() {
    if (!running) return;
    const t = clock.getElapsedTime();
    const k = 0.045;
    uniforms.uTime.value = reduced ? 0 : t;
    core.position.x += (target.x - core.position.x) * k;
    core.position.y += (target.y - core.position.y) * k;
    const s = core.scale.x + (target.s - core.scale.x) * k;
    core.scale.setScalar(s);
    ring.position.copy(core.position);
    ring.scale.setScalar(s);
    core.rotation.y = t * 0.12 + pointer.x * 0.4;
    core.rotation.x = pointer.y * 0.3;
    ring.rotation.y = -t * 0.06;
    camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.03;
    camera.position.y += (-pointer.y * 0.25 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

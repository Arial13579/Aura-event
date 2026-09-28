import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const isLite = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

// Camera choreography per section: azimuth, elevation, distance, look height, pan (booth pushed to screen-left).
const SHOTS = {
  hero:       { az: 0.50, el: 0.10, dist: 6.4, h: 1.40, pan: 1.15 },
  experience: { az: 1.30, el: 0.07, dist: 4.9, h: 1.45, pan: 0.95 },
  how:        { az: 0.28, el: 0.06, dist: 4.6, h: 1.50, pan: 0.85 },
  try:        { az: 0.06, el: 0.03, dist: 4.5, h: 1.78, pan: 0.8 },
  product:    { az: -0.90, el: 0.28, dist: 7.5, h: 1.20, pan: 0 },
  packages:   { az: -2.10, el: 0.45, dist: 8.5, h: 1.10, pan: 0 },
  contact:    { az: -0.55, el: 0.12, dist: 6.0, h: 1.40, pan: 1.05 },
};
const LITE = { pan: 0, distMul: 1.7, hAdd: -0.3 };

/* ---------------- procedural textures ---------------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function woodTexture() {
  const [c, g] = canvas(1024, 1024);
  const grd = g.createLinearGradient(0, 0, 0, 1024);
  grd.addColorStop(0, '#d2ad7e'); grd.addColorStop(.5, '#e2c396'); grd.addColorStop(1, '#cfa574');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 320; i++) {
    const y0 = Math.random() * 1024, amp = 3 + Math.random() * 16, f = .002 + Math.random() * .006, ph = Math.random() * 6.3;
    g.strokeStyle = `rgba(${110 + Math.random() * 50 | 0},${70 + Math.random() * 30 | 0},${38 + Math.random() * 20 | 0},${.04 + Math.random() * .13})`;
    g.lineWidth = .5 + Math.random() * 2.4;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 8) {
      const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 3.3 + ph * 2) * amp * .3;
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function marbleTexture() {
  const S = 1024;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#0c0b0f'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 60 + Math.random() * 220;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${30 + Math.random() * 20 | 0},${28 + Math.random() * 16 | 0},${34 + Math.random() * 20 | 0},.5)`);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
  }
  g.shadowColor = 'rgba(255,255,255,.35)';
  for (let v = 0; v < 38; v++) {
    let x = Math.random() * S, y = Math.random() * S, a = Math.random() * Math.PI * 2;
    g.beginPath(); g.moveTo(x, y);
    const steps = 60 + Math.random() * 140;
    for (let s = 0; s < steps; s++) { a += (Math.random() - .5) * .6; x += Math.cos(a) * 6; y += Math.sin(a) * 6; g.lineTo(x, y); }
    g.strokeStyle = `rgba(210,200,190,${.04 + Math.random() * .2})`;
    g.lineWidth = .4 + Math.random() * 1.6; g.shadowBlur = 4 + Math.random() * 6;
    g.stroke();
  }
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(0,0,0,.85)'; g.lineWidth = 3;
  for (let k = 0; k <= S; k += S / 4) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, S); g.moveTo(0, k); g.lineTo(S, k); g.stroke(); }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 5);
  return t;
}

function engrave(g) { g.shadowColor = 'rgba(40,22,4,.85)'; g.shadowBlur = 6; g.shadowOffsetX = 2; g.shadowOffsetY = 4; }

function goldFill(g, x0, y0, x1, y1) {
  const grd = g.createLinearGradient(x0, y0, x1, y1);
  grd.addColorStop(0, '#8a6427'); grd.addColorStop(.35, '#f6dfa0'); grd.addColorStop(.55, '#c89a48'); grd.addColorStop(.8, '#f0d38a'); grd.addColorStop(1, '#9b7431');
  return grd;
}

function smileTexture() {
  const [c, g] = canvas(1024, 256);
  g.fillStyle = goldFill(g, 0, 40, 0, 200);
  g.strokeStyle = goldFill(g, 0, 40, 0, 220);
  g.lineWidth = 7; g.lineCap = 'round';
  engrave(g);
  // cartouche
  g.beginPath();
  g.moveTo(90, 40); g.lineTo(934, 40); g.quadraticCurveTo(990, 40, 990, 110); g.quadraticCurveTo(990, 180, 934, 190);
  g.bezierCurveTo(700, 190, 620, 236, 512, 236); g.bezierCurveTo(404, 236, 324, 190, 90, 190);
  g.quadraticCurveTo(34, 180, 34, 110); g.quadraticCurveTo(34, 40, 90, 40); g.stroke();
  g.font = '600 104px "Cormorant Garamond", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SMILE HERE', 512, 118);
  return tex(c);
}

function sideTexture(top, bottom, bigLetter) {
  const [c, g] = canvas(1024, 1024);
  g.fillStyle = goldFill(g, 0, 150, 0, 880);
  g.textBaseline = 'alphabetic';
  engrave(g);
  if (bigLetter) {
    g.font = 'italic 600 620px "Cormorant Garamond", Georgia, serif';
    g.textAlign = 'left';
    g.fillText(bigLetter, 90, 700);
    g.font = '600 250px "Cormorant Garamond", Georgia, serif';
    g.fillText(top, 400, 470);
    g.fillText(bottom, 360, 760);
  } else {
    g.textAlign = 'center';
    g.font = '700 300px "Cormorant Garamond", Georgia, serif';
    g.fillText(top, 512, 520);
    g.font = 'italic 500 190px "Cormorant Garamond", Georgia, serif';
    g.fillText(bottom, 512, 740);
  }
  return tex(c);
}

function carpetTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#7d0d19'; g.fillRect(0, 0, 256, 256);
  const img = g.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - .5) * 26;
    img.data[i] += n; img.data[i + 1] += n * .3; img.data[i + 2] += n * .3;
  }
  g.putImageData(img, 0, 0);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 8);
  return t;
}

/* ---------------- scene ---------------- */
export async function initBooth(canvasEl, { onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: !isLite, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no webgl');
  const pr = Math.min(window.devicePixelRatio || 1, isLite ? 1.5 : 1.75);
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  onProgress?.(15);
  await Promise.race([
    Promise.all([
      document.fonts.load('600 100px "Cormorant Garamond"'),
      document.fonts.load('italic 600 100px "Cormorant Garamond"'),
      document.fonts.load('700 100px "Cormorant Garamond"'),
    ]),
    sleep(2500),
  ]).catch(() => {});
  onProgress?.(35);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07060a);
  scene.fog = new THREE.Fog(0x07060a, 8, 19);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;

  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 60);

  /* ---- materials ---- */
  const wood = woodTexture();
  const woodMat = new THREE.MeshPhysicalMaterial({ map: wood, roughness: .5, clearcoat: .35, clearcoatRoughness: .35, sheen: .2 });
  const legWood = wood.clone(); legWood.rotation = Math.PI / 2; legWood.center.set(.5, .5); legWood.repeat.set(.25, 1);
  const legMat = new THREE.MeshPhysicalMaterial({ map: legWood, roughness: .45, clearcoat: .4, clearcoatRoughness: .3 });
  const frameMat = new THREE.MeshPhysicalMaterial({ map: wood, color: 0xf0dcc0, roughness: .45, clearcoat: .5 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xd6ab52, metalness: 1, roughness: .16, clearcoat: .6, clearcoatRoughness: .1 });
  const blackMetal = new THREE.MeshStandardMaterial({ color: 0x111114, metalness: .8, roughness: .35 });
  const velvet = new THREE.MeshPhysicalMaterial({ color: 0x6d0a17, roughness: .85, sheen: 1, sheenRoughness: .4, sheenColor: new THREE.Color(0xff4d66) });
  const textMat = (map) => new THREE.MeshStandardMaterial({ map, transparent: true, metalness: .55, roughness: .32, emissive: 0x6a4a12, emissiveMap: map, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

  /* ---- booth ---- */
  const booth = new THREE.Group();
  scene.add(booth);
  const BW = 1.1, BH = .86, BD = .94, BY = 1.52;

  const body = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, BD, 6, .13), woodMat);
  body.position.y = BY; body.castShadow = true; body.receiveShadow = true;
  booth.add(body);

  const front = BD / 2;
  const frame = new THREE.Mesh(new RoundedBoxGeometry(.44, .58, .05, 4, .018), frameMat);
  frame.position.set(0, BY - .075, front + .004); frame.castShadow = true;
  booth.add(frame);

  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(.37, .5), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: .2, metalness: .3 }));
  bezel.position.set(0, BY - .075, front + .03);
  booth.add(bezel);

  // dynamic screen
  const [scrC, scrG] = canvas(360, 500);
  const screenTex = tex(scrC);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.34, .472), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, BY - .075, front + .031);
  booth.add(screen);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(.37, .5), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .05, transmission: 0, transparent: true, opacity: .08, clearcoat: 1 }));
  glass.position.set(0, BY - .075, front + .033);
  booth.add(glass);

  const smile = new THREE.Mesh(new THREE.PlaneGeometry(.66, .165), textMat(smileTexture()));
  smile.position.set(0, BY + .3, front + .0015);
  booth.add(smile);

  const side = new THREE.Mesh(new THREE.PlaneGeometry(.66, .66), textMat(sideTexture('NAP', 'BOX', 'S')));
  side.position.set(BW / 2 + .0015, BY, 0); side.rotation.y = Math.PI / 2;
  booth.add(side);
  const side2 = new THREE.Mesh(new THREE.PlaneGeometry(.66, .66), textMat(sideTexture('AURA', 'event')));
  side2.position.set(-BW / 2 - .0015, BY, 0); side2.rotation.y = -Math.PI / 2;
  booth.add(side2);

  // mount + tripod
  const mountY = BY - BH / 2;
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(.09, .11, .06, 32), blackMetal);
  mount.position.y = mountY - .03; mount.castShadow = true;
  booth.add(mount);
  const hub = new THREE.Vector3(0, mountY - .07, 0);
  const up = new THREE.Vector3(0, 1, 0);
  [Math.PI * .2, Math.PI * .8, Math.PI * 1.5].forEach((a) => {
    const foot = new THREE.Vector3(Math.cos(a) * .66, 0, Math.sin(a) * .66 * -1);
    const dir = new THREE.Vector3().subVectors(hub, foot);
    const len = dir.length();
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.024, .018, len, 14), legMat);
    leg.position.copy(foot).addScaledVector(dir, .5);
    leg.quaternion.setFromUnitVectors(up, dir.normalize());
    leg.castShadow = true;
    booth.add(leg);
  });

  // ring light
  const ring = new THREE.Group();
  const ringY = BY + BH / 2 + .52;
  ring.position.set(0, ringY, .02);
  ring.rotation.x = -.1;
  booth.add(ring);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .2, 12), blackMetal);
  stem.position.set(0, BY + BH / 2 + .1, .02);
  booth.add(stem);
  const R = .33;
  const torus = new THREE.Mesh(new THREE.TorusGeometry(R, .022, 20, 128), blackMetal);
  torus.castShadow = true;
  ring.add(torus);
  const discMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(2.2), toneMapped: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R - .012, 96), discMat);
  disc.position.z = .004;
  ring.add(disc);
  const back = new THREE.Mesh(new THREE.CircleGeometry(R - .005, 64), blackMetal);
  back.rotation.y = Math.PI; back.position.z = -.004;
  ring.add(back);
  const yoke = new THREE.Mesh(new THREE.TorusGeometry(R + .045, .008, 8, 64, Math.PI), blackMetal);
  yoke.rotation.z = Math.PI;
  ring.add(yoke);
  [-1, 1].forEach((s) => {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .03, 16), blackMetal);
    knob.rotation.z = Math.PI / 2; knob.position.x = s * (R + .045);
    ring.add(knob);
  });

  /* ---- stanchions & ropes ---- */
  const posts = [[-1.65, .45], [-1.2, -1.3], [1.2, -1.3], [1.65, .45]];
  const profile = [[0, 0], [.17, 0], [.176, .012], [.165, .03], [.1, .042], [.05, .055], [.03, .075], [.021, .1], [.021, .9], [.03, .915], [.034, .94], [.022, .96], [0, .965]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const postGeo = new THREE.LatheGeometry(profile, 48);
  const ballGeo = new THREE.SphereGeometry(.046, 32, 20);
  posts.forEach(([x, z]) => {
    const p = new THREE.Mesh(postGeo, gold); p.position.set(x, 0, z); p.castShadow = true; scene.add(p);
    const b = new THREE.Mesh(ballGeo, gold); b.position.set(x, 1.005, z); b.castShadow = true; scene.add(b);
  });
  const capGeo = new THREE.CylinderGeometry(.03, .03, .07, 16);
  for (let i = 0; i < posts.length - 1; i++) {
    const a = new THREE.Vector3(posts[i][0], .9, posts[i][1]);
    const b = new THREE.Vector3(posts[i + 1][0], .9, posts[i + 1][1]);
    const dirAB = new THREE.Vector3().subVectors(b, a).setY(0).normalize();
    const a2 = a.clone().addScaledVector(dirAB, .06), b2 = b.clone().addScaledVector(dirAB, -.06);
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      const p = a2.clone().lerp(b2, t);
      p.y -= Math.sin(Math.PI * t) * .32;
      pts.push(p);
    }
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, .032, 14, false), velvet);
    rope.castShadow = true;
    scene.add(rope);
    [a2, b2].forEach((p, j) => {
      const cap = new THREE.Mesh(capGeo, gold);
      cap.position.copy(p).addScaledVector(dirAB, j ? .02 : -.02);
      cap.quaternion.setFromUnitVectors(up, dirAB);
      scene.add(cap);
    });
  }

  /* ---- floor ---- */
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(1.35, .014, 5.6), new THREE.MeshStandardMaterial({ map: carpetTexture(), roughness: .95, color: 0xffffff }));
  carpet.position.set(0, .007, 1.9);
  carpet.receiveShadow = true;
  scene.add(carpet);

  const marbleMat = new THREE.MeshStandardMaterial({ map: marbleTexture(), roughness: .28, metalness: .1, transparent: !isLite, opacity: isLite ? 1 : .86 });
  const marble = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), marbleMat);
  marble.rotation.x = -Math.PI / 2; marble.position.y = .001; marble.receiveShadow = true;
  scene.add(marble);

  if (!isLite) {
    const mirror = new Reflector(new THREE.PlaneGeometry(30, 30), {
      clipBias: .003, color: 0x8a8a8a,
      textureWidth: innerWidth * pr * .5, textureHeight: innerHeight * pr * .5,
    });
    mirror.rotation.x = -Math.PI / 2;
    const orig = mirror.onBeforeRender;
    mirror.onBeforeRender = function (...args) { marble.visible = false; orig.apply(this, args); marble.visible = true; };
    scene.add(mirror);
  }

  /* ---- lights ---- */
  scene.add(new THREE.HemisphereLight(0x40344a, 0x050408, .45));
  const key = new THREE.SpotLight(0xffe4bd, 55, 25, .42, .7, 1.6);
  key.position.set(3.2, 6.5, 4.2); key.target.position.set(0, 1, 0);
  key.castShadow = true; key.shadow.mapSize.set(isLite ? 1024 : 2048, isLite ? 1024 : 2048);
  key.shadow.bias = -.0004; key.shadow.radius = 6;
  scene.add(key, key.target);
  const ringLight = new THREE.SpotLight(0xfff4e8, 2.5, 9, .85, .9, 1.4);
  ringLight.position.set(0, ringY, .3); ringLight.target.position.set(0, .6, 3.5);
  scene.add(ringLight, ringLight.target);
  const rimGold = new THREE.PointLight(0xe0a94a, 14, 12, 1.6); rimGold.position.set(-2.6, 2.8, -2.2); scene.add(rimGold);
  const rimCool = new THREE.PointLight(0x8a9cff, 5, 10, 1.6); rimCool.position.set(2.8, 2.2, -2.5); scene.add(rimCool);
  const carpetGlow = new THREE.PointLight(0xff3350, 2.5, 5, 1.5); carpetGlow.position.set(0, .45, 2.4); scene.add(carpetGlow);

  /* ---- gold dust ---- */
  const N = isLite ? 260 : 620;
  const dustGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3), phase = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 9;
    pos[i * 3 + 1] = Math.random() * 4.5;
    pos[i * 3 + 2] = (Math.random() - .5) * 8 - .5;
    phase[i] = Math.random() * 100;
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: 38 * pr }, uBoost: { value: 0 } },
    vertexShader: `
      attribute float aPhase; uniform float uTime; uniform float uSize; varying float vA;
      void main(){
        vec3 p = position;
        p.y = mod(p.y + uTime * (0.04 + 0.05 * fract(aPhase * 7.13)), 4.5);
        p.x += sin(uTime * 0.25 + aPhase) * 0.18;
        p.z += cos(uTime * 0.2 + aPhase * 1.7) * 0.18;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float tw = 0.55 + 0.45 * sin(uTime * 2.2 + aPhase * 10.0);
        gl_PointSize = uSize * (0.35 + 0.65 * fract(aPhase * 3.7)) * tw / -mv.z;
        vA = tw * smoothstep(0.0, 0.6, p.y) * smoothstep(4.5, 3.4, p.y);
      }`,
    fragmentShader: `
      varying float vA; uniform float uBoost;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d); a *= a;
        gl_FragColor = vec4(vec3(1.0, 0.8, 0.45) * (1.4 + uBoost * 3.0), a * vA);
      }`,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  onProgress?.(70);

  /* ---- post ---- */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pr);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .5, .6, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---- screen content ---- */
  const photo = new Image();
  const photoReady = new Promise((res) => { photo.onload = res; photo.onerror = res; });
  photo.src = 'assets/screen.jpg';
  await photoReady;
  onProgress?.(90);

  const screenState = { video: null, count: 0, flash: 0, dirty: true };
  function drawCover(g, src, w, h, mirror) {
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
    if (!sw || !sh) return false;
    const s = Math.max(w / sw, h / sh), dw = sw * s, dh = sh * s;
    g.save();
    if (mirror) { g.translate(w, 0); g.scale(-1, 1); }
    g.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
    g.restore();
    return true;
  }
  function drawScreen(time) {
    const g = scrG, W = 360, H = 500;
    g.fillStyle = '#0b0a0d'; g.fillRect(0, 0, W, H);
    const v = screenState.video;
    const live = v && v.readyState >= 2;
    if (!drawCover(g, live ? v : photo, W, H, live)) { g.fillStyle = '#222'; g.fillRect(0, 0, W, H); }
    const vg = g.createLinearGradient(0, H * .6, 0, H);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.7)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (screenState.count) {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H);
      g.font = '600 300px "Cormorant Garamond", Georgia, serif';
      g.fillStyle = goldFill(g, 0, 100, 0, 400);
      g.fillText(String(screenState.count), W / 2, H / 2 + 10);
    } else {
      const pulse = .6 + .4 * Math.sin(time * 3);
      g.font = '600 30px "Cormorant Garamond", Georgia, serif';
      g.fillStyle = `rgba(245,226,174,${.7 + .3 * pulse})`;
      g.fillText(live ? '● LIVE' : 'TAP  TO  SNAP', W / 2, H - 42);
      g.strokeStyle = 'rgba(245,226,174,.5)'; g.lineWidth = 2;
      g.strokeRect(16, 16, W - 32, H - 32);
    }
    if (screenState.flash > 0) { g.fillStyle = `rgba(255,255,255,${screenState.flash})`; g.fillRect(0, 0, W, H); }
    screenTex.needsUpdate = true;
  }

  /* ---- camera rig ---- */
  const sections = [...document.querySelectorAll('[data-cam]')].map((el) => ({ el, shot: SHOTS[el.dataset.cam] || SHOTS.hero }));
  let anchors = [];
  function measure() {
    anchors = sections.map(({ el, shot }) => {
      const r = el.getBoundingClientRect();
      return { y: r.top + scrollY + r.height / 2, shot };
    });
  }
  measure();
  addEventListener('load', measure);
  new ResizeObserver(measure).observe(document.body);

  const cur = { ...SHOTS.hero };
  const lite = () => matchMedia('(max-width: 900px)').matches;
  function targetShot() {
    const y = scrollY + innerHeight / 2;
    let i = 0;
    while (i < anchors.length - 1 && anchors[i + 1].y <= y) i++;
    const A = anchors[i], B = anchors[Math.min(i + 1, anchors.length - 1)];
    const t = B === A ? 0 : smooth(clamp01((y - A.y) / (B.y - A.y)));
    const out = {};
    for (const k of ['az', 'el', 'dist', 'h', 'pan']) out[k] = A.shot[k] + (B.shot[k] - A.shot[k]) * t;
    if (lite()) { out.pan = LITE.pan; out.dist *= LITE.distMul; out.h += LITE.hAdd; }
    return out;
  }

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  // drag to spin the booth
  let spin = 0, spinVel = 0, dragging = false, lastX = 0;
  const dragOk = (el) => !el.closest('a, button, input, textarea, select, label, form, .marquee, header, .pkg, .product-frame');
  addEventListener('pointerdown', (e) => {
    if (!dragOk(e.target)) return;
    dragging = true; lastX = e.clientX;
    document.querySelector('.cursor')?.classList.add('drag');
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    spinVel = dx * .006;
    spin += spinVel;
  }, { passive: true });
  const endDrag = () => { dragging = false; document.querySelector('.cursor')?.classList.remove('drag'); };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  const tmpT = new THREE.Vector3(), tmpP = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  let shake = 0;
  function applyCamera(time, dt) {
    const tgt = targetShot();
    const k = 1 - Math.pow(.0025, dt);
    for (const key of Object.keys(tgt)) cur[key] += (tgt[key] - cur[key]) * k;
    pointer.sx += (pointer.x - pointer.sx) * k; pointer.sy += (pointer.y - pointer.sy) * k;
    const idle = reducedMotion ? 0 : Math.sin(time * .18) * .05;
    const az = cur.az + idle - pointer.sx * .08;
    const el = cur.el + pointer.sy * .04;
    tmpT.set(0, cur.h, 0);
    tmpP.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(cur.dist).add(tmpT);
    fwd.subVectors(tmpT, tmpP).normalize();
    right.crossVectors(fwd, up).normalize();
    tmpT.addScaledVector(right, cur.pan); tmpP.addScaledVector(right, cur.pan);
    if (shake > 0) { tmpP.x += (Math.random() - .5) * shake * .05; tmpP.y += (Math.random() - .5) * shake * .05; }
    camera.position.copy(tmpP);
    camera.lookAt(tmpT);
  }

  /* ---- loop ---- */
  const clock = new THREE.Clock();
  let flashAmt = 0;
  function loop() {
    const dt = Math.min(clock.getDelta(), .05);
    const time = clock.elapsedTime;
    if (!dragging) { spinVel *= Math.pow(.02, dt); spin += spinVel; spin *= Math.pow(.35, dt); }
    booth.rotation.y = spin;
    applyCamera(time, dt);
    flashAmt = Math.max(0, flashAmt - dt * 2.2);
    shake = Math.max(0, shake - dt * 3);
    screenState.flash = flashAmt;
    const glow = 1.9 + Math.sin(time * 1.4) * .1 + flashAmt * 5;
    discMat.color.setScalar(glow);
    ringLight.intensity = 2.5 + flashAmt * 40;
    dustMat.uniforms.uTime.value = reducedMotion ? 0 : time;
    dustMat.uniforms.uBoost.value = flashAmt;
    bloom.strength = .5 + flashAmt * 1.2;
    drawScreen(time);
    composer.render();
    requestAnimationFrame(loop);
  }

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
    composer.setSize(innerWidth, innerHeight);
    measure();
  });

  // render one frame synchronously so the loader can reveal a finished scene
  applyCamera(0, 1);
  drawScreen(0);
  composer.render();
  onProgress?.(100);
  requestAnimationFrame(loop);

  return {
    setVideo(v) { screenState.video = v; },
    setCountdown(n) { screenState.count = n; },
    flash() { flashAmt = 1; shake = 1; },
    getScreenPhoto() { return photo; },
  };
}

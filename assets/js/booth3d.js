import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const isLite = matchMedia('(max-width: 900px), (pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);
const rand = (a, b) => a + Math.random() * (b - a);

const BG = 0xefe9df;

// Camera choreography per section: azimuth, elevation, distance, look height, pan (pushes the set to screen-left).
const SHOTS = {
  hero:       { az: 0.40, el: 0.10, dist: 8.7, h: 1.58, pan: 1.75 },
  experience: { az: 1.05, el: 0.08, dist: 7.6, h: 1.55, pan: 1.55 },
  how:        { az: 0.22, el: 0.06, dist: 6.4, h: 1.62, pan: 1.30 },
  try:        { az: 0.04, el: 0.04, dist: 5.0, h: 1.72, pan: 1.00 },
  product:    { az: -0.80, el: 0.22, dist: 9.0, h: 1.40, pan: 0 },
  packages:   { az: -1.50, el: 0.35, dist: 10.0, h: 1.30, pan: 0 },
  contact:    { az: -0.45, el: 0.10, dist: 8.6, h: 1.50, pan: 1.70 },
};
const LITE = { pan: 0, distMul: 1.1, hAdd: -0.35 };

/* ---------------- procedural textures ---------------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function oakTexture() {
  const [c, g] = canvas(1024, 1024);
  const grd = g.createLinearGradient(0, 0, 0, 1024);
  grd.addColorStop(0, '#cdb698'); grd.addColorStop(.5, '#d8c3a5'); grd.addColorStop(1, '#c8b092');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 220; i++) {
    const y0 = Math.random() * 1024, amp = 2 + Math.random() * 10, f = .0015 + Math.random() * .004, ph = Math.random() * 6.3;
    g.strokeStyle = `rgba(${125 + Math.random() * 40 | 0},${88 + Math.random() * 25 | 0},${52 + Math.random() * 18 | 0},${.03 + Math.random() * .09})`;
    g.lineWidth = .5 + Math.random() * 1.8;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 8) {
      const y = y0 + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 + ph * 2) * amp * .35;
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  // oak ray flecks
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(245,228,198,${Math.random() * .12})`;
    g.fillRect(Math.random() * 1024, Math.random() * 1024, 6 + Math.random() * 18, 1.2);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function travertineTexture() {
  const S = 1024;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#e9e2d6'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 120 + Math.random() * 260;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    const warm = Math.random() > .5;
    rg.addColorStop(0, warm ? 'rgba(214,198,172,.12)' : 'rgba(246,241,233,.18)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
  }
  // horizontal strata
  for (let i = 0; i < 60; i++) {
    const y0 = Math.random() * S, a = rand(.015, .05);
    g.strokeStyle = `rgba(170,148,116,${a})`; g.lineWidth = rand(.6, 3);
    g.beginPath();
    for (let x = 0; x <= S; x += 16) { const y = y0 + Math.sin(x * .004 + i) * 6; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  // pores
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(150,130,104,${rand(.05, .16)})`;
    g.beginPath(); g.ellipse(Math.random() * S, Math.random() * S, rand(.8, 4), rand(.4, 1.3), 0, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(170,152,126,.22)'; g.lineWidth = 1.5;
  for (let k = 0; k <= S; k += S / 2) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, S); g.moveTo(0, k); g.lineTo(S, k); g.stroke(); }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(22, 22);
  return t;
}

function juteTexture() {
  const S = 1024, C = S / 2;
  const [c, g] = canvas(S, S);
  g.clearRect(0, 0, S, S);
  for (let r = C - 4; r > 0; r -= 7) {
    const base = 196 + Math.sin(r * .21) * 10;
    g.strokeStyle = `rgb(${base + 14 | 0},${base + 4 | 0},${base - 18 | 0})`;
    g.lineWidth = 6;
    g.beginPath(); g.arc(C, C, r, 0, Math.PI * 2); g.stroke();
    // braid ticks
    g.strokeStyle = 'rgba(110,86,52,.28)'; g.lineWidth = 1.2;
    const n = Math.max(8, r * .9 | 0);
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2;
      g.beginPath();
      g.moveTo(C + Math.cos(a) * (r - 3), C + Math.sin(a) * (r - 3));
      g.lineTo(C + Math.cos(a + .02) * (r + 3), C + Math.sin(a + .02) * (r + 3));
      g.stroke();
    }
  }
  return tex(c);
}

function blobTexture(alpha = .4) {
  const [c, g] = canvas(256, 256);
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, `rgba(70,52,34,${alpha})`); rg.addColorStop(.5, `rgba(70,52,34,${alpha * .45})`); rg.addColorStop(1, 'rgba(70,52,34,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
  return tex(c);
}

function plumeTexture() {
  const [c, g] = canvas(128, 512);
  g.clearRect(0, 0, 128, 512);
  for (let i = 0; i < 1400; i++) {
    const y = 40 + Math.random() * 460;
    const t = (y - 40) / 460;
    const spread = Math.sin(Math.PI * Math.pow(1 - t, .8)) * 58 + 4;
    const dir = Math.random() > .5 ? 1 : -1;
    const len = rand(.3, 1) * spread;
    g.strokeStyle = `rgba(${240 + Math.random() * 15 | 0},${226 + Math.random() * 20 | 0},${196 + Math.random() * 25 | 0},${rand(.25, .7)})`;
    g.lineWidth = rand(.5, 1.4);
    g.beginPath(); g.moveTo(64, y);
    g.quadraticCurveTo(64 + dir * len * .5, y - len * .25, 64 + dir * len, y - len * .7);
    g.stroke();
  }
  return tex(c);
}

function brassFill(g, y0, y1) {
  const grd = g.createLinearGradient(0, y0, 0, y1);
  grd.addColorStop(0, '#6f5127'); grd.addColorStop(.4, '#c9a266'); grd.addColorStop(.6, '#9c7a42'); grd.addColorStop(1, '#5f4520');
  return grd;
}
function engrave(g) { g.shadowColor = 'rgba(255,240,215,.55)'; g.shadowBlur = 0; g.shadowOffsetX = 0; g.shadowOffsetY = 3; }

function smileTexture() {
  const [c, g] = canvas(1024, 256);
  engrave(g);
  g.strokeStyle = brassFill(g, 40, 230); g.lineWidth = 5;
  g.beginPath();
  g.moveTo(90, 40); g.lineTo(934, 40); g.quadraticCurveTo(990, 40, 990, 110); g.quadraticCurveTo(990, 180, 934, 190);
  g.bezierCurveTo(700, 190, 620, 232, 512, 232); g.bezierCurveTo(404, 232, 324, 190, 90, 190);
  g.quadraticCurveTo(34, 180, 34, 110); g.quadraticCurveTo(34, 40, 90, 40); g.stroke();
  g.fillStyle = brassFill(g, 60, 180);
  g.font = '500 100px "Cormorant Garamond", Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('SMILE  HERE', 512, 118);
  return tex(c);
}

function sideTexture(top, bottom, bigLetter) {
  const [c, g] = canvas(1024, 1024);
  engrave(g);
  g.fillStyle = brassFill(g, 150, 880);
  g.textBaseline = 'alphabetic';
  if (bigLetter) {
    g.font = 'italic 500 600px "Cormorant Garamond", Georgia, serif';
    g.textAlign = 'left';
    g.fillText(bigLetter, 110, 690);
    g.font = '500 240px "Cormorant Garamond", Georgia, serif';
    g.fillText(top, 400, 470);
    g.fillText(bottom, 370, 750);
  } else {
    g.textAlign = 'center';
    g.font = '500 280px "Cormorant Garamond", Georgia, serif';
    g.fillText(top, 512, 520);
    g.font = 'italic 400 180px "Cormorant Garamond", Georgia, serif';
    g.fillText(bottom, 512, 730);
  }
  return tex(c);
}

/* ---------------- botanical geometry ---------------- */
function leafGeometry(width, length) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width, length * .25, width * .8, length * .8, 0, length);
  s.bezierCurveTo(-width * .8, length * .8, -width, length * .25, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, -x * x * 1.4 + Math.sin(y / length * Math.PI) * .08 * length);
  }
  geo.computeVertexNormals();
  return geo;
}

function roseGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    const swirl = Math.sin(a * 5 + v.y * 9) * .07 + Math.sin(a * 3 - v.y * 5) * .05;
    v.multiplyScalar(1 + swirl);
    v.y *= v.y > 0 ? .72 : .9;
    if (v.y > .45) v.y = .45 + (v.y - .45) * .3;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ---------------- scene ---------------- */
export async function initBooth(canvasEl, { onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no webgl');
  const pr = Math.min(window.devicePixelRatio || 1, isLite ? 1.5 : 1.75);
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  onProgress?.(15);
  await Promise.race([
    Promise.all([
      document.fonts.load('500 100px "Cormorant Garamond"'),
      document.fonts.load('italic 500 100px "Cormorant Garamond"'),
    ]),
    sleep(2500),
  ]).catch(() => {});
  onProgress?.(35);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 13, 32);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 80);
  const up = new THREE.Vector3(0, 1, 0);

  /* ---- materials ---- */
  const oak = oakTexture();
  const oakMat = new THREE.MeshPhysicalMaterial({ map: oak, roughness: .55, clearcoat: .18, clearcoatRoughness: .5, sheen: .25, sheenColor: new THREE.Color(0xfff0d8) });
  const legOak = oak.clone(); legOak.rotation = Math.PI / 2; legOak.center.set(.5, .5); legOak.repeat.set(.3, 1);
  const legMat = new THREE.MeshPhysicalMaterial({ map: legOak, roughness: .5, clearcoat: .2 });
  const frameMat = new THREE.MeshPhysicalMaterial({ map: oak, color: 0xe9d8bd, roughness: .5, clearcoat: .25 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x2b2926, metalness: .55, roughness: .45 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb8955a, metalness: 1, roughness: .32 });
  const engraved = (map) => new THREE.MeshStandardMaterial({ map, transparent: true, metalness: .6, roughness: .4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

  /* ---- booth ---- */
  const booth = new THREE.Group();
  scene.add(booth);
  const BW = .92, BH = 1.0, BD = .84, BY = 1.52;
  const front = BD / 2;

  const body = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, BD, 8, .085), oakMat);
  body.position.y = BY; body.castShadow = true; body.receiveShadow = true;
  booth.add(body);

  const frame = new THREE.Mesh(new RoundedBoxGeometry(.44, .6, .045, 4, .016), frameMat);
  frame.position.set(0, BY - .08, front + .004); frame.castShadow = true;
  booth.add(frame);
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(.37, .51), new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: .25, metalness: .2 }));
  bezel.position.set(0, BY - .08, front + .0275);
  booth.add(bezel);

  const [scrC, scrG] = canvas(360, 500);
  const screenTex = tex(scrC);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(.34, .472), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, BY - .08, front + .0285);
  booth.add(screen);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(.37, .51), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .04, transparent: true, opacity: .07, clearcoat: 1 }));
  glass.position.set(0, BY - .08, front + .03);
  booth.add(glass);

  // lens above the screen
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(.028, .032, .02, 32), graphite);
  lens.rotation.x = Math.PI / 2; lens.position.set(0, BY + .255, front + .006);
  booth.add(lens);
  const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(.019, 32), new THREE.MeshPhysicalMaterial({ color: 0x0a1020, roughness: .02, metalness: .2, clearcoat: 1 }));
  lensGlass.position.set(0, BY + .255, front + .0165);
  booth.add(lensGlass);

  const smile = new THREE.Mesh(new THREE.PlaneGeometry(.5, .125), engraved(smileTexture()));
  smile.position.set(0, BY + .36, front + .0015);
  booth.add(smile);

  const side = new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), engraved(sideTexture('NAP', 'BOX', 'S')));
  side.position.set(BW / 2 + .0015, BY, 0); side.rotation.y = Math.PI / 2;
  booth.add(side);
  const side2 = new THREE.Mesh(new THREE.PlaneGeometry(.6, .6), engraved(sideTexture('AURA', 'event')));
  side2.position.set(-BW / 2 - .0015, BY, 0); side2.rotation.y = -Math.PI / 2;
  booth.add(side2);

  // mount + tripod
  const mountY = BY - BH / 2;
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(.075, .095, .07, 32), graphite);
  mount.position.y = mountY - .035; mount.castShadow = true;
  booth.add(mount);
  const hub = new THREE.Vector3(0, mountY - .06, 0);
  [Math.PI * .22, Math.PI * .78, Math.PI * 1.5].forEach((a) => {
    const foot = new THREE.Vector3(Math.cos(a) * .6, 0, -Math.sin(a) * .6);
    const dir = new THREE.Vector3().subVectors(hub, foot);
    const len = dir.length();
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.026, .02, len, 16), legMat);
    leg.position.copy(foot).addScaledVector(dir, .5);
    leg.quaternion.setFromUnitVectors(up, dir.normalize());
    leg.castShadow = true;
    booth.add(leg);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.022, .024, .02, 16), brass);
    cap.position.copy(foot).setY(.01);
    booth.add(cap);
  });

  // ring light
  const ring = new THREE.Group();
  const R = .3;
  const ringY = BY + BH / 2 + .16 + R;
  ring.position.set(0, ringY, .02);
  ring.rotation.x = -.08;
  booth.add(ring);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .18, 12), graphite);
  stem.position.set(0, BY + BH / 2 + .08, .02);
  booth.add(stem);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(R, .02, 20, 128), graphite);
  torus.castShadow = true;
  ring.add(torus);
  const discMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 1.2, 1.1), toneMapped: false });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R - .01, 96), discMat);
  disc.position.z = .004;
  ring.add(disc);
  const back = new THREE.Mesh(new THREE.CircleGeometry(R - .004, 64), graphite);
  back.rotation.y = Math.PI; back.position.z = -.004;
  ring.add(back);
  const yoke = new THREE.Mesh(new THREE.TorusGeometry(R + .04, .007, 8, 64, Math.PI), graphite);
  yoke.rotation.z = Math.PI;
  ring.add(yoke);
  [-1, 1].forEach((s) => {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .028, 16), brass);
    knob.rotation.z = Math.PI / 2; knob.position.x = s * (R + .04);
    ring.add(knob);
  });

  /* ---- floor, rug, shadows ---- */
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: travertineTexture(), roughness: .62, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  scene.add(floor);

  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.2, 96), new THREE.MeshStandardMaterial({ map: juteTexture(), roughness: 1, transparent: true }));
  rug.rotation.x = -Math.PI / 2; rug.position.y = .004; rug.receiveShadow = true;
  scene.add(rug);

  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ map: blobTexture(.32), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = .007;
  scene.add(blob);

  /* ---- moon arch with greenery ---- */
  const arch = new THREE.Group();
  const AR = 1.42, AC = new THREE.Vector3(0, AR + .06, -1.05);
  arch.position.copy(AC);
  scene.add(arch);
  const archRing = new THREE.Mesh(new THREE.TorusGeometry(AR, .018, 16, 220), brass);
  archRing.castShadow = true;
  arch.add(archRing);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.28, .3, .03, 48), brass);
  base.position.set(0, -AR - .045, 0);
  arch.add(base);
  const archBlob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .8), new THREE.MeshBasicMaterial({ map: blobTexture(.22), transparent: true, depthWrite: false }));
  archBlob.rotation.x = -Math.PI / 2; archBlob.position.set(0, .006, AC.z);
  scene.add(archBlob);

  const leafA = leafGeometry(.32, 1), leafB = leafGeometry(.55, 1);
  const leafMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .75, metalness: 0 });
  const greens = [0x7f8f6f, 0x93a283, 0x6a7b5c, 0xa7b499, 0x5b6a4f, 0x8a9a86].map((c) => new THREE.Color(c));
  const clusters = [
    { from: 188, to: 300, leaves: isLite ? 260 : 520, roses: 11, center: 238 },
    { from: 20, to: 78, leaves: isLite ? 110 : 220, roses: 5, center: 48 },
  ];
  const total = clusters.reduce((n, c) => n + c.leaves, 0);
  const leavesA = new THREE.InstancedMesh(leafA, leafMat, Math.ceil(total / 2));
  const leavesB = new THREE.InstancedMesh(leafB, leafMat, Math.ceil(total / 2));
  leavesA.castShadow = leavesB.castShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  const arcPt = (deg, radial = 0, z = 0) => {
    const a = THREE.MathUtils.degToRad(deg);
    return new THREE.Vector3(Math.cos(a) * (AR + radial), Math.sin(a) * (AR + radial), z);
  };
  let ia = 0, ib = 0;
  const roseSpots = [];
  clusters.forEach((cl) => {
    for (let i = 0; i < cl.leaves; i++) {
      const t = Math.random();
      const deg = cl.from + (cl.to - cl.from) * t;
      const thick = Math.pow(Math.sin(Math.PI * t), .8);
      p3.copy(arcPt(deg, rand(-.16, .2) * thick, rand(-.14, .16) * thick));
      const a = THREE.MathUtils.degToRad(deg);
      e.set(rand(-1.2, 1.2), rand(-1.2, 1.2), a + (Math.random() > .5 ? 1 : -1) * rand(.4, 1.6));
      q.setFromEuler(e);
      const sc = rand(.06, .12) * (.55 + .45 * thick);
      s3.set(sc, sc, sc);
      m4.compose(p3, q, s3);
      const tgt = i % 2 ? leavesB : leavesA;
      const idx = i % 2 ? ib++ : ia++;
      tgt.setMatrixAt(idx, m4);
      tgt.setColorAt(idx, greens[Math.random() * greens.length | 0]);
    }
    for (let r = 0; r < cl.roses; r++) {
      const spread = (cl.to - cl.from) * .32;
      roseSpots.push(arcPt(cl.center + rand(-spread, spread), rand(-.1, .12), rand(.04, .16)));
    }
  });
  leavesA.count = ia; leavesB.count = ib;
  arch.add(leavesA, leavesB);

  const roseMat = new THREE.MeshStandardMaterial({ roughness: .8, metalness: 0 });
  const roses = new THREE.InstancedMesh(roseGeometry(), roseMat, roseSpots.length);
  const bloomColors = [0xf6efe4, 0xf1e4d6, 0xe9cfc2, 0xdcb4a4, 0xf8f3ec].map((c) => new THREE.Color(c));
  roseSpots.forEach((pt, i) => {
    e.set(rand(.6, 1.3), rand(0, 6.28), rand(-.4, .4)); q.setFromEuler(e);
    const sc = rand(.055, .09); s3.set(sc, sc, sc);
    m4.compose(pt, q, s3);
    roses.setMatrixAt(i, m4);
    roses.setColorAt(i, bloomColors[i % bloomColors.length]);
  });
  roses.castShadow = true;
  arch.add(roses);

  // baby's breath
  const dotsN = isLite ? 90 : 200;
  const dots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xfbf8f2, roughness: .9 }), dotsN);
  for (let i = 0; i < dotsN; i++) {
    const cl = clusters[i % 3 === 0 ? 1 : 0];
    const deg = cl.from + (cl.to - cl.from) * rand(.1, .9);
    m4.compose(arcPt(deg, rand(-.2, .24), rand(-.05, .2)), q.identity(), s3.setScalar(rand(.008, .014)));
    dots.setMatrixAt(i, m4);
  }
  arch.add(dots);

  /* ---- vases with pampas ---- */
  const plumeTex = plumeTexture();
  const plumeMat = new THREE.MeshStandardMaterial({ map: plumeTex, alphaTest: .18, side: THREE.DoubleSide, roughness: 1, color: 0xfff6e6 });
  const plumeGeo = new THREE.PlaneGeometry(.24, .58); plumeGeo.translate(0, .29, 0);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0xc9b58f, roughness: .9 });
  const vaseProfile = [[0, 0], [.1, 0], [.15, .06], [.19, .22], [.2, .38], [.16, .56], [.09, .7], [.075, .78], [.09, .8]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const vaseGeo = new THREE.LatheGeometry(vaseProfile, 64);
  function vase(x, z, scale, color, stems) {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.scale.setScalar(scale);
    const v = new THREE.Mesh(vaseGeo, new THREE.MeshStandardMaterial({ color, roughness: .85 }));
    v.castShadow = true; v.receiveShadow = true;
    g.add(v);
    const vb = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), new THREE.MeshBasicMaterial({ map: blobTexture(.3), transparent: true, depthWrite: false }));
    vb.rotation.x = -Math.PI / 2; vb.position.y = .006;
    g.add(vb);
    for (let i = 0; i < stems; i++) {
      const ang = rand(0, Math.PI * 2), lean = rand(.12, .55), h = rand(1.0, 1.55);
      const top = new THREE.Vector3(Math.cos(ang) * lean, .78 + h, Math.sin(ang) * lean * .6);
      const mid = new THREE.Vector3(top.x * .35, .78 + h * .55, top.z * .35);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, .7, 0), mid, top);
      const st = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, .0045, 5, false), stemMat);
      g.add(st);
      const tan = curve.getTangent(1);
      const plume = new THREE.Group();
      plume.position.copy(top);
      plume.quaternion.setFromUnitVectors(up, tan);
      for (let k = 0; k < 5; k++) {
        const pm = new THREE.Mesh(plumeGeo, plumeMat);
        pm.rotation.y = k * Math.PI / 5 + rand(-.2, .2);
        pm.rotation.x = rand(-.12, .12);
        pm.scale.setScalar(rand(.85, 1.2));
        plume.add(pm);
      }
      g.add(plume);
    }
    scene.add(g);
    return g;
  }
  vase(-1.95, -.45, 1.0, 0xe4dacb, 8);
  vase(-1.35, -1.75, .78, 0xc8a88e, 5);

  /* ---- lights ---- */
  scene.add(new THREE.HemisphereLight(0xfbf6ee, 0xcfc1a8, .8));
  const sun = new THREE.DirectionalLight(0xfff3e4, 3.2);
  sun.position.set(-3.8, 7.5, 4.8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(isLite ? 1024 : 2048, isLite ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 22 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
  scene.add(sun);
  const ringLight = new THREE.SpotLight(0xfff6ea, 1.2, 8, .9, .9, 1.5);
  ringLight.position.set(0, ringY, .3); ringLight.target.position.set(0, .8, 3.5);
  scene.add(ringLight, ringLight.target);

  /* ---- drifting petals ---- */
  const PN = isLite ? 26 : 48;
  const petalGeo = leafGeometry(.7, 1);
  const petals = new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .7 }), PN);
  const petalState = [];
  for (let i = 0; i < PN; i++) {
    petalState.push({ x: rand(-3.5, 3.5), y: rand(0, 4.2), z: rand(-2.5, 3), sp: rand(.12, .28), ph: rand(0, 6.28), rx: rand(0, 6.28), ry: rand(0, 6.28), s: rand(.022, .036) });
    petals.setColorAt(i, bloomColors[i % bloomColors.length]);
  }
  scene.add(petals);
  function updatePetals(time, dt) {
    petalState.forEach((p, i) => {
      if (!reducedMotion) {
        p.y -= p.sp * dt;
        if (p.y < .02) { p.y = 4.2; p.x = rand(-3.5, 3.5); p.z = rand(-2.5, 3); }
        p.rx += dt * .9; p.ry += dt * .6;
      }
      p3.set(p.x + Math.sin(time * .5 + p.ph) * .35, p.y, p.z + Math.cos(time * .4 + p.ph) * .2);
      e.set(p.rx, p.ry, Math.sin(time + p.ph)); q.setFromEuler(e);
      m4.compose(p3, q, s3.setScalar(p.s));
      petals.setMatrixAt(i, m4);
    });
    petals.instanceMatrix.needsUpdate = true;
  }
  updatePetals(0, 0);

  onProgress?.(70);

  /* ---- post ---- */
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pr);
  composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .28, .5, 1.02);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---- screen content ---- */
  const photo = new Image();
  const photoReady = new Promise((res) => { photo.onload = res; photo.onerror = res; });
  photo.src = 'assets/screen.jpg';
  await photoReady;
  onProgress?.(90);

  const screenState = { video: null, count: 0, flash: 0 };
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
    g.fillStyle = '#1a1917'; g.fillRect(0, 0, W, H);
    const v = screenState.video;
    const live = v && v.readyState >= 2;
    drawCover(g, live ? v : photo, W, H, live);
    const vg = g.createLinearGradient(0, H * .62, 0, H);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(20,16,12,.6)');
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (screenState.count) {
      g.fillStyle = 'rgba(30,26,20,.35)'; g.fillRect(0, 0, W, H);
      g.font = 'italic 500 280px "Cormorant Garamond", Georgia, serif';
      g.fillStyle = '#fbf6ec';
      g.fillText(String(screenState.count), W / 2, H / 2 + 6);
    } else {
      const pulse = .75 + .25 * Math.sin(time * 2.4);
      g.font = 'italic 500 30px "Cormorant Garamond", Georgia, serif';
      g.fillStyle = `rgba(251,246,236,${pulse})`;
      g.fillText(live ? '● live' : 'tap to snap', W / 2, H - 40);
      g.strokeStyle = 'rgba(251,246,236,.45)'; g.lineWidth = 1.5;
      g.strokeRect(16, 16, W - 32, H - 32);
    }
    if (screenState.flash > 0) { g.fillStyle = `rgba(255,253,248,${screenState.flash})`; g.fillRect(0, 0, W, H); }
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
  const liteLayout = () => matchMedia('(max-width: 900px)').matches;
  function targetShot() {
    const y = scrollY + innerHeight / 2;
    let i = 0;
    while (i < anchors.length - 1 && anchors[i + 1].y <= y) i++;
    const A = anchors[i], B = anchors[Math.min(i + 1, anchors.length - 1)];
    const t = B === A ? 0 : smooth(clamp01((y - A.y) / (B.y - A.y)));
    const out = {};
    for (const k of ['az', 'el', 'dist', 'h', 'pan']) out[k] = A.shot[k] + (B.shot[k] - A.shot[k]) * t;
    if (liteLayout()) { out.pan = LITE.pan; out.dist *= LITE.distMul * Math.max(1, .62 / (innerWidth / innerHeight)); out.h += LITE.hAdd; }
    return out;
  }

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  // drag to turn the booth
  let spin = 0, spinVel = 0, dragging = false, lastX = 0;
  const dragOk = (el) => !el.closest('a, button, input, textarea, select, label, form, .marquee, header, .pkg, .product-frame, .features');
  addEventListener('pointerdown', (e) => { if (!dragOk(e.target)) return; dragging = true; lastX = e.clientX; });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    spinVel = dx * .006; spin += spinVel;
  }, { passive: true });
  const endDrag = () => { dragging = false; };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  const tmpT = new THREE.Vector3(), tmpP = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3();
  function applyCamera(time, dt) {
    const tgt = targetShot();
    const k = 1 - Math.pow(.003, dt);
    for (const key of Object.keys(tgt)) cur[key] += (tgt[key] - cur[key]) * k;
    pointer.sx += (pointer.x - pointer.sx) * k; pointer.sy += (pointer.y - pointer.sy) * k;
    const idle = reducedMotion ? 0 : Math.sin(time * .15) * .035;
    const az = cur.az + idle - pointer.sx * .05;
    const el = cur.el + pointer.sy * .025;
    tmpT.set(0, cur.h, 0);
    tmpP.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(cur.dist).add(tmpT);
    fwd.subVectors(tmpT, tmpP).normalize();
    right.crossVectors(fwd, up).normalize();
    tmpT.addScaledVector(right, cur.pan); tmpP.addScaledVector(right, cur.pan);
    camera.position.copy(tmpP);
    camera.lookAt(tmpT);
  }

  /* ---- loop ---- */
  const clock = new THREE.Clock();
  let flashAmt = 0;
  function loop() {
    const dt = Math.min(clock.getDelta(), .05);
    const time = clock.elapsedTime;
    if (!dragging) { spinVel *= Math.pow(.02, dt); spin += spinVel; spin *= Math.pow(.4, dt); }
    booth.rotation.y = spin;
    applyCamera(time, dt);
    flashAmt = Math.max(0, flashAmt - dt * 2);
    screenState.flash = flashAmt;
    discMat.color.setRGB(1.25, 1.2, 1.1).multiplyScalar(1 + flashAmt * 3);
    ringLight.intensity = 1.2 + flashAmt * 30;
    bloom.strength = .28 + flashAmt * .9;
    updatePetals(time, dt);
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

  applyCamera(0, 1);
  drawScreen(0);
  composer.render();
  onProgress?.(100);
  requestAnimationFrame(loop);

  return {
    setVideo(v) { screenState.video = v; },
    setCountdown(n) { screenState.count = n; },
    flash() { flashAmt = 1; },
  };
}

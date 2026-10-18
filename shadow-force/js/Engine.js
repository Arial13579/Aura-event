'use strict';
/* =====================================================================
   Engine.js — core utilities, renderer, HDR post-processing (bloom,
   ADS depth-of-field, scope reticle, grading), collision queries,
   GPU particle systems and visual effects. Loaded first; all globals.
   ===================================================================== */

/* ---------- utilities ---------- */
const $ = id => document.getElementById(id);
let R = Math.random;
const rand = (a, b) => a + R() * (b - a);
const ri = (a, b) => Math.floor(a + R() * (b - a + 1));
const pick = a => a[Math.floor(R() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const PI = Math.PI, TAU = PI * 2;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };
const V3 = THREE.Vector3;
const col = h => new THREE.Color(h).convertSRGBToLinear();
const hcol = (h, k) => col(h).multiplyScalar(k);
const dxz = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function store(k, v) {
  try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ }
  return null;
}

/* ---------- global state & settings ---------- */
const G = { state: 'loading', time: 0, dt: 0, shake: 0, flash: 0, dmgPulse: 0, frame: 0, delayed: [], uavT: 0 };
const settings = Object.assign({ sens: 1, vol: .8, quality: 'high', diff: 'normal', voice: true, primary: 'm4', launcher: 'rpg7' }, store('sf.settings') || {});
function saveSettings() { store('sf.settings', settings); }
const DIFF = { easy: { acc: .6, dmg: .55, tank: 1.7 }, normal: { acc: 1, dmg: 1, tank: 1 }, veteran: { acc: 1.3, dmg: 1.55, tank: .65 } };
const D = () => DIFF[settings.diff] || DIFF.normal;
function later(t, fn) { G.delayed.push({ t, fn }); }
function processDelayed(dt) {
  for (let i = G.delayed.length - 1; i >= 0; i--) { const d = G.delayed[i]; d.t -= dt; if (d.t <= 0) { G.delayed.splice(i, 1); d.fn(); } }
}

/* ---------- renderer, scenes & cameras ---------- */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.autoClear = false;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const isGL2 = renderer.capabilities.isWebGL2;
const maxAniso = renderer.capabilities.getMaxAnisotropy();

const scene = new THREE.Scene();
const FOG_COLOR = hcol(0xdcc8a2, 1.0);
scene.fog = new THREE.FogExp2(FOG_COLOR.clone(), .0027);
const camera = new THREE.PerspectiveCamera(78, 1, .08, 1700);
camera.rotation.order = 'YXZ';
const wScene = new THREE.Scene();               // first-person weapon (rendered over the world)
const wCam = new THREE.PerspectiveCamera(66, 1, .01, 20);

/* ---------- lighting ---------- */
const hemi = new THREE.HemisphereLight(col(0xcfe0f5), col(0xa08a64), .78);
scene.add(hemi);
const sun = new THREE.DirectionalLight(col(0xfff0d4), 2.05);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 5, far: 450 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -.0004;
sun.shadow.normalBias = .04;
scene.add(sun, sun.target);
const SUN_DIR = new V3(.45, .78, .42).normalize();
function sunFollow(p) {
  const x = Math.round(p.x / 2) * 2, z = Math.round(p.z / 2) * 2;
  sun.position.set(x + SUN_DIR.x * 220, SUN_DIR.y * 220, z + SUN_DIR.z * 220);
  sun.target.position.set(x, 0, z); sun.target.updateMatrixWorld();
}
wScene.add(new THREE.HemisphereLight(col(0xe6eeff), col(0x8a7350), 1.15));
const wSun = new THREE.DirectionalLight(col(0xfff0d8), 2.3); wSun.position.set(-.4, 1, .5); wScene.add(wSun);
const muzzleLight = new THREE.PointLight(col(0xffc477), 0, 16, 2); scene.add(muzzleLight);
const xLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(col(0xff9a4a), 0, 60, 2); scene.add(l); return { l, t: 0, max: 1, i0: 0 }; });
function flashLight(p, intensity, dur, dist) {
  let best = xLights[0]; for (const x of xLights) if (x.t < best.t) best = x;
  best.l.position.copy(p); best.l.position.y += 1.5; best.l.distance = dist; best.i0 = intensity; best.t = best.max = dur;
}
function updateLights(dt) {
  for (const x of xLights) { if (x.t > 0) { x.t -= dt; x.l.intensity = Math.max(0, x.t / x.max) * x.i0; } else x.l.intensity = 0; }
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 90);
}

/* ---------- HDR post-processing ---------- */
const FSV = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; postScene.add(quad);
const brightMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: null }, thr: { value: 1.7 } }, vertexShader: FSV, depthTest: false, depthWrite: false,
  fragmentShader: 'uniform sampler2D t;uniform float thr;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb;float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c*smoothstep(thr,thr*2.4,l),1.);}'
});
const blurMat = new THREE.ShaderMaterial({
  uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: FSV, depthTest: false, depthWrite: false,
  fragmentShader: 'uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(t,vUv).rgb*.227;c+=texture2D(t,vUv+dir*1.385).rgb*.316;c+=texture2D(t,vUv-dir*1.385).rgb*.316;c+=texture2D(t,vUv+dir*3.231).rgb*.07;c+=texture2D(t,vUv-dir*3.231).rgb*.07;gl_FragColor=vec4(c,1.);}'
});
const postMat = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: null }, tBloom: { value: null }, res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 },
    ads: { value: 0 }, scope: { value: 0 }, dmg: { value: 0 }, flash: { value: 0 }, exposure: { value: .95 }, bloomOn: { value: 1 }, down: { value: 0 }
  },
  vertexShader: FSV, depthTest: false, depthWrite: false,
  fragmentShader: `
uniform sampler2D tDiffuse,tBloom;uniform vec2 res;uniform float time,ads,scope,dmg,flash,exposure,bloomOn,down;
varying vec2 vUv;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=vUv; vec2 c=uv-.5; c.x*=res.x/res.y; float r=length(c);
  float sr=.45;
  if(scope>.5){ if(r>sr){gl_FragColor=vec4(0.,0.,0.,1.);return;} uv=.5+(uv-.5)*(1.-.09*pow(r/sr,2.)); }
  vec3 col=texture2D(tDiffuse,uv).rgb;
  float b=ads*(1.-scope)*smoothstep(.14,.62,r);
  if(b>.01){
    vec3 acc=col; float tw=1.;
    for(int i=0;i<12;i++){ float a=float(i)*.5236; vec2 o=vec2(cos(a)*res.y/res.x,sin(a))*b*.0065*(1.+mod(float(i),2.)); acc+=texture2D(tDiffuse,uv+o).rgb; tw+=1.; }
    col=acc/tw;
  }
  vec2 cd=(uv-.5)*(.0012+dmg*.01)*r;
  col.r=mix(col.r,texture2D(tDiffuse,uv+cd).r,.7); col.b=mix(col.b,texture2D(tDiffuse,uv-cd).b,.7);
  if(bloomOn>.5) col+=texture2D(tBloom,uv).rgb*.6;
  col*=exposure;
  col=aces(col);
  col=pow(col,vec3(1./2.2));
  float l=dot(col,vec3(.299,.587,.114));
  col=mix(vec3(l),col,clamp(1.1-dmg*.75-down*.95,0.,2.));
  col=(col-.5)*1.06+.5;
  col*=vec3(1.025,1.,.955);
  col*=1.-.4*smoothstep(.42,1.05,r);
  col=mix(col,vec3(.5,.02,.02),clamp(dmg*.6+down*.35,0.,1.)*smoothstep(.28,.95,r));
  col+=flash;
  col+=(hash(uv*res+fract(time)*91.7)-.5)*.032;
  if(scope>.5){
    vec2 p=c/sr; float ln=0.; float w=.0042;
    if(abs(p.y)<w||abs(p.x)<w) ln=1.;
    if((abs(p.y)<.017&&abs(p.x)>.52)||(abs(p.x)<.017&&p.y<-.52)) ln=1.;
    for(int k=1;k<5;k++){ float fk=float(k)*.1;
      if(length(p-vec2(fk,0.))<.011||length(p+vec2(fk,0.))<.011||length(p-vec2(0.,-fk))<.011||length(p-vec2(0.,fk))<.011) ln=1.; }
    col=mix(col,vec3(0.),ln*.93);
    if(length(p)<.009) col=vec3(1.,.18,.1);
    col*=smoothstep(1.,.8,length(p));
  }
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`
});
let rtMain = null, rtA = null, rtB = null;
function makeRT(w, h, ms, depth = true) {
  const o = { type: isGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType, format: THREE.RGBAFormat, depthBuffer: depth, stencilBuffer: false };
  if (ms && isGL2 && THREE.WebGLMultisampleRenderTarget) { const rt = new THREE.WebGLMultisampleRenderTarget(w, h, o); rt.samples = 4; return rt; }
  return new THREE.WebGLRenderTarget(w, h, o);
}
let particleScale = 500;
function resize() {
  const q = settings.quality;
  const pr = Math.min(window.devicePixelRatio || 1, q === 'high' ? 1.5 : q === 'medium' ? 1 : .8);
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  const W = Math.max(2, Math.floor(w * pr)), H = Math.max(2, Math.floor(h * pr));
  if (rtMain) { rtMain.dispose(); rtA.dispose(); rtB.dispose(); }
  rtMain = makeRT(W, H, q !== 'low');
  rtA = makeRT(W >> 2, H >> 2, false, false); rtB = makeRT(W >> 2, H >> 2, false, false);
  camera.aspect = w / h; camera.updateProjectionMatrix(); wCam.aspect = w / h; wCam.updateProjectionMatrix();
  postMat.uniforms.res.value.set(W, H);
}
function applyQuality() {
  const q = settings.quality;
  renderer.shadowMap.enabled = q !== 'low';
  sun.castShadow = q !== 'low';
  const ms = q === 'high' ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } });
  resize();
}
function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(postScene, postCam); }
function renderFrame(showWeapon) {
  particleScale = rtMain.height / (2 * Math.tan(camera.fov * PI / 360));
  renderer.setRenderTarget(rtMain); renderer.clear();
  renderer.render(scene, camera);
  if (showWeapon) { renderer.clearDepth(); renderer.render(wScene, wCam); }
  const bloom = settings.quality !== 'low';
  if (bloom) {
    brightMat.uniforms.t.value = rtMain.texture; pass(brightMat, rtA);
    for (let i = 1; i <= 2; i++) {
      blurMat.uniforms.t.value = rtA.texture; blurMat.uniforms.dir.value.set(i / rtA.width, 0); pass(blurMat, rtB);
      blurMat.uniforms.t.value = rtB.texture; blurMat.uniforms.dir.value.set(0, i / rtA.height); pass(blurMat, rtA);
    }
  }
  const u = postMat.uniforms;
  u.tDiffuse.value = rtMain.texture; u.tBloom.value = rtA.texture; u.bloomOn.value = bloom ? 1 : 0; u.time.value = G.time;
  pass(postMat, null);
}

/* ---------- procedural textures ---------- */
function ctex(size, fn, srgb = true, repeat = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); fn(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, maxAniso);
  return t;
}
function speckle(g, s, n, cols, rmax, a0 = .05, a1 = .25) {
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = a0 + Math.random() * (a1 - a0); const r = .5 + Math.random() * rmax; g.fillRect(Math.random() * s, Math.random() * s, r, r); }
  g.globalAlpha = 1;
}
const texSand = ctex(512, (g, s) => {
  g.fillStyle = '#c4a877'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) { const x = Math.random() * s, y = Math.random() * s, r = 20 + Math.random() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, r); const d = Math.random() < .5; gr.addColorStop(0, d ? 'rgba(140,110,70,.18)' : 'rgba(235,215,170,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, s, s); }
  speckle(g, s, 26000, ['#a88d60', '#dcc59a', '#8b7350', '#eadab0', '#b79a6c'], 1.8);
  for (let i = 0; i < 50; i++) { g.strokeStyle = 'rgba(120,95,60,.07)'; g.lineWidth = 1 + Math.random() * 2.5; g.beginPath(); const y = Math.random() * s; g.moveTo(0, y); g.bezierCurveTo(s * .3, y + Math.random() * 40 - 20, s * .6, y + Math.random() * 40 - 20, s, y); g.stroke(); }
});
const texConc = ctex(256, (g, s) => {
  g.fillStyle = '#e8e2d4'; g.fillRect(0, 0, s, s);
  speckle(g, s, 9000, ['#b9b1a1', '#ffffff', '#9a9386', '#d2c9b6'], 2.2);
  for (let i = 0; i < 16; i++) { const x = Math.random() * s, w = 4 + Math.random() * 24; const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, 'rgba(80,70,55,.2)'); gr.addColorStop(1, 'rgba(80,70,55,0)'); g.fillStyle = gr; g.fillRect(x, Math.random() * s * .3, w, s); }
  g.fillStyle = 'rgba(60,52,40,.35)'; g.fillRect(0, s - 10, s, 10);
  g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < s; y += 64) g.fillRect(0, y, s, 2);
});
const texRoad = ctex(256, (g, s) => {
  g.fillStyle = '#8a8170'; g.fillRect(0, 0, s, s);
  speckle(g, s, 16000, ['#6e6658', '#a39a86', '#5a5347', '#bdb39c'], 1.6, .1, .35);
  for (let i = 0; i < 8; i++) { g.strokeStyle = 'rgba(40,36,30,.25)'; g.lineWidth = 1; g.beginPath(); let x = Math.random() * s, y = Math.random() * s; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += Math.random() * 40 - 20; y += Math.random() * 40 - 20; g.lineTo(x, y); } g.stroke(); }
});
const texCont = ctex(128, (g, s) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
  for (let x = 0; x < s; x += 8) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x, 0, 3, s); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + 4, 0, 1, s); }
  speckle(g, s, 900, ['#6b4a2a', '#3a2a1a', '#8a6a4a'], 3, .1, .4);
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 0, s, 5); g.fillRect(0, s - 5, s, 5);
});
const texHesco = ctex(128, (g, s) => {
  g.fillStyle = '#c9b085'; g.fillRect(0, 0, s, s);
  speckle(g, s, 4000, ['#9d855c', '#e0cba0'], 2);
  g.strokeStyle = 'rgba(70,60,40,.55)'; g.lineWidth = 2;
  for (let i = 0; i <= s; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
});
const texSoft = ctex(64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.65)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); }, false, false);
const texSmoke = ctex(128, (g, s) => {
  for (let i = 0; i < 26; i++) { const x = s / 2 + (Math.random() - .5) * 50, y = s / 2 + (Math.random() - .5) * 50, r = 14 + Math.random() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, r); const v = 190 + Math.floor(Math.random() * 65); gr.addColorStop(0, `rgba(${v},${v},${v},.32)`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`); g.fillStyle = gr; g.fillRect(0, 0, s, s); }
}, false, false);
const texFlash = ctex(128, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,250,230,1)'); r.addColorStop(.25, 'rgba(255,200,110,.85)'); r.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'lighter'; g.translate(s / 2, s / 2);
  for (let i = 0; i < 7; i++) { g.rotate(TAU / 7 + Math.random() * .3); const l = s * (.3 + Math.random() * .2); const gr = g.createLinearGradient(0, 0, l, 0); gr.addColorStop(0, 'rgba(255,230,170,.9)'); gr.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -5); g.lineTo(l, 0); g.lineTo(0, 5); g.fill(); }
}, false, false);
const texScorch = ctex(128, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(15,12,10,.95)'); r.addColorStop(.5, 'rgba(30,25,20,.7)'); r.addColorStop(1, 'rgba(40,32,24,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s);
  speckle(g, s, 500, ['#000'], 4, .1, .5);
}, true, false);
const texHole = ctex(32, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(10,8,6,1)'); r.addColorStop(.3, 'rgba(25,20,15,.9)'); r.addColorStop(.55, 'rgba(70,60,45,.4)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s);
}, true, false);

/* ---------- geometry / material helpers ---------- */
const GB = new THREE.BoxGeometry(1, 1, 1);
const _lam = {}, _std = {}, _geo = {};
function lam(h) { return _lam[h] || (_lam[h] = new THREE.MeshLambertMaterial({ color: col(h) })); }
function std(h, r = .6, m = .2) { const k = h + '_' + r + '_' + m; return _std[k] || (_std[k] = new THREE.MeshStandardMaterial({ color: col(h), roughness: r, metalness: m })); }
function cylG(rt, rb, h, s = 12) { const k = 'c' + [rt, rb, h, s].join(); return _geo[k] || (_geo[k] = new THREE.CylinderGeometry(rt, rb, h, s)); }
function sphG(r, s = 12) { const k = 's' + r + '_' + s; return _geo[k] || (_geo[k] = new THREE.SphereGeometry(r, s, Math.max(6, s * .75 | 0))); }
const M = c => typeof c === 'number' ? lam(c) : c;
function box(g, w, h, d, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(GB, M(c)); m.scale.set(w, h, d); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
function cyl(g, rt, rb, h, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 12) { const m = new THREE.Mesh(cylG(rt, rb, h, s), M(c)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; }
function sph(g, r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, s = 12) { const m = new THREE.Mesh(sphG(r, s), M(c)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; }
function shadows(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; }
function boxUV(w, h, d, s) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / s, uv.getY(i) * dims[f][1] / s); }
  return g;
}

/* ---------- static instancing (one draw call per prop type) ---------- */
const _batches = new Map(), BATCH = {};
const _M4 = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _E = new THREE.Euler(0, 0, 0, 'YXZ'), _S = new V3(), _T = new V3();
function mtx(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) { _E.set(rx, ry, rz, 'YXZ'); _Q.setFromEuler(_E); return _M4.compose(_T.set(x, y, z), _Q, _S.set(sx, sy, sz)); }
function inst(key, geo, mat, m, cast = true) {
  let b = _batches.get(key); if (!b) { b = { geo, mat, list: [], cast }; _batches.set(key, b); }
  b.list.push(m.clone()); return { key, idx: b.list.length - 1 };
}
function flushBatches() {
  for (const [key, b] of _batches) {
    const im = new THREE.InstancedMesh(b.geo, b.mat, b.list.length);
    b.list.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = b.cast; im.receiveShadow = true; im.frustumCulled = false;
    scene.add(im); BATCH[key] = im;
  }
  _batches.clear();
}
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
function hideInstance(ref) { const im = BATCH[ref.key]; if (!im) return; im.setMatrixAt(ref.idx, ZERO_M); im.instanceMatrix.needsUpdate = true; }

/* ---------- collision world ---------- */
const colliders = [];
const BOUND = { x0: -150, x1: 150, z0: -148, z1: 154 };
function addCol(cx, cz, w, d, h, y0 = 0) { const c = { x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, y0, h, on: true }; colliders.push(c); return c; }
function groundH(x, z) {
  if (z < -140) return Math.max(-7, (z + 140) * .13);
  const e = Math.max(Math.abs(x), z) - 178;
  if (e > 0) return Math.min(34, e * .1) * (.65 + .35 * Math.sin(x * .021 + z * .013)) + Math.sin(x * .05) * Math.cos(z * .043) * Math.min(e, 60) * .05;
  return 0;
}
function rayAABB(o, d, x0, x1, y0, y1, z0, z1, maxT) {
  let tmin = 0, tmax = maxT, t1, t2, inv, s;
  if (Math.abs(d.x) < 1e-9) { if (o.x < x0 || o.x > x1) return Infinity; } else { inv = 1 / d.x; t1 = (x0 - o.x) * inv; t2 = (x1 - o.x) * inv; if (t1 > t2) { s = t1; t1 = t2; t2 = s; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return Infinity; }
  if (Math.abs(d.y) < 1e-9) { if (o.y < y0 || o.y > y1) return Infinity; } else { inv = 1 / d.y; t1 = (y0 - o.y) * inv; t2 = (y1 - o.y) * inv; if (t1 > t2) { s = t1; t1 = t2; t2 = s; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return Infinity; }
  if (Math.abs(d.z) < 1e-9) { if (o.z < z0 || o.z > z1) return Infinity; } else { inv = 1 / d.z; t1 = (z0 - o.z) * inv; t2 = (z1 - o.z) * inv; if (t1 > t2) { s = t1; t1 = t2; t2 = s; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return Infinity; }
  return tmin;
}
function raySphere(o, d, cx, cy, cz, r, maxT) {
  const ox = o.x - cx, oy = o.y - cy, oz = o.z - cz;
  const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - c; if (h < 0) return Infinity;
  const t = -b - Math.sqrt(h);
  if (t >= 0 && t < maxT) return t;
  return c < 0 ? 0 : Infinity;
}
/* nearest static hit along a ray; returns shared RW = {t, c} (c === GROUND for terrain) */
const GROUND = { ground: true }, RW = { t: 0, c: null };
function rayWorld(o, d, maxT) {
  let best = maxT, hc = null;
  const ex = o.x + d.x * maxT, ez = o.z + d.z * maxT;
  const mnx = Math.min(o.x, ex), mxx = Math.max(o.x, ex), mnz = Math.min(o.z, ez), mxz = Math.max(o.z, ez);
  for (const c of colliders) {
    if (!c.on || c.x1 < mnx || c.x0 > mxx || c.z1 < mnz || c.z0 > mxz) continue;
    const t = rayAABB(o, d, c.x0, c.x1, c.y0, c.h, c.z0, c.z1, best); if (t < best) { best = t; hc = c; }
  }
  if (d.y < -1e-5) {
    // march terrain coarsely, then refine
    const t0 = (groundH(o.x, o.z) - o.y) / d.y;
    if (t0 > 0 && t0 < best) {
      let t = t0; for (let k = 0; k < 3; k++) { const x = o.x + d.x * t, z = o.z + d.z * t; t = (groundH(x, z) - o.y) / d.y; }
      if (t > 0 && t < best) { best = t; hc = GROUND; }
    }
  }
  RW.t = best; RW.c = hc; return RW;
}
function boxNormal(p, c, out) {
  const e = .02;
  if (Math.abs(p.x - c.x0) < e) return out.set(-1, 0, 0);
  if (Math.abs(p.x - c.x1) < e) return out.set(1, 0, 0);
  if (Math.abs(p.z - c.z0) < e) return out.set(0, 0, -1);
  if (Math.abs(p.z - c.z1) < e) return out.set(0, 0, 1);
  if (Math.abs(p.y - c.h) < e) return out.set(0, 1, 0);
  return out.set(0, -1, 0);
}
/* smoke volumes block line of sight */
const smokes = [];
function addSmokeVolume(p, r, life) { smokes.push({ x: p.x, y: p.y + 2, z: p.z, r: 0, rMax: r, life, max: life }); }
function updateSmokes(dt) {
  for (let i = smokes.length - 1; i >= 0; i--) { const s = smokes[i]; s.life -= dt; s.r = Math.min(s.rMax, s.r + dt * 3); if (s.life <= 0) smokes.splice(i, 1); else if (s.life < 3) s.r = s.rMax * s.life / 3; }
}
const _ld = new V3();
function los(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, L = Math.hypot(dx, dy, dz);
  if (L < .01) return true;
  _ld.set(dx / L, dy / L, dz / L);
  const mnx = Math.min(a.x, b.x), mxx = Math.max(a.x, b.x), mnz = Math.min(a.z, b.z), mxz = Math.max(a.z, b.z);
  for (const c of colliders) {
    if (!c.on || c.x1 < mnx || c.x0 > mxx || c.z1 < mnz || c.z0 > mxz) continue;
    if (rayAABB(a, _ld, c.x0, c.x1, c.y0, c.h, c.z0, c.z1, L) < L - .3) return false;
  }
  for (const s of smokes) {
    const t = clamp((s.x - a.x) * _ld.x + (s.y - a.y) * _ld.y + (s.z - a.z) * _ld.z, 0, L);
    const px = a.x + _ld.x * t - s.x, py = a.y + _ld.y * t - s.y, pz = a.z + _ld.z * t - s.z;
    if (px * px + py * py + pz * pz < s.r * s.r * .8) return false;
  }
  return true;
}
function segPointDist2(a, d, L, p) {
  const t = clamp((p.x - a.x) * d.x + (p.y - a.y) * d.y + (p.z - a.z) * d.z, 0, L);
  const x = a.x + d.x * t - p.x, y = a.y + d.y * t - p.y, z = a.z + d.z * t - p.z;
  return x * x + y * y + z * z;
}
/* circle-vs-AABB push-out; returns floor height under the circle (stand on low objects) */
function collideCircle(p, r, feet, height = 1.7) {
  let floor = groundH(p.x, p.z);
  for (const c of colliders) {
    if (!c.on || p.x + r < c.x0 || p.x - r > c.x1 || p.z + r < c.z0 || p.z - r > c.z1) continue;
    if (c.y0 > feet + height) continue;
    if (c.h <= feet + .55) { if (p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1 && c.h > floor) floor = c.h; continue; }
    const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); if (d < r) { p.x += dx / d * (r - d); p.z += dz / d * (r - d); } }
    else {
      const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, rr, t, b);
      if (m === l) p.x = c.x0 - r; else if (m === rr) p.x = c.x1 + r; else if (m === t) p.z = c.z0 - r; else p.z = c.z1 + r;
    }
  }
  p.x = clamp(p.x, BOUND.x0, BOUND.x1); p.z = clamp(p.z, BOUND.z0, BOUND.z1);
  return floor;
}
function blockedAt(x, z, r, feet) {
  for (const c of colliders) {
    if (!c.on || x + r < c.x0 || x - r > c.x1 || z + r < c.z0 || z - r > c.z1) continue;
    if (c.y0 > feet + 1.7 || c.h <= feet + .55) continue;
    return true;
  }
  return x < BOUND.x0 || x > BOUND.x1 || z < BOUND.z0 || z > BOUND.z1;
}

/* ---------- GPU particles (one draw call per pool) ---------- */
const PV = `attribute vec4 pc;attribute float ps;attribute float pr;varying vec4 vC;varying float vR;varying float vF;uniform float uScale;uniform float uFogD;
void main(){vC=pc;vR=pr;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=min(ps*uScale/max(-mv.z,.1),640.);gl_Position=projectionMatrix*mv;float d=-mv.z;vF=1.-exp(-uFogD*uFogD*d*d);}`;
const PF = `uniform sampler2D map;uniform vec3 uFog;uniform float uAdd;varying vec4 vC;varying float vR;varying float vF;
void main(){vec2 uv=gl_PointCoord-.5;float c=cos(vR),s=sin(vR);uv=vec2(c*uv.x-s*uv.y,s*uv.x+c*uv.y)+.5;vec4 t=texture2D(map,uv);
vec3 rgb=vC.rgb*t.rgb;float a=vC.a*t.a;if(uAdd>.5){a*=1.-vF;}else{rgb=mix(rgb,uFog,vF);}gl_FragColor=vec4(rgb,a);}`;
class Particles {
  constructor(n, tex, additive) {
    this.n = n; this.i = 0;
    this.P = new Float32Array(n * 3); this.C = new Float32Array(n * 4); this.S = new Float32Array(n); this.Rt = new Float32Array(n);
    this.v = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n); this.grow = new Float32Array(n);
    this.a0 = new Float32Array(n); this.drag = new Float32Array(n); this.grav = new Float32Array(n); this.spin = new Float32Array(n); this.fin = new Float32Array(n); this.cool = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    this.aP = new THREE.BufferAttribute(this.P, 3).setUsage(THREE.DynamicDrawUsage);
    this.aC = new THREE.BufferAttribute(this.C, 4).setUsage(THREE.DynamicDrawUsage);
    this.aS = new THREE.BufferAttribute(this.S, 1).setUsage(THREE.DynamicDrawUsage);
    this.aR = new THREE.BufferAttribute(this.Rt, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aP); geo.setAttribute('pc', this.aC); geo.setAttribute('ps', this.aS); geo.setAttribute('pr', this.aR);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, uScale: { value: 500 }, uFog: { value: FOG_COLOR }, uFogD: { value: scene.fog.density }, uAdd: { value: additive ? 1 : 0 } },
      vertexShader: PV, fragmentShader: PF, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.pts = new THREE.Points(geo, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 4 : 3; scene.add(this.pts);
  }
  spawn(x, y, z, vx, vy, vz, size, grow, life, c, alpha, drag = 0, grav = 0, fadeIn = 0, cool = 0) {
    const i = this.i; this.i = (i + 1) % this.n; const i3 = i * 3, i4 = i * 4;
    this.P[i3] = x; this.P[i3 + 1] = y; this.P[i3 + 2] = z; this.v[i3] = vx; this.v[i3 + 1] = vy; this.v[i3 + 2] = vz;
    this.S[i] = size; this.grow[i] = grow; this.life[i] = this.max[i] = life; this.a0[i] = alpha; this.drag[i] = drag; this.grav[i] = grav; this.fin[i] = fadeIn; this.cool[i] = cool;
    this.Rt[i] = Math.random() * TAU; this.spin[i] = Math.random() * 2 - 1;
    this.C[i4] = c.r; this.C[i4 + 1] = c.g; this.C[i4 + 2] = c.b; this.C[i4 + 3] = fadeIn > 0 ? 0 : alpha;
  }
  update(dt) {
    const P = this.P, C = this.C, v = this.v;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      const l = this.life[i] -= dt, i3 = i * 3, i4 = i * 4;
      if (l <= 0) { C[i4 + 3] = 0; this.S[i] = 0; continue; }
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      v[i3] *= dr; v[i3 + 1] = v[i3 + 1] * dr + this.grav[i] * dt; v[i3 + 2] *= dr;
      P[i3] += v[i3] * dt; P[i3 + 1] += v[i3 + 1] * dt; P[i3 + 2] += v[i3 + 2] * dt;
      if (P[i3 + 1] < -1) { P[i3 + 1] = -1; v[i3 + 1] = 0; }
      this.S[i] += this.grow[i] * dt; this.Rt[i] += this.spin[i] * dt * .4;
      const t = 1 - l / this.max[i]; let a = this.a0[i] * (1 - t);
      if (this.fin[i] > 0) a *= Math.min(1, (this.max[i] - l) / this.fin[i]);
      C[i4 + 3] = a;
      if (this.cool[i] > 0) { const k = Math.max(0, 1 - this.cool[i] * dt); C[i4] *= k; C[i4 + 1] *= k * k; C[i4 + 2] *= k * k * k; }
    }
    this.aP.needsUpdate = this.aC.needsUpdate = this.aS.needsUpdate = this.aR.needsUpdate = true;
    this.mat.uniforms.uScale.value = particleScale;
  }
}
const fire = new Particles(900, texSoft, true);
const smoke = new Particles(1600, texSmoke, false);

/* ---------- tracers ---------- */
const TR_MATS = {
  ally: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.4, 1.4), transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
  enemy: new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 1.8, .6), transparent: true, opacity: .9, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
  heavy: new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 4, 1.2), transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
};
const _tv = new V3(), _tv2 = new V3();
class Tracers {
  constructor(n) {
    this.list = []; this.i = 0;
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(GB, TR_MATS.ally); m.visible = false; m.frustumCulled = false; m.renderOrder = 5; scene.add(m); this.list.push({ m, a: new V3(), d: new V3(), L: 0, t: 0, spd: 0, w: .03, len: 5 }); }
  }
  spawn(a, b, kind = 'ally', w = .035, spd = 650, len = 7) {
    const o = this.list[this.i]; this.i = (this.i + 1) % this.list.length;
    o.a.copy(a); o.d.copy(b).sub(a); o.L = o.d.length(); if (o.L < 1.5) return; o.d.divideScalar(o.L);
    const skip = Math.min(2.5, o.L * .3); o.a.addScaledVector(o.d, skip); o.L -= skip;
    o.t = 0; o.spd = spd; o.len = len; o.w = w; o.m.material = TR_MATS[kind] || TR_MATS.ally; o.m.visible = true;
  }
  update(dt) {
    for (const o of this.list) {
      if (!o.m.visible) continue;
      o.t += dt * o.spd; const head = Math.min(o.t, o.L), tail = Math.max(0, head - o.len);
      if (tail >= o.L - .01) { o.m.visible = false; continue; }
      const L = head - tail; if (L < .01) continue;
      o.m.position.copy(o.a).addScaledVector(o.d, (head + tail) / 2);
      _tv2.copy(o.a).addScaledVector(o.d, head); o.m.lookAt(_tv2);
      const cd = camera.position.distanceTo(o.m.position);
      if (cd < 4) { o.m.scale.set(0, 0, 0); continue; }
      const w = o.w * (1 + cd * .012);
      o.m.scale.set(w, w, L);
    }
  }
}
const tracers = new Tracers(90);

/* ---------- decals ---------- */
class Decals {
  constructor(n, tex, size, opacity) {
    this.list = []; this.i = 0;
    const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: true, depthWrite: false, opacity, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(geo, mat); m.visible = false; m.renderOrder = 1; scene.add(m); this.list.push(m); }
    this.size = size;
  }
  place(p, n, s = 1) {
    const m = this.list[this.i]; this.i = (this.i + 1) % this.list.length;
    m.position.copy(p).addScaledVector(n, .02); _tv.copy(m.position).add(n); m.lookAt(_tv); m.rotateZ(Math.random() * TAU);
    const sz = this.size * s; m.scale.set(sz, sz, 1); m.visible = true;
  }
  clear() { for (const m of this.list) m.visible = false; }
}
const scorchDecals = new Decals(30, texScorch, 1, .9);
const holeDecals = new Decals(90, texHole, .16, 1);
const UP = new V3(0, 1, 0);

/* ---------- effects ---------- */
const C_FIRE = hcol(0xffa64a, 7), C_CORE = hcol(0xfff1c4, 16), C_SMOKE_D = col(0x2c2924), C_SMOKE = col(0x6a6156), C_SMOKE_L = col(0x9a9284),
  C_DUST = col(0xc9ae80), C_SPARK = hcol(0xffc070, 14), C_BLOOD = col(0x5e0606), C_CONC = col(0xbcb4a2), C_WATER = col(0xd8eef2),
  C_MUZ = hcol(0xffb35a, 9), C_DEBRIS = col(0x2a2620), C_WHITE = col(0xe6e6e0), C_GREEN = hcol(0x7dff8a, 4), C_FLARE = hcol(0xffe0a0, 40);
function fxMuzzle(p, s = 1) {
  fire.spawn(p.x, p.y, p.z, 0, 0, 0, .55 * s, 3 * s, .05, C_MUZ, 1);
  smoke.spawn(p.x, p.y, p.z, rand(-.3, .3), rand(.2, .8), rand(-.3, .3), .25 * s, 1.2 * s, .6, C_SMOKE_L, .25, 2, 0, .05);
}
function fxImpact(p, kind, n) {
  if (kind === 'blood') {
    for (let i = 0; i < 4; i++) smoke.spawn(p.x, p.y, p.z, rand(-1.2, 1.2), rand(-.3, 1.2), rand(-1.2, 1.2), .22, .9, .45, C_BLOOD, .85, 3, -3);
    return;
  }
  if (kind === 'water') { for (let i = 0; i < 6; i++) smoke.spawn(p.x, p.y, p.z, rand(-.6, .6), rand(2, 5), rand(-.6, .6), .3, .8, .7, C_WATER, .8, 1, -12); return; }
  if (kind === 'metal') { for (let i = 0; i < 7; i++) fire.spawn(p.x, p.y, p.z, rand(-5, 5), rand(1, 6), rand(-5, 5), .09, 0, rand(.15, .35), C_SPARK, 1, 1, -18); return; }
  const c = kind === 'sand' ? C_DUST : C_CONC;
  for (let i = 0; i < (n || 3); i++) smoke.spawn(p.x, p.y, p.z, rand(-.8, .8), rand(.5, 2.2), rand(-.8, .8), .3, 1.6, rand(.6, 1.1), c, .75, 2.5, -1.5);
  if (kind !== 'sand') for (let i = 0; i < 3; i++) fire.spawn(p.x, p.y, p.z, rand(-4, 4), rand(1, 5), rand(-4, 4), .07, 0, .18, C_SPARK, 1, 1, -18);
  for (let i = 0; i < 3; i++) smoke.spawn(p.x, p.y, p.z, rand(-3, 3), rand(2, 5), rand(-3, 3), .06, 0, .6, C_DEBRIS, 1, .5, -20);
}
function fxExplosion(p, s = 1, water = false) {
  fire.spawn(p.x, p.y + .6 * s, p.z, 0, 0, 0, 10 * s, 10 * s, .13, C_CORE, 1);
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * TAU, e = rand(-.1, 1.2), sp = rand(3, 12) * s;
    fire.spawn(p.x + rand(-.5, .5) * s, p.y + rand(.3, 1.2) * s, p.z + rand(-.5, .5) * s, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp * .8 + 2 * s, Math.sin(a) * Math.cos(e) * sp, rand(2, 3.5) * s, 5 * s, rand(.35, .85), C_FIRE, 1, 3.5, 2, 0, 2.4);
  }
  for (let i = 0; i < 20; i++) smoke.spawn(p.x + rand(-1, 1) * s, p.y + rand(.5, 2.5) * s, p.z + rand(-1, 1) * s, rand(-2.5, 2.5) * s, rand(2, 7) * s, rand(-2.5, 2.5) * s, rand(2.5, 4) * s, rand(2.5, 4) * s, rand(3.5, 7), i % 3 ? C_SMOKE_D : C_SMOKE, .85, 1.3, .4, .25);
  const dc = water ? C_WATER : C_DUST;
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; smoke.spawn(p.x, p.y + .4, p.z, Math.cos(a) * 14 * s, rand(.5, 2), Math.sin(a) * 14 * s, 1.8 * s, 5 * s, rand(1.6, 2.6), dc, .6, 3, 0, .05); }
  if (water) for (let i = 0; i < 20; i++) smoke.spawn(p.x, p.y, p.z, rand(-3, 3) * s, rand(10, 22) * s, rand(-3, 3) * s, .8 * s, 2 * s, 1.6, C_WATER, .9, .5, -18);
  for (let i = 0; i < 26; i++) fire.spawn(p.x, p.y + .6, p.z, rand(-1, 1) * 16 * s, rand(4, 18) * s, rand(-1, 1) * 16 * s, .22, 0, rand(.5, 1.5), C_SPARK, 1, .4, -20);
  for (let i = 0; i < 14; i++) smoke.spawn(p.x, p.y + .5, p.z, rand(-1, 1) * 9 * s, rand(5, 14) * s, rand(-1, 1) * 9 * s, rand(.2, .45), 0, rand(1, 1.8), C_DEBRIS, 1, .3, -22);
  flashLight(p, 9 * s, .4, 55 * s);
  if (!water && p.y < groundH(p.x, p.z) + 2) scorchDecals.place(_tv.set(p.x, groundH(p.x, p.z), p.z), UP, 3.5 * s);
}
function fxSmokeCloud(p) {
  for (let i = 0; i < 3; i++) smoke.spawn(p.x + rand(-3, 3), p.y + rand(.3, 2.5), p.z + rand(-3, 3), rand(-.6, .6), rand(.1, .6), rand(-.6, .6), rand(4, 6), 1.2, rand(6, 9), C_WHITE, .55, .3, 0, 1);
}

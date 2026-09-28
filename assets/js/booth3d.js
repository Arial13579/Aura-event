// Photographic stage: path-traced renders of the Snap Box (Blender / Cycles) brought to life with
// depth-based parallax, depth-aware transitions between shots, and the visitor's live camera
// projected onto the booth's screen inside the photo.
import * as THREE from 'three';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);
const BG = { r: 0xef / 255, g: 0xe9 / 255, b: 0xdf / 255 }; // raw sRGB, matches the page background exactly
const IMG_ASPECT = 1.6;
const ROOT = 'assets/render/';

// page section (data-cam) -> rendered shot
const SECTION_SHOT = { hero: 'hero', experience: 'package', try: 'try', product: 'contact', packages: 'contact', contact: 'contact' };

const vertexShader = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const fragmentShader = /* glsl */`
  precision highp float;
  uniform sampler2D tA, tAD, tB, tBD, tScr;
  uniform vec4 uCovA, uCovB;
  uniform vec2 uQA[4];
  uniform vec2 uQB[4];
  uniform vec2 uOff;
  uniform float uMix, uScrOn, uFlash;
  uniform vec3 uBg;
  varying vec2 vUv;

  float cr(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
  // inverse bilinear mapping (a=TL, b=TR, c=BR, d=BL) -> (u, v) inside the quad, anything else when outside
  vec2 invBilinear(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
    vec2 e = b - a, f = d - a, g = a - b + c - d, h = p - a;
    float k2 = cr(g, f), k1 = cr(e, f) + cr(h, g), k0 = cr(h, e);
    if (abs(k2) < 1e-7) { float v = -k0 / k1; return vec2((h.x - f.x * v) / (e.x + g.x * v), v); }
    float w = k1 * k1 - 4.0 * k0 * k2;
    if (w < 0.0) return vec2(-1.0);
    w = sqrt(w);
    float v1 = (-k1 - w) / (2.0 * k2), u1 = (h.x - f.x * v1) / (e.x + g.x * v1);
    if (u1 >= 0.0 && u1 <= 1.0 && v1 >= 0.0 && v1 <= 1.0) return vec2(u1, v1);
    float v2 = (-k1 + w) / (2.0 * k2);
    return vec2((h.x - f.x * v2) / (e.x + g.x * v2), v2);
  }

  vec3 shot(sampler2D img, sampler2D dep, vec4 cov, vec2 q0, vec2 q1, vec2 q2, vec2 q3, out float depth) {
    vec2 uv = vUv * cov.xy + cov.zw;
    // refine: read depth where the colour will actually be sampled
    float d = texture2D(dep, uv).r;
    d = texture2D(dep, uv - uOff * (1.0 - d)).r;
    d = texture2D(dep, uv - uOff * (1.0 - d)).r;
    vec2 p = uv - uOff * (1.0 - d);
    depth = d;
    vec4 c = texture2D(img, p);
    vec3 col = mix(uBg, c.rgb, c.a);
    if (uScrOn > 0.0) {
      vec2 st = invBilinear(p, q0, q1, q2, q3);
      if (st.x >= 0.0 && st.x <= 1.0 && st.y >= 0.0 && st.y <= 1.0) {
        vec4 s = texture2D(tScr, vec2(st.x, 1.0 - st.y));
        col = mix(col, s.rgb, s.a * uScrOn);
      }
    }
    return col;
  }

  void main() {
    float dA, dB = 1.0;
    vec3 a = shot(tA, tAD, uCovA, uQA[0], uQA[1], uQA[2], uQA[3], dA);
    vec3 col = a;
    if (uMix > 0.001) {
      vec3 b = shot(tB, tBD, uCovB, uQB[0], uQB[1], uQB[2], uQB[3], dB);
      // depth-aware dissolve: the foreground of the next shot settles in first
      float m = smoothstep(0.0, 1.0, clamp(uMix * 1.5 - dB * 0.5, 0.0, 1.0));
      col = mix(a, b, uMix > 0.999 ? 1.0 : m);
    }
    col = mix(col, vec3(1.0), uFlash * 0.45);
    gl_FragColor = vec4(col, 1.0);
  }`;

export async function initBooth(canvasEl, { onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: 'high-performance' });
  if (!renderer.getContext()) throw new Error('no webgl');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // renders are display-ready; pass them through untouched

  const meta = await fetch(ROOT + 'shots.json').then((r) => r.json());
  onProgress?.(20);

  const loader = new THREE.TextureLoader();
  const cache = {};
  const loadTex = (url) => new Promise((res, rej) => loader.load(url, (t) => {
    t.colorSpace = THREE.NoColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    res(t);
  }, undefined, rej));
  function getShot(name) {
    if (!cache[name]) {
      cache[name] = Promise.all([loadTex(`${ROOT}${name}.webp`), loadTex(`${ROOT}${name}-depth.jpg`)])
        .then(([img, dep]) => { cache[name].ready = { img, dep }; });
    }
    return cache[name];
  }
  await getShot('hero');
  onProgress?.(70);

  const scrC = document.createElement('canvas'); scrC.width = 360; scrC.height = 500;
  const scrG = scrC.getContext('2d');
  const scrTex = new THREE.CanvasTexture(scrC);

  const flipQ = (q) => q.map(([x, y]) => new THREE.Vector2(x, 1 - y)); // Blender top-left -> GL bottom-left
  const uniforms = {
    tA: { value: null }, tAD: { value: null }, tB: { value: null }, tBD: { value: null }, tScr: { value: scrTex },
    uCovA: { value: new THREE.Vector4(1, 1, 0, 0) }, uCovB: { value: new THREE.Vector4(1, 1, 0, 0) },
    uQA: { value: flipQ(meta.hero.screen) }, uQB: { value: flipQ(meta.hero.screen) },
    uOff: { value: new THREE.Vector2() }, uMix: { value: 0 }, uScrOn: { value: 0 }, uFlash: { value: 0 },
    uBg: { value: new THREE.Vector3(BG.r, BG.g, BG.b) },
  };
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, depthTest: false, depthWrite: false }));
  quad.frustumCulled = false;
  scene.add(quad);
  const cam = new THREE.Camera();

  // cover-fit a shot; on portrait screens keep the booth itself in frame
  function cover(name, target) {
    const sa = innerWidth / innerHeight;
    const zoom = .965; // margin so the parallax never reveals an edge
    let sx = 1, sy = 1;
    if (sa > IMG_ASPECT) sy = IMG_ASPECT / sa; else sx = sa / IMG_ASPECT;
    sx *= zoom; sy *= zoom;
    const [bx, by] = meta[name].booth;
    const fx = sa < 1.2 ? bx + .02 : .5;
    const fy = sa < 1.2 ? 1 - by + .06 : .5;
    target.set(sx, sy, Math.max(0, Math.min(1 - sx, fx - sx / 2)), Math.max(0, Math.min(1 - sy, fy - sy / 2)));
  }

  /* ---- scroll -> shot pair ---- */
  const sections = [...document.querySelectorAll('[data-cam]')].map((el) => ({ el, shot: SECTION_SHOT[el.dataset.cam] || 'hero' }));
  let anchors = [];
  function measure() {
    anchors = sections.map(({ el, shot }) => { const r = el.getBoundingClientRect(); return { y: r.top + scrollY + r.height / 2, shot }; });
  }
  measure();
  addEventListener('load', measure);
  new ResizeObserver(measure).observe(document.body);
  setTimeout(() => Object.keys(meta).forEach(getShot), 300);

  function pair() {
    const y = scrollY + innerHeight / 2;
    let i = 0;
    while (i < anchors.length - 1 && anchors[i + 1].y <= y) i++;
    const A = anchors[i], B = anchors[Math.min(i + 1, anchors.length - 1)];
    if (A.shot === B.shot) return [A.shot, A.shot, 0];
    const t = clamp01((y - A.y) / (B.y - A.y));
    return [A.shot, B.shot, smooth(clamp01((t - .3) / .4))]; // hold each shot, change in the middle stretch
  }

  /* ---- pointer / drag / tilt parallax ---- */
  const ptr = { x: 0, y: 0, sx: 0, sy: 0, dx: 0 };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  let dragging = false, lastX = 0;
  const dragOk = (el) => !el.closest('a, button, input, textarea, select, label, form, header, .gallery, .try-box, .print-slot, .faq, .reviews-grid, .a11y, #cookie, dialog');
  addEventListener('pointerdown', (e) => { if (dragOk(e.target)) { dragging = true; lastX = e.clientX; } });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    ptr.dx = Math.max(-1, Math.min(1, ptr.dx + (e.clientX - lastX) / innerWidth * 3));
    lastX = e.clientX;
  }, { passive: true });
  const endDrag = () => { dragging = false; };
  addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    ptr.x = Math.max(-1, Math.min(1, e.gamma / 25));
    ptr.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  }, { passive: true });

  /* ---- screen overlay: live camera + countdown on the booth's screen ---- */
  const state = { video: null, count: 0, flash: 0 };
  function drawScreen() {
    const live = state.video && state.video.readyState >= 2;
    const on = live || state.count > 0 || state.flash > 0;
    uniforms.uScrOn.value += ((on ? 1 : 0) - uniforms.uScrOn.value) * .25;
    if (!on && uniforms.uScrOn.value < .01) { uniforms.uScrOn.value = 0; return; }
    const g = scrG, W = 360, H = 500;
    g.clearRect(0, 0, W, H);
    if (live) {
      const v = state.video, s = Math.max(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * s, dh = v.videoHeight * s;
      g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh); g.restore();
    }
    if (state.count) {
      g.fillStyle = live ? 'rgba(20,16,12,.3)' : 'rgba(20,16,12,.55)'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fbf6ec'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'italic 500 280px "Cormorant Garamond", Georgia, serif';
      g.fillText(String(state.count), W / 2, H / 2 + 6);
    }
    if (state.flash > 0) { g.fillStyle = `rgba(255,253,248,${state.flash})`; g.fillRect(0, 0, W, H); }
    scrTex.needsUpdate = true;
  }

  /* ---- loop ---- */
  const clock = new THREE.Clock();
  let curA = null, curB = null;
  function bind(slot, name) {
    const s = cache[name].ready;
    if (slot === 'A') { uniforms.tA.value = s.img; uniforms.tAD.value = s.dep; uniforms.uQA.value = flipQ(meta[name].screen); curA = name; }
    else { uniforms.tB.value = s.img; uniforms.tBD.value = s.dep; uniforms.uQB.value = flipQ(meta[name].screen); curB = name; }
  }
  function frame() {
    const dt = Math.min(clock.getDelta(), .05), time = clock.elapsedTime;
    const [a, b, t] = pair();
    getShot(a); getShot(b);
    const aName = cache[a].ready ? a : (curA || 'hero');
    if (curA !== aName) bind('A', aName);
    const bReady = !!cache[b].ready;
    if (bReady && curB !== b) bind('B', b);
    uniforms.uMix.value += ((bReady && b !== aName ? t : 0) - uniforms.uMix.value) * (1 - Math.pow(.0005, dt));
    cover(curA, uniforms.uCovA.value);
    if (curB) cover(curB, uniforms.uCovB.value);

    const k = 1 - Math.pow(.004, dt);
    ptr.sx += (ptr.x - ptr.sx) * k; ptr.sy += (ptr.y - ptr.sy) * k;
    if (!dragging) ptr.dx *= Math.pow(.25, dt);
    const idleX = reducedMotion ? 0 : Math.sin(time * .35) * .25;
    const idleY = reducedMotion ? 0 : Math.cos(time * .27) * .12;
    uniforms.uOff.value.set((ptr.sx * .55 + ptr.dx + idleX) * .011, (-ptr.sy * .4 + idleY) * .007);

    state.flash = Math.max(0, state.flash - dt * 2.2);
    uniforms.uFlash.value = state.flash;
    drawScreen();
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }

  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight, false); measure(); });
  onProgress?.(100);
  frame();

  return {
    setVideo(v) { state.video = v; },
    setCountdown(n) { state.count = n; },
    flash() { state.flash = 1; },
  };
}

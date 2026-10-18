'use strict';
/* =====================================================================
   World.js — coastal desert town, forward operating base, sea with
   warships, props, destructible cover, cover points for AI, rooftop
   ambush spots, smoke columns and drifting ground haze.
   ===================================================================== */
const spawnPts = [], coverPts = [], roofSpots = [], destructibles = [], barrels = [], ammoCrates = [], ships = [], smokeCols = [];
const PLAYER_SPAWN = new V3(0, 0, 122);
const LZ = new V3(-96, 0, -24);
const HOSTAGE_POS = new V3(-96, 0, -50);
const LAUNCHER_POS = [[-72, -96], [72, -72], [-48, 24]];
const RESERVED = new Set(['-3,-4', '3,-3', '-2,1', '-4,-2']);
const ROUTES = {
  west: [[-138, -24], [0, -24], [0, -138], [-138, -138]],
  east: [[138, -24], [138, -138], [0, -138], [0, -24]],
  south: [[-138, 70], [138, 70], [138, -24], [-138, -24]],
  ring: [[0, -24], [-138, -24], [-138, -138], [138, -138], [138, -24]]
};
let water = null, waterBase = null, skyMesh = null, flag = null, flagBase = null, parkedHeli = null;

function buildWorld() {
  const oldR = R; R = mulberry(20251018);
  buildSky(); buildEnvironment(skyMesh); buildGround(); buildSea(); buildRoads();
  buildTown(); buildBase(); buildProps(); buildShips();
  flushBatches(); buildCover();
  R = oldR;
}

function buildSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: hcol(0x5d8cc0, 1.15) }, hor: { value: FOG_COLOR }, sunDir: { value: SUN_DIR }, sunCol: { value: hcol(0xfff0d0, 40) } },
    vertexShader: 'varying vec3 vW;void main(){vW=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}',
    fragmentShader: 'uniform vec3 top,hor,sunDir,sunCol;varying vec3 vW;void main(){vec3 d=normalize(vW);float h=max(d.y,0.);vec3 c=mix(hor,top,pow(h,.5));if(d.y<0.)c=hor;float s=max(dot(d,sunDir),0.);c+=sunCol*pow(s,1400.)+hor*.7*pow(s,9.);gl_FragColor=vec4(c,1.);}'
  });
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), mat);
  skyMesh.renderOrder = -1; skyMesh.frustumCulled = false; scene.add(skyMesh);
}
function buildGround() {
  const geo = new THREE.PlaneGeometry(1700, 1700, 170, 170); geo.rotateX(-PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, groundH(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  texSand.repeat.set(210, 210);
  const m = new THREE.Mesh(geo, surf({ color: col(0xffffff), map: texSand }));
  m.receiveShadow = true; scene.add(m);
}
function buildSea() {
  const geo = new THREE.PlaneGeometry(1700, 760, 72, 30); geo.rotateX(-PI / 2); geo.translate(0, -1.15, -530);
  let nm = null;
  if (window.ASSET_WATERNORMALS) { nm = new THREE.TextureLoader().load(window.ASSET_WATERNORMALS); nm.wrapS = nm.wrapT = THREE.RepeatWrapping; nm.repeat.set(60, 26); }
  water = new THREE.Mesh(geo, PBR
    ? new THREE.MeshStandardMaterial({ color: col(0x1f5a6c), roughness: .08, metalness: .15, normalMap: nm, normalScale: new THREE.Vector2(.6, .6), envMapIntensity: 1.4, transparent: true, opacity: .96 })
    : new THREE.MeshPhongMaterial({ color: col(0x2b6d84), specular: col(0xa8ccd6), shininess: 95, transparent: true, opacity: .94 }));
  waterBase = Float32Array.from(geo.attributes.position.array);
  scene.add(water);
}
function updateWater(t) {
  const p = water.geometry.attributes.position, a = p.array;
  for (let i = 0; i < a.length; i += 3) { const x = waterBase[i], z = waterBase[i + 2]; a[i + 1] = -1.15 + Math.sin(x * .05 + t * 1.1) * .26 + Math.cos(z * .07 + t * .8) * .22 + Math.sin((x + z) * .11 + t * 1.7) * .08; }
  p.needsUpdate = true; water.geometry.computeVertexNormals();
  const nm = water.material.normalMap; if (nm) { nm.offset.set(t * .006, t * .011); }
}
function buildRoads() {
  texRoad.repeat.set(1, 1);
  const strip = (x, z, w, d) => {
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(-PI / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 8, uv.getY(i) * d / 8);
    const r = new THREE.Mesh(g, surf({ map: texRoad, polygonOffset: true, polygonOffsetFactor: -1 }));
    r.position.set(x, .03, z); r.receiveShadow = true; scene.add(r);
  };
  strip(0, -28, 10, 236); strip(0, -24, 292, 10); strip(0, -138, 292, 9); strip(-138, -34, 9, 216); strip(138, -34, 9, 216); strip(0, 72, 292, 9);
  // painted lane dashes on the main axis
  for (let z = -140; z < 90; z += 6) inst('dash', GB, lam(0xe8e0c8), mtx(0, .045, z, .18, .02, 2.4), false);
}

/* ---------- town ---------- */
const B_COLS = [0xdccbaa, 0xcfbd98, 0xe4dccb, 0xc2b08e, 0xd6c4a2, 0xbfb39b, 0xe0cfb0];
let bMats = null;
function building(cx, cz, w, d, floors) {
  const h = floors * 3.3 + .4;
  const m = new THREE.Mesh(boxUV(w, h, d, 4), pick(bMats)); m.position.set(cx, h / 2, cz); m.castShadow = m.receiveShadow = true; scene.add(m);
  addCol(cx, cz, w, d, h);
  const dark = lam(0x1a1916), sill = lam(0xa1977f);
  const doorSide = (cx + cz) > 0 ? 0 : 1;
  for (let f = 0; f < floors; f++) {
    const y = f * 3.3 + 1.9;
    for (let side = 0; side < 4; side++) {
      const len = side < 2 ? w : d, n = Math.max(1, Math.floor(len / 3.4));
      for (let k = 0; k < n; k++) {
        if (R() < .1) continue;
        const o = (k - (n - 1) / 2) * (len / n);
        let x, z, ry;
        if (side === 0) { x = cx + o; z = cz + d / 2 + .04; ry = 0; } else if (side === 1) { x = cx + o; z = cz - d / 2 - .04; ry = 0; }
        else if (side === 2) { x = cx + w / 2 + .04; z = cz + o; ry = PI / 2; } else { x = cx - w / 2 - .04; z = cz + o; ry = PI / 2; }
        const door = f === 0 && side === doorSide && k === Math.floor(n / 2);
        if (door) { inst('win', GB, dark, mtx(x, 1.15, z, 1.4, 2.3, .12, ry), false); inst('sill', GB, sill, mtx(x, 2.4, z, 1.8, .18, .4, ry)); continue; }
        inst('win', GB, dark, mtx(x, y, z, 1.05, 1.3, .12, ry), false);
        if (R() < .45) inst('sill', GB, sill, mtx(x, y - .72, z, 1.35, .1, .28, ry));
        if (f > 0 && R() < .1) inst('ac', GB, lam(0xd8d6cc), mtx(x + (side < 2 ? 1 : 0), y - .3, z + (side >= 2 ? 1 : 0), .8, .55, .6, ry));
        if (R() < .06) inst('shutter', GB, lam(0x5b6b52), mtx(x, y, z, 1.08, 1.33, .14, ry), false);
      }
    }
  }
  // parapet (solid so roof gunmen can duck behind it)
  const pc = lam(0xb7a98b), t = .28, ph = .75, top = h + ph / 2;
  inst('par', GB, pc, mtx(cx, top, cz + d / 2 - t / 2, w, ph, t)); addCol(cx, cz + d / 2 - t / 2, w, t, h + ph, h);
  inst('par', GB, pc, mtx(cx, top, cz - d / 2 + t / 2, w, ph, t)); addCol(cx, cz - d / 2 + t / 2, w, t, h + ph, h);
  inst('par', GB, pc, mtx(cx + w / 2 - t / 2, top, cz, t, ph, d)); addCol(cx + w / 2 - t / 2, cz, t, d, h + ph, h);
  inst('par', GB, pc, mtx(cx - w / 2 + t / 2, top, cz, t, ph, d)); addCol(cx - w / 2 + t / 2, cz, t, d, h + ph, h);
  // rooftop solar water heaters and tanks
  const nH = ri(1, 3);
  for (let k = 0; k < nH; k++) {
    const x = cx + rand(-w / 2 + 2, w / 2 - 2), z = cz + rand(-d / 2 + 2.5, d / 2 - 2.5);
    inst('boiler', cylG(.35, .35, 1.7, 10), lam(0xe9e9e3), mtx(x, h + 1.05, z - .5, 1, 1, 1, 0, 0, PI / 2));
    inst('panel', GB, lam(0x1e2a3c), mtx(x, h + .7, z + .6, 1.7, .06, 1.2, 0, -.55));
    inst('legs', GB, lam(0x8d8d88), mtx(x, h + .45, z - .5, 1.4, .9, .08));
  }
  if (R() < .4) inst('tank', cylG(.7, .7, 1.2, 12), lam(0x232323), mtx(cx + rand(-w / 4, w / 4), h + .6, cz + rand(-d / 4, d / 4), 1, 1, 1));
  if (R() < .3) inst('ant', cylG(.03, .03, 3, 4), lam(0x555555), mtx(cx + w / 2 - 1, h + 1.5, cz - d / 2 + 1, 1, 1, 1), false);
  // rooftop ambush spots behind the parapet, one per facing
  roofSpots.push({ x: cx + rand(-w / 4, w / 4), y: h, z: cz + d / 2 - 1.1, ry: 0, used: false });
  if (w > 11) roofSpots.push({ x: cx + w / 2 - 1.1, y: h, z: cz + rand(-d / 4, d / 4), ry: PI / 2, used: false });
  if (d > 11) roofSpots.push({ x: cx - w / 2 + 1.1, y: h, z: cz + rand(-d / 4, d / 4), ry: -PI / 2, used: false });
}
function compound(cx, cz, size) {
  const t = .5, h = 2.7, c = lam(0xc7b28a), half = size / 2, gap = 3.6;
  const wall = (x, z, w, d) => destructible('cwall', GB, c, mtx(x, h / 2, z, w, h, d), x, z, w, d, h, 650, 'wall');
  // split long walls into segments so explosions breach them piece by piece
  const seg = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 4.5)), horiz = Math.abs(z1 - z0) < .01;
    for (let k = 0; k < n; k++) { const a = k / n, b = (k + 1) / n; const x = lerp(x0, x1, (a + b) / 2), z = lerp(z0, z1, (a + b) / 2), l = L / n; wall(x, z, horiz ? l : t, horiz ? t : l); }
  };
  seg(cx - half, cz - half, cx + half, cz - half);
  seg(cx - half, cz - half, cx - half, cz + half);
  seg(cx + half, cz - half, cx + half, cz + half);
  seg(cx - half, cz + half, cx - gap / 2, cz + half);
  seg(cx + gap / 2, cz + half, cx + half, cz + half);
  for (let k = 0; k < 3; k++) crate(cx + rand(-half + 2, half - 2), cz + rand(-half + 2, -1));
  if (R() < .6) barrel(cx + rand(-4, 4), cz + rand(-4, 4));
  spawnPts.push(new V3(cx, 0, cz));
}
function destructible(key, geo, mat, m4, cx, cz, w, d, h, hp, kind) {
  const ref = inst(key, geo, mat, m4); const c = addCol(cx, cz, w, d, h);
  const o = { ref, c, hp, hp0: hp, kind, x: cx, z: cz, h, alive: true, mat4: m4.clone() }; c.destr = o; destructibles.push(o); return o;
}
function resetWorldState() {
  for (const o of destructibles) { if (!o.alive) { o.alive = true; o.c.on = true; const im = BATCH[o.ref.key]; im.setMatrixAt(o.ref.idx, o.mat4); im.instanceMatrix.needsUpdate = true; } o.hp = o.hp0; }
  for (const b of barrels) { if (!b.alive) { b.alive = true; scene.add(b.m); } b.hp = 35; }
  for (const s of roofSpots) s.used = false;
  for (const c of coverPts) c.taken = null;
  scorchDecals.clear(); holeDecals.clear();
}
function crate(x, z) { destructible('crate', GB, lam(0x7d6640), mtx(x, .6, z, 1.2, 1.2, 1.2, (R() * 4 | 0) * PI / 2), x, z, 1.2, 1.2, 1.2, 160, 'crate'); }
function sandbags(x, z, len, vertical) {
  const w = vertical ? .95 : len, d = vertical ? len : .95;
  destructible('sb', GB, lam(0xa69264), mtx(x, .55, z, w, 1.1, d), x, z, w, d, 1.1, 420, 'sandbags');
  inst('sbTop', GB, lam(0xb19d6d), mtx(x, 1.16, z, w * .96, .14, d * .8), false);
}
function barrier(x, z, vertical) {
  const w = vertical ? .65 : 3, d = vertical ? 3 : .65;
  destructible('jb', GB, lam(0xa9a59b), mtx(x, .55, z, w, 1.1, d), x, z, w, d, 1.1, 500, 'barrier');
  inst('jbBase', GB, lam(0x9b978d), mtx(x, .15, z, vertical ? .95 : 3, .3, vertical ? 3 : .95), false);
}
function barrel(x, z) {
  const m = new THREE.Mesh(cylG(.32, .32, .95, 12), lam(0x9a2c1e)); m.position.set(x, .475, z); m.castShadow = true; scene.add(m);
  const band = new THREE.Mesh(cylG(.325, .325, .1, 12), lam(0xd9c25a)); band.position.y = .15; m.add(band);
  barrels.push({ m, x, z, hp: 35, alive: true });
}
function palm(x, z) {
  const h = rand(6, 9.5), lean = rand(-.18, .18), ry = rand(0, TAU);
  const tx = x + Math.sin(ry) * Math.sin(lean) * h, tz = z + Math.cos(ry) * Math.sin(lean) * h, ty = h * Math.cos(lean);
  inst('trunk', cylG(.17, .27, 1, 7), lam(0x7a6548), mtx((x + tx) / 2, ty / 2, (z + tz) / 2, 1, h, 1, ry, lean));
  for (let k = 0; k < 10; k++) {
    const a = k / 10 * TAU + rand(-.2, .2), len = rand(2.6, 3.6);
    inst('frond', GB, lam(k % 2 ? 0x5a7631 : 0x4b6629), mtx(tx + Math.sin(a) * len * .45, ty - .35, tz + Math.cos(a) * len * .45, .55, .05, len, a, rand(.3, .6)));
  }
  inst('nut', sphG(.38, 8), lam(0x6b4a22), mtx(tx, ty - .25, tz, 1, .8, 1));
}
function burntCar(x, z, ry) {
  const c = lam(0x3c352d);
  inst('carB', GB, c, mtx(x, .7, z, 1.9, .85, 4.3, ry)); inst('carC', GB, lam(0x2a2520), mtx(x, 1.4, z - .2, 1.75, .65, 2.2, ry));
  const s = Math.abs(Math.sin(ry)), cc = Math.abs(Math.cos(ry));
  addCol(x, z, 1.9 * cc + 4.3 * s, 4.3 * cc + 1.9 * s, 1.3);
}
function plaza(cx, cz) {
  for (let k = 0; k < ri(1, 3); k++) palm(cx + rand(-8, 8), cz + rand(-8, 8));
  if (R() < .45) burntCar(cx + rand(-5, 5), cz + rand(-5, 5), R() < .5 ? rand(-.3, .3) : PI / 2 + rand(-.3, .3));
  if (R() < .6) { sandbags(cx + rand(-4, 4), cz + rand(-4, 4), 4, R() < .5); }
  if (R() < .5) barrel(cx + rand(-6, 6), cz + rand(-6, 6));
  if (R() < .4) crate(cx + rand(-6, 6), cz + rand(-6, 6));
  spawnPts.push(new V3(cx, 0, cz));
}
function buildTown() {
  bMats = B_COLS.map(c => surf({ color: col(c), map: texConc }));
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 2; j++) {
    if (i === 0 || j === -1) continue;
    const key = i + ',' + j, cx = i * 24, cz = j * 24;
    if (RESERVED.has(key)) { if (key === '-4,-2') compound(cx, cz, 18); else plaza(cx, cz); continue; }
    const r = R();
    if (r < .72) building(cx + rand(-2, 2), cz + rand(-2, 2), rand(9, 15.5), rand(9, 15.5), ri(1, 3));
    else if (r < .86) compound(cx, cz, rand(14, 18));
    else plaza(cx, cz);
  }
  for (let i = -5; i <= 4; i++) for (let j = -6; j <= 2; j++) spawnPts.push(new V3(i * 24 + 12, 0, j * 24 + 12));
  for (let z = -130; z <= 40; z += 24) spawnPts.push(new V3(0, 0, z + 12));
  // checkpoint barriers and sandbag posts along the main roads
  barrier(-6, 50, false); barrier(6, 46, false); barrier(-3, -60, true); barrier(30, -24, true); barrier(-40, -21, false);
  sandbags(9, -50, 4, true); sandbags(-9, -90, 4, true); sandbags(60, -28, 5, false); sandbags(-70, -20, 5, false);
  sandbags(-14, 62, 5, false); sandbags(16, 64, 5, false); sandbags(40, 58, 4, false); sandbags(-44, 58, 4, false);
  // power poles with sagging lines along the main axis
  const wireMat = new THREE.LineBasicMaterial({ color: col(0x2b2b2b) });
  for (const side of [-6.5, 6.5]) {
    const pts = [];
    for (let z = -132; z <= 84; z += 27) {
      inst('pole', cylG(.13, .17, 9, 6), lam(0x5d5345), mtx(side, 4.5, z, 1, 1, 1));
      inst('xarm', GB, lam(0x5d5345), mtx(side, 8.4, z, 1.6, .12, .12));
      if (pts.length) { const p0 = pts[pts.length - 1]; for (let k = 1; k < 8; k++) { const t = k / 8; pts.push(new V3(side, 8.3 - Math.sin(t * PI) * .9, lerp(p0.z, z, t))); } }
      pts.push(new V3(side, 8.3, z));
    }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
  }
  // burning buildings: persistent smoke columns
  smokeCols.push(new V3(-42, 7, -70), new V3(58, 6, -34), new V3(18, 5, -104), new V3(-90, 3, 10));
}

/* ---------- forward operating base ---------- */
function container(x, z, ry, c, y = 0) {
  const geo = container.geo || (container.geo = boxUV(12.2, 2.6, 2.45, 2.4));
  const m = new THREE.Mesh(geo, surf({ color: col(c), map: texCont }));
  m.position.set(x, y + 1.3, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; scene.add(m);
  const v = Math.abs(Math.sin(ry)) > .5; addCol(x, z, v ? 2.45 : 12.2, v ? 12.2 : 2.45, y + 2.6, y);
}
function buildBase() {
  const hm = surf({ map: texHesco, color: col(0xffffff) });
  const hesco = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 1.2), horiz = Math.abs(z1 - z0) < .1;
    for (let k = 0; k < n; k++) { const t = (k + .5) / n; inst('hesco', GB, hm, mtx(lerp(x0, x1, t), .8, lerp(z0, z1, t), 1.14, 1.6, 1.14)); }
    addCol((x0 + x1) / 2, (z0 + z1) / 2, horiz ? L : 1.2, horiz ? 1.2 : L, 1.6);
  };
  hesco(-62, 92, -9, 92); hesco(9, 92, 62, 92); hesco(-62, 92, -62, 152); hesco(62, 92, 62, 152); hesco(-62, 152, 62, 152);
  const CC = [0xd2a73a, 0x3e7b4f, 0xcbbd9f, 0x8f3d2c, 0x2c5b88, 0xc8b79a];
  container(-46, 100, 0, CC[0]); container(-46, 103, 0, CC[1]); container(-46, 100, 0, CC[2], 2.6);
  container(-46, 113, 0, CC[3]); container(46, 101, 0, CC[4]); container(46, 104.5, 0, CC[0]); container(46, 101, 0, CC[5], 2.6);
  container(52, 128, PI / 2, CC[1]); container(-24, 146, 0, CC[2]); container(26, 146, 0, CC[3]); container(36, 118, 0, CC[2]);
  // tents
  for (const [x, z] of [[-18, 136], [-6, 140], [14, 132]]) {
    inst('tent', GB, lam(0xa2946e), mtx(x, 1.2, z, 6, 2.4, 8));
    inst('roof', cylG(3.4, 3.4, 8, 3), lam(0x958760), mtx(x, 3.1, z, 1, 1, .45, 0, -PI / 2, 0));
    addCol(x, z, 6, 8, 3);
  }
  // watch towers
  for (const [x, z] of [[-58, 96], [58, 96]]) {
    for (const [dx, dz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) inst('twLeg', GB, lam(0x6b5a40), mtx(x + dx, 3, z + dz, .2, 6, .2));
    inst('twBox', GB, lam(0xb19a6c), mtx(x, 6.6, z, 3.2, 1.3, 3.2)); inst('twRoof', GB, lam(0x7a6a4c), mtx(x, 8.6, z, 3.6, .2, 3.6));
    addCol(x, z, 2.6, 2.6, 9);
  }
  // helipad with parked Black Hawk
  const pad = new THREE.Mesh(new THREE.CircleGeometry(9, 32), surf({ color: col(0x77726a), polygonOffset: true, polygonOffsetFactor: -1 }));
  pad.rotation.x = -PI / 2; pad.position.set(-34, .04, 126); pad.receiveShadow = true; scene.add(pad);
  inst('padH', GB, lam(0xf2efe6), mtx(-34, .06, 126, .7, .02, 6), false); inst('padH', GB, lam(0xf2efe6), mtx(-32.2, .06, 126, .7, .02, 6), false); inst('padH', GB, lam(0xf2efe6), mtx(-33.1, .06, 126, 1.8, .02, .7), false);
  parkedHeli = shadows(bBlackHawk(), true, false); parkedHeli.position.set(-33.1, 1.6, 126); parkedHeli.rotation.y = PI * .92; scene.add(parkedHeli);
  addCol(-33.1, 126, 3, 9, 3);
  // Humvee with remote weapon station
  const hv = shadows(bHumvee(), true, false); hv.position.set(12, 0, 110); hv.rotation.y = PI * .88; scene.add(hv); addCol(12, 110, 3, 5.2, 2.6);
  const hv2 = shadows(bHumvee(), true, false); hv2.position.set(-14, 0, 112); hv2.rotation.y = PI * 1.1; scene.add(hv2); addCol(-14, 112, 3, 5.2, 2.6);
  // ammo / armory crates
  for (const [x, z] of [[-5, 104], [24, 112]]) {
    const g = new THREE.Group(); box(g, 1.8, .9, 1.1, 0x44502f, 0, .45, 0); box(g, 1.82, .12, 1.12, 0xc9a23a, 0, .6, 0); box(g, .3, .3, .02, 0xf0e6c8, 0, .45, .56);
    shadows(g); g.position.set(x, 0, z); scene.add(g); addCol(x, z, 1.8, 1.1, .9); ammoCrates.push(new V3(x, 0, z));
  }
  sandbags(-9, 89, 4, false); sandbags(9, 89, 4, false); barrier(-7, 82, false);
  // flag
  inst('fpole', cylG(.07, .09, 11, 8), lam(0xcfcfcf), mtx(0, 5.5, 146, 1, 1, 1));
  const ft = ctex(256, (g, s) => {
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, s, s); g.fillStyle = '#1f4fa8'; g.fillRect(0, s * .1, s, s * .12); g.fillRect(0, s * .78, s, s * .12);
    g.strokeStyle = '#1f4fa8'; g.lineWidth = s * .03; const cx = s / 2, cy = s / 2, r = s * .17;
    for (const o of [0, PI]) { g.beginPath(); for (let k = 0; k < 3; k++) { const a = o - PI / 2 + k * TAU / 3; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); }
  }, true, false);
  const fg = new THREE.PlaneGeometry(3.6, 2.6, 14, 6); fg.translate(1.8, 0, 0);
  flag = new THREE.Mesh(fg, surf({ map: ft, side: THREE.DoubleSide })); flag.position.set(.08, 9.6, 146); flag.castShadow = true; scene.add(flag);
  flagBase = Float32Array.from(fg.attributes.position.array);
}
function buildProps() {
  // beach: wrecked boats and concrete blocks
  for (let k = 0; k < 7; k++) { const x = rand(-130, 130), z = rand(-146, -142); inst('block', GB, lam(0xa8a293), mtx(x, .4, z, 2, .8, 1.2, rand(0, PI))); }
  for (const x of [-100, 40, 115]) { inst('boat', GB, lam(0xe9e4d6), mtx(x, -.2, -149, 2.2, 1, 7, rand(-.4, .4), 0, .25)); }
  // field between town and base
  for (let k = 0; k < 10; k++) palm(rand(-130, 130), rand(78, 88));
  for (let k = 0; k < 6; k++) palm(rand(-140, 140), rand(-128, -122));
  burntCar(-70, 74, .4); burntCar(84, 66, 1.7);
  crate(-30, 66); crate(32, 76); barrel(-58, 70); barrel(70, 80); barrel(12, 60);
  // distant ridge silhouettes beyond the dunes
  for (let k = 0; k < 26; k++) { const a = k / 26 * PI + rand(-.05, .05); const r = rand(520, 700); inst('ridge', sphG(1, 10), lam(0xbda57a), mtx(Math.cos(a) * r, -5, Math.sin(a) * r * .9 + 60, rand(50, 120), rand(18, 46), rand(40, 80)), false); }
}
function buildShips() {
  const defs = [[-90, -300, PI / 2 + .1], [110, -360, -PI / 2 + .25], [10, -470, PI / 2 - .2]];
  for (const [x, z, ry] of defs) { const s = bShip(); s.position.set(x, -1, z); s.rotation.y = ry; scene.add(s); ships.push({ g: s, ph: R() * TAU, gun: s.userData.gun }); }
}

/* ---------- cover points (outside faces of solid geometry) ---------- */
function buildCover() {
  for (const c of colliders) {
    if (c.y0 > 0 || c.h < 1) continue;
    const w = c.x1 - c.x0, d = c.z1 - c.z0;
    if (w > 30 || d > 30) continue;
    const add = (x, z, nx, nz) => {
      if (x < BOUND.x0 + 2 || x > BOUND.x1 - 2 || z < -140 || z > 150) return;
      if (blockedAt(x, z, .45, 0)) return;
      coverPts.push({ x, z, nx, nz, h: c.h, c, taken: null });
    };
    const off = .85;
    for (let t = c.x0 + .6; t <= c.x1 - .6; t += 3.5) { add(t, c.z1 + off, 0, 1); add(t, c.z0 - off, 0, -1); }
    for (let t = c.z0 + .6; t <= c.z1 - .6; t += 3.5) { add(c.x1 + off, t, 1, 0); add(c.x0 - off, t, -1, 0); }
  }
}

/* ---------- destruction & barrels ---------- */
function damageDestructibles(p, r, dmg) {
  for (const o of destructibles) {
    if (!o.alive) continue;
    const d = Math.hypot(o.x - p.x, o.z - p.z);
    if (d > r + 1.5) continue;
    o.hp -= dmg * clamp(1 - d / (r + 1.5), .2, 1);
    if (o.hp <= 0) {
      o.alive = false; o.c.on = false; hideInstance(o.ref);
      const s = o.kind === 'wall' ? 1 : .7;
      for (let i = 0; i < 12; i++) smoke.spawn(o.x + rand(-1, 1), rand(.3, o.h), o.z + rand(-1, 1), rand(-3, 3), rand(1, 4), rand(-3, 3), rand(1.5, 2.5) * s, 2.5, rand(1.5, 3), o.kind === 'sandbags' ? C_DUST : C_CONC, .8, 1.5, -.5);
      for (let i = 0; i < 14; i++) smoke.spawn(o.x, o.h * .6, o.z, rand(-7, 7), rand(3, 9), rand(-7, 7), rand(.2, .45), 0, rand(1, 1.8), C_DEBRIS, 1, .3, -22);
    }
  }
}
function hitBarrel(b, dmg, src) {
  if (!b.alive) return; b.hp -= dmg;
  if (b.hp <= 0) { b.alive = false; later(.06, () => { scene.remove(b.m); explode(_tv.set(b.x, .6, b.z).clone(), 230, 6.5, 'neutral', src); for (let i = 0; i < 6; i++) fire.spawn(b.x, 1, b.z, rand(-2, 2), rand(3, 7), rand(-2, 2), 2, 2, rand(1, 2), C_FIRE, .9, 1, 1, 0, 1); }); }
}
function damageBarrels(p, r, src) { for (const b of barrels) if (b.alive && Math.hypot(b.x - p.x, b.z - p.z) < r) hitBarrel(b, 200, src); }

/* ---------- ambient animation ---------- */
let smokeColT = 0, hazeT = 0;
function updateWorld(dt) {
  const t = G.time;
  skyMesh.position.copy(camera.position);
  updateWater(t);
  if (flag) {
    const a = flag.geometry.attributes.position; const arr = a.array;
    for (let i = 0; i < arr.length; i += 3) { const x = flagBase[i]; arr[i + 2] = Math.sin(x * 1.8 - t * 6) * .16 * (x / 3.6) + Math.sin(flagBase[i + 1] * 2 + t * 3) * .04 * (x / 3.6); }
    a.needsUpdate = true;
  }
  for (const s of ships) { s.g.position.y = -1 + Math.sin(t * .6 + s.ph) * .35; s.g.rotation.z = Math.sin(t * .45 + s.ph) * .025; }
  if (parkedHeli) parkedHeli.userData.rot.rotation.y += dt * .4;
  smokeColT -= dt;
  if (smokeColT <= 0) {
    smokeColT = .16;
    for (const p of smokeCols) {
      smoke.spawn(p.x + rand(-1, 1), p.y, p.z + rand(-1, 1), rand(.6, 1.6), rand(2.5, 4), rand(-.4, .4), rand(2.5, 4), 2.6, rand(8, 11), R() < .7 ? C_SMOKE_D : C_SMOKE, .7, .05, 0, 1);
      if (R() < .5) fire.spawn(p.x + rand(-1, 1), p.y - .5, p.z + rand(-1, 1), 0, rand(1, 2.5), 0, rand(1.2, 2), .5, rand(.4, .8), C_FIRE, .7, 1, 0, 0, 2);
    }
  }
  // low drifting haze around the viewer for depth
  hazeT -= dt;
  if (hazeT <= 0 && settings.quality !== 'low') {
    hazeT = .35;
    const a = R() * TAU, r = rand(25, 140);
    smoke.spawn(camera.position.x + Math.cos(a) * r, rand(.5, 3), camera.position.z + Math.sin(a) * r, rand(.5, 1.5), 0, rand(-.3, .3), rand(12, 20), 1.2, rand(14, 20), C_DUST, .05, 0, 0, 5);
  }
}

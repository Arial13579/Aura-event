'use strict';
/* =====================================================================
   BattlefieldManager.js — combined arms: Merkava & T-72 tanks, BTR APC,
   technicals, rocket launchers, Black Hawk / Apache / Mi-24 helicopters,
   F-16 airstrikes, offshore corvettes, projectiles, explosions,
   killstreaks and the ambient war-zone (artillery flashes & flares).
   ===================================================================== */
const vehicles = [], projs = [], jets = [];

/* ---------- vehicle models ---------- */
function wheels(g, xs, zs, r, w, c) { for (const x of xs) for (const z of zs) cyl(g, r, r, w, c, x, r, z, 0, 0, PI / 2, 12); }
function bMerkava() {
  const g = new THREE.Group(), c = 0x8e8768, dk = 0x5b5745, tr = 0x2b2a26;
  box(g, 3.3, .9, 7.2, c, 0, .95, 0); box(g, 3.7, .55, 7.0, c, 0, 1.6, -.2); box(g, 3.7, .6, 1.9, c, 0, 1.3, 3.6, .42);
  box(g, .14, .78, 7.2, dk, 1.92, 1.05, 0); box(g, .14, .78, 7.2, dk, -1.92, 1.05, 0);
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) cyl(g, .38, .38, .32, tr, s * 1.55, .42, -2.8 + k * 1.12, 0, 0, PI / 2, 10);
  box(g, .55, .12, 7.4, tr, 1.55, .06, 0); box(g, .55, .12, 7.4, tr, -1.55, .06, 0);
  const tur = new THREE.Group(); tur.position.set(0, 2.15, -.5); g.add(tur);
  box(tur, 2.7, .72, 3.4, c, 0, .05, -.2); box(tur, 2.3, .52, 2.1, c, 0, -.02, 2.2, .3); box(tur, 2.9, .62, 1.3, c, 0, 0, -2.45);
  for (let k = 0; k < 9; k++) sph(tur, .07, 0x3c3a32, -1.4 + k * .35, -.45, -3.12, 1, 1, 1, 6);
  cyl(tur, .34, .34, .3, c, .65, .52, -.4); box(tur, .08, .08, 1.0, tr, .65, .78, 0);
  cyl(tur, .25, .25, .4, c, -.7, .45, -.9); box(tur, .5, .35, .5, dk, -.9, .5, .7);
  const gun = new THREE.Group(); gun.position.set(0, .05, 1.6); tur.add(gun);
  cyl(gun, .12, .12, 5.6, dk, 0, 0, 2.8, PI / 2); cyl(gun, .17, .17, 1.5, c, 0, 0, 2.3, PI / 2); cyl(gun, .15, .15, .5, dk, 0, 0, 5.4, PI / 2);
  g.userData = { tur, gun, muzzleZ: 5.8, gunZ0: 1.6 }; return g;
}
function bT72() {
  const g = new THREE.Group(), c = 0x4d5636, dk = 0x2f3324, tr = 0x232320;
  box(g, 3.3, .85, 6.6, c, 0, .9, 0); box(g, 3.5, .3, 6.4, c, 0, 1.45, 0); box(g, 3.3, .6, 1.5, c, 0, 1.12, 3.3, .6);
  box(g, .1, .6, 6.4, dk, 1.78, 1.05, 0); box(g, .1, .6, 6.4, dk, -1.78, 1.05, 0);
  for (const s of [-1, 1]) for (let k = 0; k < 6; k++) cyl(g, .42, .42, .3, tr, s * 1.5, .45, -2.6 + k * 1.04, 0, 0, PI / 2, 10);
  cyl(g, .3, .3, 1.2, dk, .7, 1.75, -3.35, 0, 0, PI / 2); cyl(g, .3, .3, 1.2, dk, -.7, 1.75, -3.35, 0, 0, PI / 2);
  const tur = new THREE.Group(); tur.position.set(0, 1.78, .2); g.add(tur);
  sph(tur, 1.3, c, 0, 0, 0, 1.1, .42, 1.25, 16); cyl(tur, .3, .3, .25, c, .5, .45, -.3); box(tur, .07, .07, .9, tr, .5, .65, .1);
  const gun = new THREE.Group(); gun.position.set(0, .08, 1.3); tur.add(gun);
  cyl(gun, .11, .11, 5.4, dk, 0, 0, 2.7, PI / 2); cyl(gun, .15, .15, .6, dk, 0, 0, 1.6, PI / 2); cyl(gun, .15, .15, .5, dk, 0, 0, 3.4, PI / 2);
  g.userData = { tur, gun, muzzleZ: 5.4, gunZ0: 1.3 }; return g;
}
function bAPC() {
  const g = new THREE.Group(), c = 0x5a6040, dk = 0x2e3226;
  box(g, 2.8, 1.3, 7, c, 0, 1.55, 0); box(g, 2.6, .7, 1.4, c, 0, 1.45, 3.9, .7); box(g, 2.4, .5, 5, c, 0, 2.4, -.5);
  for (let k = 0; k < 4; k++) for (const s of [-1, 1]) cyl(g, .55, .55, .4, 0x1f1f1d, s * 1.35, .55, -2.6 + k * 1.75, 0, 0, PI / 2, 12);
  const tur = new THREE.Group(); tur.position.set(0, 2.85, .6); g.add(tur);
  cyl(tur, .6, .7, .7, c, 0, .2, 0, 0, 0, 0, 10);
  const gun = new THREE.Group(); gun.position.set(0, .3, .5); tur.add(gun); cyl(gun, .06, .06, 1.8, dk, 0, 0, .9, PI / 2);
  g.userData = { tur, gun, muzzleZ: 1.8, gunZ0: .5 }; return g;
}
function bTech() {
  const g = new THREE.Group(), c = 0xd3cdbd, dk = 0x2a2925, gl = 0x26303a;
  box(g, 1.9, .55, 4.8, c, 0, .85, 0); box(g, 1.8, .85, 1.7, c, 0, 1.55, .9); box(g, 1.7, .5, .05, gl, 0, 1.68, 1.77, -.3);
  box(g, 1.8, .4, 1.2, c, 0, 1.25, 2.05); box(g, .08, .4, 2.5, c, .9, 1.3, -1.1); box(g, .08, .4, 2.5, c, -.9, 1.3, -1.1); box(g, 1.8, .4, .08, c, 0, 1.3, -2.36);
  wheels(g, [-.95, .95], [-1.5, 1.6], .4, .3, 0x1d1d1b);
  const tur = new THREE.Group(); tur.position.set(0, 1.6, -1.2); g.add(tur);
  cyl(tur, .06, .06, .8, dk, 0, .4, 0); const gun = new THREE.Group(); gun.position.set(0, .85, 0); tur.add(gun);
  box(gun, .08, .1, 1.4, dk, 0, 0, .45); box(gun, .6, .4, .05, dk, 0, .1, .1);
  box(tur, .4, .55, .25, 0x3d3a33, 0, .55, -.45); box(tur, .22, .24, .22, 0x1f1e1c, 0, .95, -.45); box(tur, .24, .05, .24, 0x3d7a32, 0, 1.03, -.45);
  g.userData = { tur, gun, muzzleZ: 1.2, gunZ0: 0 }; return g;
}
function bLauncher() {
  const g = new THREE.Group(), c = 0x5f6342, dk = 0x2a2a26;
  box(g, 2.3, 1.5, 1.9, c, 0, 1.6, 2.7); box(g, 2.1, .5, .05, 0x26303a, 0, 1.95, 3.66, -.2); box(g, 2.3, .5, 6.6, dk, 0, .8, 0);
  wheels(g, [-1.05, 1.05], [-2.2, -1, 2.5], .5, .35, 0x1d1d1b);
  const rack = new THREE.Group(); rack.position.set(0, 1.25, -1.2); rack.rotation.x = -.5; g.add(rack);
  box(rack, 2.1, 1.15, 3.3, c, 0, .58, 0);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) cyl(rack, .15, .15, 3.32, dk, -.72 + k * .48, .22 + r * .36, 0, PI / 2, 0, 0, 8);
  g.userData = { rack }; return g;
}
function bHumvee() {
  const g = new THREE.Group(), c = 0xb3a27a, dk = 0x2a2925, gl = 0x26303a;
  box(g, 2.2, .95, 4.8, c, 0, 1.0, 0); box(g, 2.1, .5, 1.6, c, 0, 1.55, 1.55, .1); box(g, 1.6, .5, .06, dk, 0, 1.2, 2.42);
  box(g, 2.12, .95, 2.5, c, 0, 2.0, -.3); box(g, 1.9, .5, .05, gl, 0, 2.15, .96, -.12);
  for (const s of [-1, 1]) { box(g, .05, .45, .7, gl, s * 1.07, 2.1, .3); box(g, .05, .45, .7, gl, s * 1.07, 2.1, -.7); }
  wheels(g, [-1.05, 1.05], [-1.6, 1.6], .48, .36, 0x1d1d1b);
  cyl(g, .6, .6, .3, c, 0, 2.62, -.4); box(g, .62, .45, .5, c, 0, 3.0, -.4); box(g, .25, .25, .26, dk, .36, 3.05, -.2);
  cyl(g, .045, .045, 1.3, dk, -.1, 3.0, .35, PI / 2); sph(g, .12, 0xf0eee0, .7, 2.6, 1.1, 1, 1, .6, 8);
  return g;
}
function bBlackHawk() {
  const g = new THREE.Group(), c = 0x3d4136, dk = 0x26282a, gl = 0x1a2230;
  box(g, 2.2, 2.0, 5.2, c, 0, 0, 0); sph(g, 1.1, c, 0, -.05, 2.6, 1, .95, 1.5); box(g, 1.9, .7, 1.2, gl, 0, .45, 3.0, -.5);
  box(g, .05, .9, 1.4, gl, 1.11, .2, .7); box(g, .05, .9, 1.4, gl, -1.11, .2, .7);
  box(g, 1.6, .7, 3.2, c, 0, 1.25, -.4); cyl(g, .55, .28, 7.5, c, 0, .5, -6.2, PI / 2, 0, 0, 10);
  box(g, .15, 2.2, 1.3, c, 0, 1.5, -9.6, .35); box(g, 3.2, .1, .8, c, 0, .6, -9.3);
  const tr = new THREE.Group(); tr.position.set(.24, 1.7, -9.8); g.add(tr); box(tr, .05, 2.6, .18, dk); box(tr, .05, .18, 2.6, dk);
  const rot = new THREE.Group(); rot.position.set(0, 1.95, 0); g.add(rot); cyl(rot, .25, .25, .4, dk);
  for (let k = 0; k < 2; k++) box(rot, .55, .06, 16, dk, 0, .12, 0, 0, k * PI / 2);
  for (const s of [-1, 1]) { cyl(g, .3, .3, .25, dk, s * 1.1, -1.3, 1.6, 0, 0, PI / 2); box(g, .08, .5, .08, dk, s * 1.1, -1.0, 1.6); }
  cyl(g, .05, .05, 1.1, dk, 1.2, .1, .9, PI / 2);
  g.userData = { rot, tr }; return g;
}
function bApache() {
  const g = new THREE.Group(), c = 0x5b5a48, dk = 0x2a2a26, gl = 0x1d252e;
  box(g, 1.1, 1.3, 4.8, c, 0, 0, 0); box(g, .9, .8, 1.7, c, 0, -.1, 3.0); sph(g, .45, c, 0, -.1, 3.9, 1, 1, 1.2);
  box(g, .85, .6, 1.1, gl, 0, .72, 2.35, -.15); box(g, .85, .7, 1.2, gl, 0, .95, 1.1, -.1);
  cyl(g, .38, .38, 2.2, c, .95, .55, -.4, PI / 2); cyl(g, .38, .38, 2.2, c, -.95, .55, -.4, PI / 2);
  box(g, 4.6, .12, .9, c, 0, .05, 0);
  for (const s of [-1, 1]) { cyl(g, .25, .25, 1.2, dk, s * 1.95, -.35, 0, PI / 2, 0, 0, 10); box(g, .3, .3, 1.1, dk, s * 1.3, -.35, 0); }
  box(g, .5, .6, 6, c, 0, .4, -5.2); box(g, .12, 2.2, 1.2, c, 0, 1.4, -8, .3); box(g, 2.4, .08, .7, c, 0, .3, -8.2);
  const tr = new THREE.Group(); tr.position.set(.2, 1.9, -8.3); g.add(tr); box(tr, .05, 2.2, .16, dk); box(tr, .05, .16, 2.2, dk);
  cyl(g, .12, .12, .9, dk, 0, 1.3, 0); sph(g, .48, c, 0, 2.3, 0, 1, .42, 1, 14);
  const rot = new THREE.Group(); rot.position.set(0, 1.85, 0); g.add(rot); for (let k = 0; k < 2; k++) box(rot, .5, .06, 14.6, dk, 0, 0, 0, 0, k * PI / 2);
  sph(g, .22, dk, 0, -.62, 2.8); cyl(g, .05, .05, 1.1, dk, 0, -.7, 3.35, PI / 2);
  for (const s of [-1, 1]) cyl(g, .2, .2, .2, dk, s * .6, -.9, 1.5, 0, 0, PI / 2);
  g.userData = { rot, tr }; return g;
}
function bHind() {
  const g = new THREE.Group(), c = 0x4c533f, dk = 0x2a2c27, gl = 0x22303c;
  box(g, 2.2, 2.2, 6, c, 0, 0, 0); box(g, 1.6, 1.4, 2, c, 0, -.3, 3.6); sph(g, .75, gl, 0, .1, 4.3, 1, .8, 1.1); sph(g, .8, gl, 0, .75, 2.9, 1, .8, 1.2);
  box(g, 2.2, .9, 3.5, c, 0, 1.4, -.2); cyl(g, .6, .3, 7.5, c, 0, .4, -6.5, PI / 2, 0, 0, 10); box(g, .15, 2.4, 1.4, c, 0, 1.5, -10, .35);
  for (const s of [-1, 1]) { box(g, 3, .15, 1.4, c, s * 2.6, -.25, -.2, 0, 0, s * .15); cyl(g, .3, .3, 1.3, dk, s * 3.2, -.6, -.2, PI / 2, 0, 0, 10); cyl(g, .26, .26, 1.1, dk, s * 2.2, -.55, -.2, PI / 2, 0, 0, 10); }
  const tr = new THREE.Group(); tr.position.set(-.25, 1.7, -10.2); g.add(tr); box(tr, .05, 2.6, .18, dk); box(tr, .05, .18, 2.6, dk);
  const rot = new THREE.Group(); rot.position.set(0, 2.1, 0); g.add(rot); cyl(rot, .3, .3, .5, dk);
  for (let k = 0; k < 5; k++) { const b = new THREE.Group(); b.rotation.y = k * TAU / 5; rot.add(b); box(b, .6, .07, 8.5, dk, 0, .1, 4.25); }
  sph(g, .25, dk, 0, -.9, 4.4);
  g.userData = { rot, tr }; return g;
}
function bF16() {
  const g = new THREE.Group(), c = 0x8c949b, dk = 0x4b5056;
  cyl(g, .55, .65, 10, c, 0, 0, 0, PI / 2, 0, 0, 10); cyl(g, 0, .55, 3, c, 0, 0, 6.5, PI / 2, 0, 0, 10);
  sph(g, .5, 0x23303a, 0, .55, 3.2, .8, .7, 2.2); box(g, 1.1, .7, 3, dk, 0, -.65, 2);
  const wing = new THREE.Shape(); wing.moveTo(0, 2.5); wing.lineTo(4.8, -1.4); wing.lineTo(4.8, -2.1); wing.lineTo(0, -2.3);
  const wg = new THREE.ExtrudeGeometry(wing, { depth: .12, bevelEnabled: false }); wg.rotateX(PI / 2);
  const wm = new THREE.MeshLambertMaterial({ color: col(c), side: THREE.DoubleSide });
  const w1 = new THREE.Mesh(wg, wm); w1.position.set(.4, 0, -.8); g.add(w1);
  const w2 = new THREE.Mesh(wg, wm); w2.scale.x = -1; w2.position.set(-.4, 0, -.8); g.add(w2);
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(2.2, 0); fin.lineTo(2.6, 2.6); fin.lineTo(1.6, 2.6);
  const fg = new THREE.ExtrudeGeometry(fin, { depth: .1, bevelEnabled: false }); fg.rotateY(PI / 2);
  const f = new THREE.Mesh(fg, wm); f.position.set(-.05, .4, -2.8); g.add(f);
  const s1 = new THREE.Mesh(wg, wm); s1.scale.set(.45, 1, .45); s1.position.set(.3, 0, -4.4); g.add(s1);
  const s2 = new THREE.Mesh(wg, wm); s2.scale.set(-.45, 1, .45); s2.position.set(-.3, 0, -4.4); g.add(s2);
  const ab = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFlash, color: new THREE.Color(6, 3, 1.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  ab.position.set(0, 0, -5.4); ab.scale.setScalar(2.4); g.add(ab);
  g.userData = { ab }; return g;
}
function bShip() {
  const g = new THREE.Group(), c = 0x737b82, dk = 0x4a5056, lt = 0x9aa1a6;
  const sh = new THREE.Shape(); sh.moveTo(-5, -30); sh.lineTo(5, -30); sh.lineTo(5.6, 10); sh.quadraticCurveTo(4, 26, 0, 36); sh.quadraticCurveTo(-4, 26, -5.6, 10); sh.lineTo(-5, -30);
  const hg = new THREE.ExtrudeGeometry(sh, { depth: 5, bevelEnabled: false }); hg.rotateX(-PI / 2);
  const hull = new THREE.Mesh(hg, lam(c)); hull.position.y = -2; g.add(hull);
  box(g, 10.6, .3, 60, dk, 0, 3.1, -3);
  box(g, 8, 4, 14, c, 0, 5, 4); box(g, 6, 3, 7, lt, 0, 8.5, 2); box(g, 6.2, .8, 2, 0x1f2a33, 0, 9, 5.6);
  cyl(g, .25, .4, 9, dk, 0, 14, 1); sph(g, 1.3, 0xd8dcde, 0, 17.5, 1); box(g, 3.4, .25, .5, dk, 0, 15.5, 1);
  box(g, 3, 1.4, 4, c, 0, 4, -14); box(g, 6, .6, 9, lt, 0, 3.4, 18);
  const gun = new THREE.Group(); gun.position.set(0, 4.2, -21); g.add(gun);
  box(gun, 2.6, 1.3, 3, c, 0, .4, 0); cyl(gun, .16, .16, 4.5, dk, 0, .5, -3.6, PI / 2);
  for (const s of [-1, 1]) box(g, .8, 1.6, 4, c, s * 3.5, 4.2, 12, 0, s * .3);
  g.userData = { gun }; return g;
}

/* ---------- vehicle class ---------- */
const VT = {
  merkava: { build: bMerkava, hp: 3400, rad: 4.2, sph: [[0, 1.3, 1.8, 2.2], [0, 1.3, -1.8, 2.2], [0, 2.4, -.5, 1.7]], armorB: .02, armorX: .45, range: 140, reload: 6.5, trav: .9, turn: .5, speed: 4, heavy: true, name: 'מרכבה סימן 4' },
  t72: { build: bT72, hp: 1400, rad: 4, sph: [[0, 1.2, 1.6, 2.1], [0, 1.2, -1.6, 2.1], [0, 2.1, .2, 1.6]], armorB: .03, armorX: 1, range: 125, reload: 7.5, trav: .7, turn: .6, speed: 5, heavy: true, name: 'טנק T-72' },
  apc: { build: bAPC, hp: 850, rad: 3.6, sph: [[0, 1.5, 1.7, 1.9], [0, 1.5, -1.7, 1.9]], armorB: .12, armorX: 1.1, range: 95, trav: 1.6, turn: .9, speed: 7, heavy: true, name: 'נגמ״ש BTR' },
  technical: { build: bTech, hp: 380, rad: 2.6, sph: [[0, 1.1, 1, 1.4], [0, 1.2, -1.2, 1.4]], armorB: .6, armorX: 1.5, range: 90, trav: 2.5, turn: 1.2, speed: 9, light: true, name: 'טנדר חמוש' },
  launcher: { build: bLauncher, hp: 560, rad: 3.2, sph: [[0, 1.4, 2.2, 1.6], [0, 1.6, -1.2, 1.9]], armorB: .35, armorX: 1.3, light: true, name: 'משגר רקטות' },
  blackhawk: { build: bBlackHawk, hp: 5000, rad: 5, sph: [[0, 0, .8, 2.2], [0, .3, -4, 1.4]], armorB: .05, armorX: .3, air: true, speed: 34, range: 90, name: 'בלאק הוק' },
  apache: { build: bApache, hp: 5000, rad: 4, sph: [[0, 0, .5, 1.8]], armorB: .05, armorX: .3, air: true, speed: 38, range: 150, name: 'אפאצ׳י' },
  hind: { build: bHind, hp: 1400, rad: 5, sph: [[0, 0, 1.5, 2.4], [0, .2, -3, 1.7]], armorB: .35, armorX: 1, air: true, speed: 30, range: 160, heavy: true, name: 'מסוק Mi-24' }
};
const _vv = new V3(), _vv2 = new V3(), _vv3 = new V3();
function vehSphere(v, s, out) {
  const a = v.g.rotation.y, c = Math.cos(a), sn = Math.sin(a);
  return out.set(v.pos.x + s[0] * c + s[2] * sn, v.pos.y + s[1], v.pos.z - s[0] * sn + s[2] * c);
}
function pushFromVehicles(p, r) {
  for (const v of vehicles) {
    if (v.air) continue;
    const dx = p.x - v.pos.x, dz = p.z - v.pos.z, d = Math.hypot(dx, dz), m = v.rad * .8 + r;
    if (d < m && d > 1e-4) { p.x = v.pos.x + dx / d * m; p.z = v.pos.z + dz / d * m; }
  }
}
class Veh {
  constructor(type, team, x, z, yaw = 0, path = null, loop = false) {
    const T = VT[type]; this.T = T; this.type = type; this.team = team; this.isVeh = true;
    this.g = vehicleSkin(shadows(T.build(), true, false)); this.u = this.g.userData; this.g.rotation.order = 'YXZ';
    this.pos = this.g.position; this.air = !!T.air; this.pos.set(x, this.air ? 45 : 0, z); this.g.rotation.y = yaw;
    this.hp = this.max = T.hp; this.alive = true; this.rad = T.rad; this.armorB = T.armorB; this.armorX = T.armorX;
    this.path = path; this.loop = loop; this.pi = 0; this.speed = T.speed || 0;
    this.cd = rand(2, 4); this.cd2 = rand(1, 2); this.burst = 0; this.think = 0; this.target = null;
    this.vel = new V3(); this.mode = 'orbit'; this.center = new V3(); this.radius = 60; this.alt = 40; this.ang = R() * TAU; this.angSpd = .14;
    this.life = Infinity; this.burn = 0; this.holdT = 0; this.dest = new V3(); this.remove = false;
    scene.add(this.g); vehicles.push(this);
  }
  damage(a, src) {
    if (!this.alive || this.invuln) return;
    this.hp -= a; if (this.hp <= 0) this.destroy(src);
  }
  destroy(src) {
    this.alive = false; this.burn = 30;
    explode(this.pos.clone().setY(this.pos.y + 1.5), 160, 8, 'neutral', src, { s: this.air ? 2.2 : 2 });
    if (!this.air) {
      this.g.traverse(m => { if (m.isMesh) m.material = lam(0x22201b); });
      if (this.u.tur && this.T.heavy) { scene.attach(this.u.tur); this.detached = this.u.tur; this.pop ={ o: this.u.tur, v: new V3(rand(-3, 3), rand(9, 14), rand(-3, 3)), s: new V3(rand(-2, 2), rand(-4, 4), rand(-2, 2)) }; }
    } else { this.vel.y = Math.min(this.vel.y, 2); this.crash = true; }
    onVehicleDestroyed(this, src);
  }
  update(dt) { if (this.air) heliUpdate(this, dt); else groundUpdate(this, dt); }
}

/* ---------- ground vehicle AI ---------- */
function groundUpdate(v, dt) {
  if (!v.alive) {
    v.burn -= dt;
    if (v.burn > 0 && R() < dt * 9) { smoke.spawn(v.pos.x + rand(-1, 1), v.pos.y + 2, v.pos.z + rand(-1, 1), rand(.5, 1.5), rand(2, 4), rand(-.5, .5), 2.5, 2.5, rand(5, 8), C_SMOKE_D, .8, .1, 0, .6); if (R() < .5) fire.spawn(v.pos.x + rand(-1, 1), v.pos.y + 1.5, v.pos.z + rand(-1, 1), 0, rand(1, 3), 0, rand(1.2, 2), .6, rand(.4, .8), C_FIRE, .8, 1, 0, 0, 2); }
    if (v.pop) { const p = v.pop; p.v.y -= 22 * dt; p.o.position.addScaledVector(p.v, dt); p.o.rotation.x += p.s.x * dt; p.o.rotation.y += p.s.y * dt; if (p.o.position.y < .8) { p.o.position.y = .8; v.pop = null; } }
    return;
  }
  const T = v.T;
  v.think -= dt;
  if (v.think <= 0 && v.type !== 'launcher') { v.think = .5; v.target = findTarget(v, v.team, T.range, { veh: v.type !== 'technical' ? true : false, eye: 2.4, prefer: r => r.isVeh ? .5 : 1 }); }
  const t = isAlive(v.target) ? v.target : null;
  const engaged = t && dxz(t.pos, v.pos) < T.range * .6 && v.type !== 'technical';
  // drive the route
  if (v.path && !engaged) {
    const wp = v.path[v.pi], dx = wp[0] - v.pos.x, dz = wp[1] - v.pos.z, d = Math.hypot(dx, dz);
    if (d < 4) { v.pi++; if (v.pi >= v.path.length) { if (v.loop) v.pi = 0; else v.path = null; } }
    else {
      const dy = Math.atan2(dx, dz), diff = angDiff(dy, v.g.rotation.y);
      v.g.rotation.y += clamp(diff, -T.turn * dt, T.turn * dt);
      const s = v.speed * (Math.abs(diff) > .6 ? .35 : 1);
      v.pos.x += Math.sin(v.g.rotation.y) * s * dt; v.pos.z += Math.cos(v.g.rotation.y) * s * dt;
      if (R() < dt * 8) smoke.spawn(v.pos.x - Math.sin(v.g.rotation.y) * 3, .4, v.pos.z - Math.cos(v.g.rotation.y) * 3, rand(-.5, .5), rand(.3, 1), rand(-.5, .5), 1.4, 3, 2.2, C_DUST, .5, 1);
    }
  }
  if (v.type === 'launcher') { v.cd -= dt; if (v.cd <= 0) { v.cd = rand(14, 20); launchSkyRocket(v); } return; }
  v.cd -= dt; v.cd2 -= dt;
  const u = v.u;
  if (u.gun) u.gun.position.z = damp(u.gun.position.z, u.gunZ0, 4, dt);
  if (!t) return;
  const dx = t.pos.x - v.pos.x, dz = t.pos.z - v.pos.z, d = Math.hypot(dx, dz);
  const want = angDiff(Math.atan2(dx, dz) - v.g.rotation.y, 0), diff = angDiff(want, u.tur.rotation.y);
  u.tur.rotation.y += clamp(diff, -T.trav * dt, T.trav * dt);
  if (Math.abs(diff) > .08) return;
  if (v.type === 'technical' || v.type === 'apc') { if (v.cd2 <= 0) mgBurst(v, t, d, v.type === 'apc' ? 16 : 11, .28, .13); return; }
  if (v.cd <= 0 && (t.isVeh || R() < .5 || t === P)) { v.cd = T.reload * (v.team === 'ally' ? 1 : D().tank); tankFire(v, t, d); }
  else if (!t.isVeh && v.cd2 <= 0) mgBurst(v, t, d, v.team === 'ally' ? 22 : 9, .35, .09);
}
function mgBurst(v, t, d, dmg, acc, rate) {
  if (v.burst <= 0) v.burst = ri(6, 12);
  v.burst--; v.cd2 = v.burst > 0 ? rate : rand(1.2, 2.2);
  const mz = v.u.gun.localToWorld(_vv.set(0, 0, v.u.muzzleZ));
  _vv2.set(t.pos.x, aimYOf(t), t.pos.z);
  let a = acc * clamp(1.15 - d / 120, .2, 1); if (v.team === 'enemy') { a *= D().acc; if (t === P && P.stance) a *= .7; }
  const hit = R() < a;
  if (!hit) { _vv2.x += rand(-2, 2); _vv2.y += rand(-.5, 1.5); _vv2.z += rand(-2, 2); } else applyHit(t, dmg, v);
  tracers.spawn(mz, _vv2, v.team === 'ally' ? 'heavy' : 'enemy', .05); fxMuzzle(mz, 1); sfx('lmg', .9, mz);
  if (t === P && !hit && R() < .4) sfx('crack', .6);
}
function tankFire(v, t, d) {
  v.u.gun.updateWorldMatrix(true, false);
  const mz = v.u.gun.localToWorld(_vv.set(0, 0, v.u.muzzleZ)).clone();
  const tp = _vv2.set(t.pos.x, aimYOf(t) - (t.isVeh ? 0 : .9), t.pos.z);
  const err = v.team === 'enemy' ? (2.2 + d * .04) * D().tank : .6;
  tp.x += rand(-err, err); tp.z += rand(-err, err);
  const dir = _vv3.copy(tp).sub(mz).normalize();
  spawnProj('shell', mz, dir.multiplyScalar(240), v.team, v, { dmg: v.team === 'ally' ? 480 : 260, r: 6, life: 2 });
  fire.spawn(mz.x, mz.y, mz.z, 0, 0, 0, 5, 12, .12, C_CORE, 1);
  for (let i = 0; i < 12; i++) smoke.spawn(mz.x, mz.y, mz.z, dir.x * rand(10, 30) / 240 * 10 + rand(-2, 2), rand(0, 2), dir.z * rand(10, 30) / 240 * 10 + rand(-2, 2), 2, 4, rand(2, 4), C_SMOKE_L, .7, 1.5);
  for (let i = 0; i < 10; i++) { const a = R() * TAU; smoke.spawn(v.pos.x, .4, v.pos.z, Math.cos(a) * 10, .5, Math.sin(a) * 10, 2, 4, 1.8, C_DUST, .55, 2.5); }
  flashLight(mz, 6, .2, 40);
  sfx('tank', 1.3, mz);
  v.u.gun.position.z = v.u.gunZ0 - .7;
  const dc = camera.position.distanceTo(mz); G.shake = Math.max(G.shake, clamp(1 - dc / 70, 0, .7));
}
function launchSkyRocket(v) {
  const p = v.u.rack.localToWorld(_vv.set(rand(-.7, .7), .6, 1.7)).clone();
  spawnProj('sky', p, new V3(rand(-6, 6), 60, 40 + rand(-6, 6)), 'enemy', v, { life: 5 });
  sfx('rocket', 1.2, p); fxMuzzle(p, 2);
  for (let i = 0; i < 14; i++) smoke.spawn(p.x, p.y, p.z, rand(-4, 4), rand(0, 3), rand(-4, 4), 2, 4, 3, C_SMOKE_L, .8, 1.5);
}

/* ---------- helicopters ---------- */
function heliUpdate(v, dt) {
  const u = v.u;
  if (u.rot) u.rot.rotation.y += dt * 26; if (u.tr) u.tr.rotation.x += dt * 40;
  if (!v.alive) {
    if (v.crash) {
      v.vel.y -= 14 * dt; v.pos.addScaledVector(v.vel, dt); v.g.rotation.y += dt * 4.5; v.g.rotation.z = Math.sin(G.time * 3) * .3;
      smoke.spawn(v.pos.x, v.pos.y, v.pos.z, rand(-1, 1), rand(1, 2), rand(-1, 1), 2.5, 3, 3, C_SMOKE_D, .9, .5); fire.spawn(v.pos.x, v.pos.y, v.pos.z, 0, 0, 0, 2.5, 2, .3, C_FIRE, 1);
      const gh = groundH(v.pos.x, v.pos.z);
      if (v.pos.y < gh + 1.2) { v.crash = false; v.pos.y = gh + 1; explode(v.pos.clone(), 300, 10, 'neutral', null, { s: 2.6 }); v.g.traverse(m => { if (m.isMesh) m.material = lam(0x22201b); }); v.g.rotation.x = .2; v.burn = 30; v.air = false; }
    }
    return;
  }
  v.life -= dt;
  if (v.life <= 0 && v.mode !== 'leave') { v.mode = 'leave'; v.dest.set(v.pos.x * 2, 90, 900); }
  let tx, ty, tz;
  if (v.mode === 'orbit') { v.ang += v.angSpd * dt; tx = v.center.x + Math.cos(v.ang) * v.radius; tz = v.center.z + Math.sin(v.ang) * v.radius; ty = v.alt; }
  else { tx = v.dest.x; ty = v.dest.y; tz = v.dest.z; }
  if (v.mode === 'leave' && dxz(v.pos, v.dest) < 60) v.remove = true;
  if (v.mode === 'goto' && Math.hypot(tx - v.pos.x, tz - v.pos.z) < 3 && Math.abs(ty - v.pos.y) < 1.5 && v.onArrive) { const f = v.onArrive; v.onArrive = null; f(v); }
  const dx = tx - v.pos.x, dy = ty - v.pos.y, dz = tz - v.pos.z, dist = Math.hypot(dx, dy, dz);
  const sp = Math.min(v.T.speed, dist * .55), k = 1 - Math.exp(-dt * 1.1);
  if (dist > .01) { v.vel.x += (dx / dist * sp - v.vel.x) * k; v.vel.y += (dy / dist * sp - v.vel.y) * k; v.vel.z += (dz / dist * sp - v.vel.z) * k; }
  v.pos.addScaledVector(v.vel, dt);
  const hs = Math.hypot(v.vel.x, v.vel.z);
  const ft = v.faceT && isAlive(v.faceT) ? v.faceT : null;
  const face = ft ? Math.atan2(ft.pos.x - v.pos.x, ft.pos.z - v.pos.z) : hs > 4 ? Math.atan2(v.vel.x, v.vel.z) : v.g.rotation.y;
  const yd = angDiff(face, v.g.rotation.y); v.g.rotation.y += clamp(yd, -1.1 * dt, 1.1 * dt);
  const fwdS = v.vel.x * Math.sin(v.g.rotation.y) + v.vel.z * Math.cos(v.g.rotation.y);
  v.g.rotation.x = damp(v.g.rotation.x, clamp(fwdS * .012, -.25, .3), 2, dt);
  v.g.rotation.z = damp(v.g.rotation.z, clamp(-yd * 1.3, -.45, .45), 2, dt);
  if (v.mode === 'leave' || v.landing) return;
  // weapons
  v.think -= dt; v.cd -= dt; v.cd2 -= dt;
  if (v.think <= 0) {
    v.think = .7;
    if (v.type === 'apache') v.target = findTarget(v, 'ally', 150, { veh: true, eye: -1.5, prefer: r => r.isVeh ? .3 : 1 });
    else if (v.type === 'hind') v.target = findTarget(v, 'enemy', 160, { veh: true, eye: -1.5 });
    else if (v.type === 'blackhawk' && v.doorGun) v.target = findTarget(v, 'ally', 95, { eye: -.5 });
    v.faceT = v.type === 'blackhawk' ? null : v.target;
  }
  const t = isAlive(v.target) ? v.target : null; if (!t) return;
  const d = dxz(t.pos, v.pos);
  if (v.type === 'apache') {
    if (v.cd2 <= 0) {
      if (v.burst <= 0) v.burst = 14; v.burst--; v.cd2 = v.burst > 0 ? .08 : 1.3;
      const mz = v.g.localToWorld(_vv.set(0, -.75, 3.9)).clone(); _vv2.set(t.pos.x + rand(-1.5, 1.5), groundH(t.pos.x, t.pos.z) + rand(0, 1.2), t.pos.z + rand(-1.5, 1.5));
      tracers.spawn(mz, _vv2, 'heavy', .07, 900); sfx('lmg', .9, mz); const ip = _vv2.clone();
      later(mz.distanceTo(ip) / 900, () => { explode(ip, 50, 2.8, 'ally', v, { s: .45 }); });
    }
    if (v.cd <= 0 && (t.isVeh || R() < .3)) {
      v.cd = 4.5; const mz = v.g.localToWorld(_vv.set(R() < .5 ? 1.3 : -1.3, -.4, .6)).clone();
      const dir = _vv2.set(t.pos.x, aimYOf(t), t.pos.z).sub(mz).normalize();
      spawnProj('missile', mz, dir.multiplyScalar(70), 'ally', v, { dmg: 900, r: 6.5, life: 6, homing: t }); sfx('rocket', 1, mz);
    }
  } else if (v.type === 'hind') {
    if (v.cd <= 0 && Math.abs(yd) < .25 && d < 150) {
      v.cd = rand(6.5, 9);
      for (let i = 0; i < 6; i++) later(i * .12, () => {
        if (!v.alive) return;
        const mz = v.g.localToWorld(_vv.set(i % 2 ? 3.2 : -3.2, -.6, .5)).clone();
        const err = (3 + d * .05) * D().tank;
        const tp = _vv2.set(t.pos.x + rand(-err, err), aimYOf(t) - 1, t.pos.z + rand(-err, err));
        spawnProj('rocket', mz, tp.sub(mz).normalize().multiplyScalar(95), 'enemy', v, { dmg: 140, r: 5.5, life: 4 }); sfx('rocket', .9, mz);
      });
    }
    if (v.cd2 <= 0 && d < 110) mgBurstAir(v, t, 9, .22);
  } else if (v.type === 'blackhawk') {
    if (v.cd2 <= 0) mgBurstAir(v, t, 18, .32);
  }
}
function mgBurstAir(v, t, dmg, acc) {
  if (v.burst <= 0) v.burst = ri(8, 14); v.burst--; v.cd2 = v.burst > 0 ? .09 : rand(1.4, 2.4);
  const mz = v.g.localToWorld(_vv.set(v.type === 'blackhawk' ? 1.3 : 0, -.9, v.type === 'blackhawk' ? .9 : 4.4)).clone();
  _vv2.set(t.pos.x, aimYOf(t), t.pos.z); const hit = R() < acc * (v.team === 'enemy' ? D().acc : 1);
  if (!hit) { _vv2.x += rand(-2.5, 2.5); _vv2.z += rand(-2.5, 2.5); _vv2.y = groundH(_vv2.x, _vv2.z); fxImpact(_vv2, 'sand', 2); } else applyHit(t, dmg, v);
  tracers.spawn(mz, _vv2, v.team === 'ally' ? 'heavy' : 'enemy', .06); sfx('lmg', .8, mz);
}

/* ---------- projectiles ---------- */
const GEO_ROCKET = new THREE.CylinderGeometry(.07, .07, .8, 8).rotateX(PI / 2);
const GEO_BOMB = new THREE.CylinderGeometry(.18, .18, 1.6, 8).rotateX(PI / 2);
const GEO_SHELL = new THREE.CylinderGeometry(.06, .06, 1.6, 6).rotateX(PI / 2);
const MAT_SHELL = new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 5, 2), fog: false });
function spawnProj(type, pos, vel, team, src, o = {}) {
  let mesh;
  if (type === 'grenade') mesh = new THREE.Mesh(sphG(.07, 8), lam(0x3c4230));
  else if (type === 'smokeG') mesh = new THREE.Mesh(cylG(.06, .06, .2, 8), lam(0x7d8a6a));
  else if (type === 'bomb') mesh = new THREE.Mesh(GEO_BOMB, lam(0x3a3d36));
  else if (type === 'shell') mesh = new THREE.Mesh(GEO_SHELL, MAT_SHELL);
  else mesh = new THREE.Mesh(GEO_ROCKET, lam(type === 'smaw' ? 0x6a6a48 : 0x4e5236));
  mesh.position.copy(pos); mesh.castShadow = type === 'bomb'; scene.add(mesh);
  const p = { type, mesh, pos: mesh.position, vel: vel.clone(), team, src, life: o.life || 6, fuse: o.fuse || 0, dmg: o.dmg || 200, r: o.r || 5, homing: o.homing || null, guided: !!o.guided, prev: pos.clone(), grav: o.grav || 0, bounces: 0 };
  projs.push(p); return p;
}
const _pp = new V3(), _pdir = new V3(), _pc = new V3();
function updateProjectiles(dt) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i]; p.life -= dt; p.prev.copy(p.pos);
    if (p.type === 'grenade' || p.type === 'smokeG') {
      p.vel.y -= 22 * dt; p.pos.addScaledVector(p.vel, dt);
      const gh = groundH(p.pos.x, p.pos.z) + .07;
      if (p.pos.y < gh) { p.pos.y = gh; if (p.vel.y < -2 && p.bounces++ < 3) sfx('step', .4, p.pos); p.vel.y *= -.32; p.vel.x *= .55; p.vel.z *= .55; }
      for (const c of colliders) if (c.on && p.pos.x > c.x0 && p.pos.x < c.x1 && p.pos.z > c.z0 && p.pos.z < c.z1 && p.pos.y < c.h && p.pos.y > c.y0) {
        if (p.prev.y >= c.h - .05) { p.pos.y = c.h + .07; p.vel.y *= -.3; p.vel.x *= .6; p.vel.z *= .6; }
        else { p.pos.x = p.prev.x; p.pos.z = p.prev.z; if (p.prev.x <= c.x0 || p.prev.x >= c.x1) p.vel.x *= -.4; else p.vel.z *= -.4; }
        break;
      }
      p.mesh.rotation.x += dt * 9; p.fuse -= dt;
      if (p.fuse <= 0) {
        if (p.type === 'grenade') explode(p.pos.clone(), p.dmg, p.r, p.team, p.src, { s: 1.1 });
        else { addSmokeVolume(p.pos, 7, 20); p.smokeT = 18; sfx('hiss', .8, p.pos); smokeEmitters.push({ p: p.pos.clone(), t: 18 }); }
        scene.remove(p.mesh); projs.splice(i, 1);
      }
      continue;
    }
    if (p.guided && p.src === P && WS.slots[WS.cur] && WS.slots[WS.cur].d.proj === 'smaw' && mouse.r && P.alive) {
      const ap = aimPoint(500); const sp = p.vel.length();
      _pdir.copy(ap).sub(p.pos).normalize().multiplyScalar(sp); p.vel.lerp(_pdir, Math.min(1, dt * 3.5)).setLength(sp);
    }
    if (p.homing && isAlive(p.homing)) {
      const t = p.homing, sp = p.vel.length(); _pdir.set(t.pos.x, aimYOf(t), t.pos.z).sub(p.pos).normalize().multiplyScalar(sp); p.vel.lerp(_pdir, Math.min(1, dt * 3)).setLength(sp);
    }
    if (p.grav) p.vel.y -= p.grav * dt;
    p.pos.addScaledVector(p.vel, dt);
    _pp.copy(p.pos).add(p.vel); p.mesh.lookAt(_pp);
    if (p.type !== 'shell' && p.type !== 'bomb') {
      smoke.spawn(p.prev.x, p.prev.y, p.prev.z, rand(-.3, .3), rand(0, .5), rand(-.3, .3), .5, 1.6, p.type === 'sky' ? 3 : 1.4, C_SMOKE_L, .6, 1);
      fire.spawn(p.pos.x, p.pos.y, p.pos.z, 0, 0, 0, .6, -.5, .06, C_FIRE, 1);
    }
    if (p.type === 'sky') { if (p.life <= 0) { scene.remove(p.mesh); projs.splice(i, 1); } continue; }
    // collision along this frame's segment
    _pdir.copy(p.pos).sub(p.prev); const L = _pdir.length(); if (L < 1e-5) continue; _pdir.divideScalar(L);
    let hitT = Infinity;
    const rw = rayWorld(p.prev, _pdir, L); if (rw.c) hitT = rw.t;
    if (p.pos.y < -1.1 && p.pos.z < -150) hitT = Math.min(hitT, L);
    for (const c of chars) { if (!c.alive || c.team === p.team || c.downed) continue; _pc.set(c.pos.x, c.pos.y + 1, c.pos.z); if (segPointDist2(p.prev, _pdir, L, _pc) < .8) hitT = Math.min(hitT, Math.max(0, (_pc.x - p.prev.x) * _pdir.x + (_pc.y - p.prev.y) * _pdir.y + (_pc.z - p.prev.z) * _pdir.z)); }
    if (p.team === 'enemy' && P.alive) { _pc.set(P.pos.x, P.pos.y + 1, P.pos.z); if (segPointDist2(p.prev, _pdir, L, _pc) < .8) hitT = Math.min(hitT, L * .5); }
    for (const v of vehicles) {
      if (!v.alive || v.team === p.team) continue;
      for (const s of v.T.sph) { vehSphere(v, s, _pc); if (segPointDist2(p.prev, _pdir, L, _pc) < s[3] * s[3]) { hitT = Math.min(hitT, L * .5); break; } }
    }
    if (hitT < Infinity || p.life <= 0) {
      const hp = p.prev.clone().addScaledVector(_pdir, Math.min(hitT, L));
      const water = hp.z < -150 && hp.y < -.6;
      explode(hp, p.dmg, p.r, p.team, p.src, { s: p.type === 'bomb' ? 2.6 : p.type === 'shell' ? 1.6 : 1.3, water });
      scene.remove(p.mesh); projs.splice(i, 1);
    }
  }
  for (let i = smokeEmitters.length - 1; i >= 0; i--) { const e = smokeEmitters[i]; e.t -= dt; if (R() < dt * 10) fxSmokeCloud(e.p); if (e.t <= 0) smokeEmitters.splice(i, 1); }
}
const smokeEmitters = [];
function throwGrenadeFrom(s, target, kind) {
  const o = s.muzzle(new V3()); o.y += .4;
  const dx = target.x - o.x, dz = target.z - o.z, d = Math.hypot(dx, dz), t = clamp(d / 14, .7, 1.6);
  const vel = new V3(dx / t, ((target.y || 0) - o.y + .5 * 22 * t * t) / t, dz / t);
  spawnProj(kind === 'frag' ? 'grenade' : 'smokeG', o, vel, s.team, s, { fuse: kind === 'frag' ? t + 1.2 : t + .2, dmg: 170, r: 7 });
  sfx('throw', .7, o);
  if (kind === 'frag' && s.team === 'enemy') later(t * .6, () => { if (dxz(target, P.pos) < 12) callout(squad.members.find(a => a.alive && !a.downed), 'grenade'); });
}

/* ---------- explosions ---------- */
function explode(p, dmg, r, team, src, o = {}) {
  const s = o.s || clamp(r / 5, .4, 2.4);
  fxExplosion(p, s, o.water);
  sfx(s > 1.2 ? 'boom' : 'boomS', Math.min(1.7, .6 + s * .5), p);
  if (o.water) sfx('splash', 1, p);
  const dc = camera.position.distanceTo(p);
  G.shake = Math.max(G.shake, clamp(1 - dc / (s * 32), 0, 1) * Math.min(1, .35 + s * .45));
  if (dc < r * 1.5) G.flash = Math.max(G.flash, .28 * (1 - dc / (r * 1.5)));
  for (const c of chars) {
    if (!c.alive || c.downed || c.team === team) continue;
    const d = Math.hypot(c.pos.x - p.x, c.pos.y + 1 - p.y, c.pos.z - p.z);
    if (d < r) c.damage(dmg * (1 - d / r), src, false);
    if (d < r * 2.5) c.supp = 1;
  }
  if (P.alive && !P.downed) {
    const d = Math.hypot(P.pos.x - p.x, P.pos.y + 1 - p.y, P.pos.z - p.z);
    if (d < r) {
      const k = 1 - d / r;
      const f = team === 'enemy' ? D().dmg : team === 'neutral' ? .6 : (src === P ? .45 : 0);
      const dm = Math.min(dmg * k * f, team === 'enemy' ? 140 : 300);
      if (dm > 1) playerDamage(dm, { pos: p });
    }
  }
  for (const v of vehicles) {
    if (!v.alive || v.team === team) continue;
    const d = Math.max(0, v.pos.distanceTo(p) - v.rad);
    if (d < r) { const was = v.alive; v.damage(dmg * clamp(1 - d / r, .3, 1) * v.armorX, src); if (src === P && was) HUD.hit(!v.alive, false); }
  }
  damageBarrels(p, r * .8, src);
  damageDestructibles(p, r * .7, dmg);
}

/* ---------- jets, ships & killstreaks ---------- */
function spawnJet(from, to, alt, opt = {}) {
  const g = shadows(bF16(), true, false); scene.add(g);
  const dir = new V3().subVectors(to, from).setY(0).normalize();
  g.position.set(from.x, alt, from.z); g.rotation.y = Math.atan2(dir.x, dir.z);
  jets.push({ g, dir, spd: opt.spd || 175, life: opt.life || 10, bomb: opt.bomb || null, dropped: false, boom: false });
}
function updateJets(dt) {
  for (let i = jets.length - 1; i >= 0; i--) {
    const j = jets[i]; j.life -= dt; j.g.position.addScaledVector(j.dir, j.spd * dt);
    j.g.userData.ab.scale.setScalar(2.2 + Math.random() * .8);
    j.g.rotation.z = Math.sin(G.time * 2 + i) * .06;
    const d = camera.position.distanceTo(j.g.position);
    if (!j.boom && d < 260) { j.boom = true; sfx('jet', 1.3, null); later(d / 343 * .6 + .4, () => { sfx('sonic', 1); G.shake = Math.max(G.shake, .25); }); }
    if (j.bomb && !j.dropped) {
      const s = (j.g.position.x - j.bomb.x) * j.dir.x + (j.g.position.z - j.bomb.z) * j.dir.z;
      if (s >= -60) {
        j.dropped = true; const T = 1.9, g = 30;
        for (let k = 0; k < 6; k++) {
          const L = j.bomb.clone().addScaledVector(j.dir, k * 8 - 20); L.y = groundH(L.x, L.z);
          const o = j.g.position.clone().addScaledVector(j.dir, -k * 3);
          const vel = new V3((L.x - o.x) / T, (L.y - o.y + .5 * g * T * T) / T, (L.z - o.z) / T);
          later(k * .08, () => spawnProj('bomb', o, vel, 'ally', P, { dmg: 750, r: 11, grav: g, life: 4 }));
        }
      }
    }
    if (j.life <= 0) { scene.remove(j.g); jets.splice(i, 1); }
  }
}
function navalBarrage(target) {
  for (let i = 0; i < 10; i++) {
    const sh = ships[i % ships.length];
    later(.8 + i * .35, () => {
      const mz = sh.gun.localToWorld(new V3(0, .5, -6));
      fire.spawn(mz.x, mz.y, mz.z, 0, 0, 0, 14, 20, .2, C_CORE, 1);
      for (let k = 0; k < 8; k++) smoke.spawn(mz.x, mz.y, mz.z, rand(-5, 5), rand(0, 4), rand(-5, 5), 6, 6, 5, C_SMOKE_L, .7, 1);
      sfx('far', 1.2, mz);
    });
    later(3.2 + i * .38, () => sfx('whistle', .6, null));
    later(4.2 + i * .38, () => { const p = target.clone().add(new V3(rand(-16, 16), 0, rand(-16, 16))); p.y = groundH(p.x, p.z); explode(p, 520, 9.5, 'ally', P, { s: 2.1 }); });
  }
}
const STREAKS = [
  { id: 'uav', name: 'מל״ט סיור', key: '6', need: 3 },
  { id: 'air', name: 'תקיפת F-16', key: '7', need: 5 },
  { id: 'apache', name: 'סיוע אפאצ׳י', key: '8', need: 8 },
  { id: 'naval', name: 'הפגזה ימית', key: '9', need: 12 }
];
const streakReady = {};
function streakAdd() {
  P.streak++;
  for (const s of STREAKS) if (P.streak === s.need) { streakReady[s.id] = (streakReady[s.id] || 0) + 1; HUD.banner(s.name, `זמין · מקש ${s.key}`, 2.4); sfx('ui', .8); }
  if (P.streak >= 12) P.streak = 0;
  HUD.streaks();
}
function useStreak(id) {
  if (!streakReady[id]) { const s = STREAKS.find(x => x.id === id); HUD.sub('', `${s.name} עדיין לא זמין · דרושות ${s.need} הריגות ברצף`); sfx('click', .4); return; }
  streakReady[id]--; HUD.streaks();
  const ap = aimPoint(450).clone(); ap.y = groundH(ap.x, ap.z);
  if (id === 'uav') { G.uavT = 32; HUD.feed('מל״ט מעל הזירה · האויב מסומן במכ״ם', 'y'); sfx('beep', .8); Voice.say('מל״ט באוויר', 'UAV online', 1, true); }
  else if (id === 'air') {
    const dir = new V3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw));
    spawnJet(ap.clone().addScaledVector(dir, -650), ap.clone().addScaledVector(dir, 800), 62, { bomb: ap, life: 9 });
    later(.6, () => spawnJet(ap.clone().addScaledVector(dir, -700).add(new V3(25, 0, 0)), ap.clone().addScaledVector(dir, 800), 70, { life: 9 }));
    markOrder(ap, 'foc', 'מטרת תקיפה'); HUD.feed('F-16 בדרך · הפצצה על הנקודה המסומנת', 'y'); Voice.say('מטוסים בדרך, תתרחקו מהנקודה', 'Jets inbound, danger close', 1, true);
  } else if (id === 'apache') {
    const a = new Veh('apache', 'ally', P.pos.x, P.pos.z + 300, PI); a.pos.y = 60; a.center.copy(ap); a.radius = 42; a.alt = 32; a.angSpd = .2; a.life = 50; a.untargetable = true;
    HUD.feed('אפאצ׳י בגזרה ל־50 שניות', 'y'); Voice.say('אפאצ׳י בגזרה', 'Apache on station', 1, true);
  } else if (id === 'naval') {
    navalBarrage(ap); markOrder(ap, 'foc', 'הפגזה ימית'); HUD.feed('ספינות הטילים פותחות באש', 'y'); Voice.say('ירי ארטילרי ימי, תתכסו', 'Naval fire mission, take cover', 1, true);
  }
}

/* ---------- ambient war-zone ---------- */
let ambT = 2, jetAmbT = 25, flareT = 6, shipAmbT = 15;
function ambientBattle(dt) {
  ambT -= dt; jetAmbT -= dt; flareT -= dt; shipAmbT -= dt;
  if (ambT <= 0) {
    ambT = rand(1.5, 4.5);
    const a = rand(-.2, PI + .2) + PI, r = rand(330, 560), p = new V3(Math.cos(a) * r, 0, Math.sin(a) * r * -.7 + 180);
    if (Math.abs(p.x) < 200 && p.z < 200) p.z = 300;
    p.y = groundH(p.x, p.z);
    fire.spawn(p.x, p.y + 4, p.z, 0, 0, 0, 40, 60, .25, C_CORE, 1);
    for (let i = 0; i < 6; i++) smoke.spawn(p.x + rand(-6, 6), p.y + rand(4, 10), p.z + rand(-6, 6), rand(-2, 2), rand(3, 6), rand(-2, 2), rand(12, 20), 6, rand(8, 12), C_SMOKE, .6, .3, 0, .5);
    sfx('far', .9, p);
  }
  if (flareT <= 0) {
    flareT = rand(5, 12);
    const a = R() * TAU, r = rand(240, 420);
    fire.spawn(Math.cos(a) * r, rand(140, 200), Math.sin(a) * r, rand(-1, 1), -2.5, rand(-1, 1), 6, 0, 14, C_FLARE, 1, 0, 0, 0, .05);
  }
  if (jetAmbT <= 0) {
    jetAmbT = rand(35, 70);
    const a = R() * TAU, c = new V3(camera.position.x, 0, camera.position.z);
    const f = c.clone().add(new V3(Math.cos(a) * 900, 0, Math.sin(a) * 900)), t = c.clone().add(new V3(-Math.cos(a) * 900, 0, -Math.sin(a) * 900));
    spawnJet(f, t, rand(80, 130), { life: 12, spd: 200 }); if (R() < .6) later(.5, () => spawnJet(f.clone().add(new V3(30, 0, 30)), t, rand(90, 120), { life: 12, spd: 200 }));
  }
  if (shipAmbT <= 0 && ships.length) {
    shipAmbT = rand(14, 30);
    const sh = pick(ships), mz = sh.gun.localToWorld(new V3(0, .5, -6));
    fire.spawn(mz.x, mz.y, mz.z, 0, 0, 0, 12, 18, .2, C_CORE, 1); for (let k = 0; k < 6; k++) smoke.spawn(mz.x, mz.y, mz.z, rand(-4, 4), rand(0, 3), rand(-4, 4), 5, 5, 5, C_SMOKE_L, .6, 1);
    sfx('far', .8, mz);
  }
}
function updateBattlefield(dt) {
  let rotor = 0;
  for (let i = vehicles.length - 1; i >= 0; i--) {
    const v = vehicles[i]; v.update(dt);
    if (v.air && v.alive) rotor = Math.max(rotor, 1 - camera.position.distanceTo(v.pos) / 160);
    if (v.remove) { scene.remove(v.g); vehicles.splice(i, 1); }
  }
  setRotor(clamp(rotor, 0, 1) * .55);
  updateJets(dt); ambientBattle(dt); updateSmokes(dt);
  G.uavT = Math.max(0, G.uavT - dt);
}
function clearBattlefield() {
  for (const v of vehicles) { scene.remove(v.g); if (v.detached) scene.remove(v.detached); }
  vehicles.length = 0;
  for (const p of projs) scene.remove(p.mesh); projs.length = 0;
  for (const j of jets) scene.remove(j.g); jets.length = 0;
  smokes.length = 0; smokeEmitters.length = 0;
}

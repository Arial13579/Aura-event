'use strict';
/* =====================================================================
   WeaponSystem.js — arsenal definitions, procedural first-person
   weapon models with arms, ballistic bullets (velocity + drop), recoil,
   ADS, scopes, reload/bolt/swap animations, launchers (unguided RPG-7,
   laser-guided SMAW), frag & smoke grenades, C4 and the knife.
   ===================================================================== */

/* ---------- first-person model helpers ---------- */
const vBlk = std(0x1c1d1b, .42, .6), vDrk = std(0x2b2c29, .65, .35), vOd = std(0x4e5236, .8, .1), vWood = std(0x6e4a2a, .65, .05),
  vFde = std(0xa58f68, .75, .1), vBak = std(0x7a4422, .55, .05), vBrass = std(0xb08d3a, .35, .85), vGlass = std(0x101418, .1, .6);
function limb(g, a, b, t, mat) { const m = new THREE.Mesh(GB, mat); m.scale.set(t, t, a.distanceTo(b)); m.position.copy(a).add(b).multiplyScalar(.5); g.add(m); m.lookAt(b); return m; }
function vmFinish(g, o) {
  if (!Models.ready) {
    const sl = std(0x5c5e44, .95, 0), gl = std(0x2a2924, .85, 0);
    limb(g, o.rg, new V3(.14, -.36, .44), .085, sl); box(g, .075, .085, .1, gl, o.rg.x, o.rg.y, o.rg.z);
    limb(g, o.lg, o.lgTo || new V3(-.26, -.34, .1), .08, sl); box(g, .08, .07, .11, gl, o.lg.x, o.lg.y, o.lg.z);
  }
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFlash, color: new THREE.Color(3, 2.2, 1.3), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  fl.position.copy(o.muzzle); fl.scale.setScalar(o.flash || .3); fl.visible = false; g.add(fl);
  o.fl = fl; o.g = g;
  g.traverse(m => { m.frustumCulled = false; });
  return o;
}
const vBlkD = vBlk.clone(); vBlkD.side = THREE.DoubleSide;
function tube(g, r, h, x, y, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16, 1, true), vBlkD); m.position.set(x, y, z); m.rotation.x = PI / 2; g.add(m); return m; }
function holo(g, y, z) { box(g, .045, .014, .075, vBlk, 0, y - .028, z); box(g, .006, .05, .05, vBlk, .025, y, z); box(g, .006, .05, .05, vBlk, -.025, y, z); box(g, .056, .007, .055, vBlk, 0, y + .026, z); redDot(g, y, z - .03); }
function redDot(g, y, z) { const d = new THREE.Mesh(sphG(.0026, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, .3, .2) })); d.position.set(0, y, z); g.add(d); }
const PI2 = PI / 2;
function vM249() {
  const g = new THREE.Group();
  box(g, .08, .11, .4, vBlk, 0, 0, -.05); box(g, .07, .05, .25, vBlk, 0, .03, -.38); cyl(g, .015, .015, .45, vBlk, 0, .01, -.62, PI2, 0, 0, 8);
  box(g, .02, .05, .12, vBlk, 0, .09, -.3); box(g, .09, .12, .14, vOd, -.04, -.1, -.08);
  box(g, .06, .09, .27, vBlk, 0, -.01, .26); box(g, .036, .095, .045, vBlk, 0, -.08, .05, -.35);
  cyl(g, .007, .007, .3, vBlk, .02, -.04, -.55, PI2); cyl(g, .007, .007, .3, vBlk, -.02, -.04, -.55, PI2);
  box(g, .03, .02, .03, vBlk, 0, .068, -.02); box(g, .01, .04, .01, vBlk, 0, .06, -.78); box(g, .07, .015, .1, vBrass, -.06, .0, -.12, 0, 0, .4);
  return vmFinish(g, { muzzle: new V3(0, .01, -.86), sightY: .078, adsZ: .26, hip: new V3(.16, -.17, -.32), rg: new V3(0, -.11, .07), lg: new V3(0, -.03, -.38), flash: .38 });
}
function vMAG() {
  const g = new THREE.Group();
  box(g, .085, .12, .45, vBlk, 0, 0, -.05); box(g, .065, .1, .3, vWood, 0, -.02, .3); box(g, .045, .06, .18, vWood, 0, -.06, -.33);
  cyl(g, .017, .017, .62, vBlk, 0, .01, -.6, PI2, 0, 0, 8); cyl(g, .024, .024, .08, vBlk, 0, .01, -.93, PI2, 0, 0, 8);
  box(g, .02, .06, .12, vBlk, .05, .06, -.36, 0, 0, .6); box(g, .036, .1, .045, vBlk, 0, -.09, .07, -.3);
  box(g, .08, .03, .12, vBrass, -.07, -.02, -.1, 0, 0, .35); box(g, .1, .13, .15, vOd, -.11, -.1, -.08);
  box(g, .03, .02, .03, vBlk, 0, .075, .02); box(g, .012, .05, .012, vBlk, 0, .06, -.86);
  return vmFinish(g, { muzzle: new V3(0, .01, -.98), sightY: .083, adsZ: .27, hip: new V3(.16, -.18, -.32), rg: new V3(0, -.12, .08), lg: new V3(0, -.07, -.34), flash: .42 });
}
function vBarrett() {
  const g = new THREE.Group();
  box(g, .07, .1, .6, vBlk, 0, 0, -.1); box(g, .06, .06, .3, vDrk, 0, -.005, -.55); cyl(g, .017, .017, .5, vBlk, 0, .005, -.85, PI2, 0, 0, 8);
  box(g, .07, .045, .09, vBlk, 0, .005, -1.12); box(g, .06, .09, .28, vBlk, 0, -.01, .3); box(g, .05, .1, .12, vBlk, 0, -.1, -.05);
  box(g, .036, .095, .045, vBlk, 0, -.08, .1, -.35);
  cyl(g, .028, .028, .3, vBlk, 0, .1, -.1, PI2, 0, 0, 14); cyl(g, .039, .03, .07, vBlk, 0, .1, -.28, PI2, 0, 0, 14); cyl(g, .03, .036, .06, vBlk, 0, .1, .07, PI2, 0, 0, 14);
  box(g, .03, .05, .03, vBlk, 0, .07, -.2); box(g, .03, .05, .03, vBlk, 0, .07, 0);
  return vmFinish(g, { muzzle: new V3(0, .005, -1.18), sightY: .1, adsZ: .3, hip: new V3(.16, -.17, -.38), rg: new V3(0, -.11, .1), lg: new V3(0, -.05, -.45), flash: .55 });
}
function vM24() {
  const g = new THREE.Group();
  box(g, .06, .085, .78, std(0x4b4f36, .8, .1), 0, -.02, 0); box(g, .045, .05, .3, vBlk, 0, .03, -.05);
  cyl(g, .013, .013, .46, vBlk, 0, .03, -.6, PI2, 0, 0, 8); box(g, .07, .012, .012, vBlk, .05, .03, .06);
  sph(g, .012, vBlk, .085, .03, .06, 1, 1, 1, 6);
  cyl(g, .025, .025, .32, vBlk, 0, .095, -.08, PI2, 0, 0, 14); cyl(g, .035, .027, .07, vBlk, 0, .095, -.26, PI2, 0, 0, 14); cyl(g, .027, .033, .05, vBlk, 0, .095, .1, PI2, 0, 0, 14);
  return vmFinish(g, { muzzle: new V3(0, .03, -.85), sightY: .095, adsZ: .3, hip: new V3(.15, -.17, -.36), rg: new V3(0, -.09, .12), lg: new V3(0, -.07, -.32), flash: .32 });
}
function vPistol() {
  const g = new THREE.Group();
  box(g, .034, .045, .21, vBlk, 0, .02, -.07); box(g, .03, .03, .18, vDrk, 0, -.012, -.06); box(g, .032, .1, .05, vDrk, 0, -.07, .02, -.25);
  cyl(g, .021, .021, .17, vBlk, 0, .02, -.26, PI2, 0, 0, 12); box(g, .006, .012, .006, vBlk, 0, .048, -.16); box(g, .02, .012, .008, vBlk, 0, .048, .025);
  return vmFinish(g, { muzzle: new V3(0, .02, -.36), sightY: .052, adsZ: .34, hip: new V3(.13, -.14, -.36), rg: new V3(0, -.07, .03), lg: new V3(-.025, -.08, .0), lgTo: new V3(-.2, -.34, .24), flash: .12 });
}
function vRPG7() {
  const g = new THREE.Group();
  cyl(g, .045, .045, 1.0, vOd, 0, 0, -.05, PI2, 0, 0, 14); cyl(g, .06, .045, .2, vOd, 0, 0, .5, PI2, 0, 0, 14);
  box(g, .1, .1, .22, vWood, 0, 0, -.05); box(g, .03, .1, .04, vWood, 0, -.09, -.1); box(g, .03, .1, .04, vWood, 0, -.09, .12);
  box(g, .035, .06, .1, vBlk, -.06, .07, -.06); cyl(g, .014, .014, .05, vBlk, -.06, .075, .0, PI2, 0, 0, 8);
  const w1 = cyl(g, .075, .05, .2, vOd, 0, 0, -.62, -PI2, 0, 0, 12), w2 = cyl(g, 0, .075, .26, vOd, 0, 0, -.85, -PI2, 0, 0, 12);
  const o = vmFinish(g, { muzzle: new V3(0, 0, -.62), sightY: .095, adsZ: .34, hip: new V3(.15, -.11, -.27), rg: new V3(0, -.12, -.1), lg: new V3(0, -.12, .14), lgTo: new V3(-.2, -.36, .3), flash: .6 });
  o.war = [w1, w2]; return o;
}
function vSMAW() {
  const g = new THREE.Group(); const c = std(0x6a6a48, .8, .1);
  cyl(g, .062, .062, 1.05, c, 0, 0, -.05, PI2, 0, 0, 16); cyl(g, .07, .07, .06, vBlk, 0, 0, -.58, PI2, 0, 0, 16); cyl(g, .07, .07, .06, vBlk, 0, 0, .48, PI2, 0, 0, 16);
  cyl(g, .014, .014, .5, vBlk, .075, -.03, -.1, PI2, 0, 0, 8);
  box(g, .04, .07, .14, vBlk, -.075, .07, -.08); cyl(g, .018, .018, .04, vGlass, -.075, .075, -.16, PI2, 0, 0, 10);
  box(g, .03, .1, .04, vBlk, 0, -.1, -.15); box(g, .03, .1, .04, vBlk, 0, -.1, .1);
  const o = vmFinish(g, { muzzle: new V3(0, 0, -.62), sightY: .11, adsZ: .34, hip: new V3(.16, -.11, -.27), rg: new V3(0, -.13, -.15), lg: new V3(0, -.13, .1), lgTo: new V3(-.2, -.36, .28), flash: .65 });
  o.war = []; return o;
}


/* side-profile extrusions with bevelled edges: pts are [forward, up] pairs in metres */
function profile(g, pts, depth, mat, x = 0, bevel = .004) {
  const sh = new THREE.Shape(); pts.forEach(([f, y], i) => i ? sh.lineTo(f, y) : sh.moveTo(f, y));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, -(depth - bevel * 2) / 2); geo.rotateY(PI / 2); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.position.x = x; g.add(m); return m;
}
function rail(g, f0, f1, y, mat) {
  box(g, .022, .009, f1 - f0, mat, 0, y, -(f0 + f1) / 2);
  const n = Math.floor((f1 - f0) / .016), im = new THREE.InstancedMesh(GB, mat, n), m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { m4.makeScale(.026, .007, .007).setPosition(0, y + .006, -(f0 + i * .016 + .008)); im.setMatrixAt(i, m4); }
  im.frustumCulled = false; g.add(im);
}
const mRec = std(0x2c2d2f, .36, .75), mPoly = std(0x222222, .78, .1), mDark = std(0x0b0b0b, .9, 0), mFde = std(0xa88f66, .62, .12), mWood = std(0x5a371c, .55, .05), mSteel = std(0x3a3b3d, .3, .85);
function vM4() {
  const g = new THREE.Group();
  profile(g, [[-.13, 0], [.22, 0], [.22, .05], [.19, .066], [-.13, .066]], .052, mRec);
  profile(g, [[-.12, -.004], [.13, -.004], [.13, -.1], [.05, -.1], [.04, -.06], [-.02, -.055], [-.12, -.04]], .05, mRec);
  profile(g, [[-.03, -.05], [-.075, -.05], [-.105, -.17], [-.058, -.175]], .036, mPoly);
  box(g, .012, .008, .07, mRec, 0, -.08, -.0);
  profile(g, [[.056, -.1], [.124, -.1], [.15, -.24], [.082, -.25]], .044, mRec, 0, .003);
  profile(g, [[-.16, .045], [-.43, .05], [-.445, -.095], [-.395, -.1], [-.25, -.03], [-.16, -.02]], .045, mPoly);
  cyl(g, .016, .016, .18, mRec, 0, .025, .21, PI2, 0, 0, 10);
  cyl(g, .035, .035, .32, mPoly, 0, .03, -.38, PI2, 0, 0, 8);
  rail(g, -.12, .5, .07, mRec);
  cyl(g, .011, .011, .2, mSteel, 0, .03, -.63, PI2, 0, 0, 10); cyl(g, .017, .017, .065, mDark, 0, .03, -.76, PI2, 0, 0, 8);
  box(g, .003, .018, .05, mDark, .027, .035, -.04); cyl(g, .008, .008, .02, mRec, .03, .04, .05, 0, 0, PI2, 8); box(g, .04, .008, .02, mRec, 0, .066, .12);
  tube(g, .019, .07, 0, .1, -.1); box(g, .03, .03, .05, mRec, 0, .082, -.1); redDot(g, .1, -.14);
  return vmFinish(g, { muzzle: new V3(0, .03, -.8), sightY: .1, adsZ: .2, hip: new V3(.15, -.17, -.32), rg: new V3(0, -.1, .07), lg: new V3(0, -.0, -.4) });
}
function vAK() {
  const g = new THREE.Group();
  profile(g, [[-.14, -.045], [.24, -.045], [.24, .045], [.2, .052], [-.12, .052], [-.14, .03]], .052, mSteel);
  profile(g, [[.24, -.035], [.5, -.03], [.5, .025], [.24, .03]], .062, mWood);
  profile(g, [[.24, .035], [.46, .035], [.46, .065], [.24, .065]], .045, mWood);
  profile(g, [[-.03, -.045], [-.075, -.045], [-.1, -.165], [-.055, -.17]], .034, mWood);
  profile(g, [[.06, -.045], [.135, -.045], [.2, -.2], [.17, -.26], [.11, -.24], [.13, -.2]], .042, std(0x7a3e1c, .5, .05), 0, .003);
  profile(g, [[-.14, .03], [-.42, .0], [-.43, -.12], [-.38, -.12], [-.14, -.045]], .046, mWood);
  cyl(g, .011, .011, .3, mSteel, 0, .01, -.66, PI2, 0, 0, 10); cyl(g, .016, .016, .05, mDark, 0, .01, -.83, PI2, 0, 0, 8);
  box(g, .008, .05, .008, mSteel, 0, .045, -.76); box(g, .03, .01, .04, mSteel, 0, .057, -.15); box(g, .009, .014, .02, mSteel, .011, .066, -.15); box(g, .009, .014, .02, mSteel, -.011, .066, -.15); box(g, .04, .006, .2, mSteel, 0, .055, .02);
  box(g, .006, .012, .07, mSteel, .03, .02, -.02);
  return vmFinish(g, { muzzle: new V3(0, .01, -.86), sightY: .07, adsZ: .3, hip: new V3(.15, -.16, -.32), rg: new V3(0, -.1, .07), lg: new V3(0, -.04, -.38) });
}
function vSCAR() {
  const g = new THREE.Group();
  profile(g, [[-.14, 0], [.36, 0], [.36, .05], [.32, .07], [-.14, .07]], .06, mFde);
  profile(g, [[-.12, -.004], [.14, -.004], [.14, -.09], [.06, -.09], [.04, -.06], [-.12, -.045]], .052, mPoly);
  profile(g, [[-.03, -.05], [-.075, -.05], [-.105, -.17], [-.058, -.175]], .038, mPoly);
  profile(g, [[.065, -.09], [.13, -.09], [.14, -.2], [.075, -.205]], .046, mPoly, 0, .003);
  profile(g, [[-.14, .06], [-.42, .055], [-.43, -.1], [-.38, -.1], [-.3, -.02], [-.14, -.01]], .05, mFde);
  rail(g, -.12, .36, .075, mPoly);
  cyl(g, .013, .013, .25, mSteel, 0, .03, -.6, PI2, 0, 0, 10); cyl(g, .019, .019, .07, mDark, 0, .03, -.75, PI2, 0, 0, 8);
  box(g, .003, .02, .06, mDark, .031, .04, -.03);
  holo(g, .108, -.1);
  return vmFinish(g, { muzzle: new V3(0, .03, -.8), sightY: .108, adsZ: .18, hip: new V3(.15, -.17, -.32), rg: new V3(0, -.11, .08), lg: new V3(0, -.0, -.4) });
}

/* ---------- arsenal ---------- */
const WDEF = {
  m4: { name: 'M4A1', cls: 'רובה סער', dmg: 32, rpm: 800, mag: 30, res: 240, auto: true, spread: .026, ads: .0035, recoil: .011, reload: 2.1, vel: 880, fov: 54, snd: 'm4', head: 2.4, build: vM4 },
  ak47: { name: 'AK-47', cls: 'רובה סער', dmg: 38, rpm: 620, mag: 30, res: 210, auto: true, spread: .032, ads: .005, recoil: .016, reload: 2.4, vel: 715, fov: 56, snd: 'ak', head: 2.3, build: vAK },
  scar: { name: 'SCAR-H', cls: 'רובה קרב 7.62', dmg: 46, rpm: 580, mag: 20, res: 160, auto: true, spread: .03, ads: .0032, recoil: .019, reload: 2.5, vel: 800, fov: 46, snd: 'scar', head: 2.3, build: vSCAR },
  m249: { name: 'M249 SAW', cls: 'מקלע קל', dmg: 30, rpm: 850, mag: 100, res: 300, auto: true, spread: .04, ads: .009, recoil: .012, reload: 4.6, vel: 900, fov: 56, snd: 'lmg', head: 2.2, heavy: true, build: vM249 },
  fnmag: { name: 'FN MAG', cls: 'מקלע 7.62 (מאג)', dmg: 42, rpm: 650, mag: 100, res: 300, auto: true, spread: .045, ads: .011, recoil: .017, reload: 5, vel: 840, fov: 56, snd: 'lmg', head: 2.2, heavy: true, build: vMAG },
  barrett: { name: 'Barrett M82 .50', cls: 'רובה צלפים', dmg: 260, rpm: 90, mag: 10, res: 40, auto: false, spread: .08, ads: 0, recoil: .065, reload: 3.4, vel: 850, fov: 9, scope: true, snd: 'sniper', head: 3, heavy: true, pierce: true, build: vBarrett },
  m24: { name: 'M24 SWS', cls: 'רובה צלפים · בריח', dmg: 160, rpm: 60, mag: 5, res: 35, auto: false, spread: .07, ads: 0, recoil: .05, reload: 3, vel: 790, fov: 13, scope: true, bolt: 1.05, snd: 'sniper', head: 3, build: vM24 },
  pistol: { name: 'Mk23 + משתיק', cls: 'אקדח שקט', dmg: 36, rpm: 450, mag: 12, res: 72, auto: false, spread: .02, ads: .006, recoil: .02, reload: 1.6, vel: 290, fov: 64, snd: 'pistolS', head: 2.5, silenced: true, build: vPistol },
  rpg7: { name: 'RPG-7', cls: 'משגר נ״ט', proj: 'rocket', rpm: 30, mag: 1, res: 6, auto: false, spread: .006, ads: 0, recoil: .05, reload: 2.9, fov: 50, snd: 'rocket', build: vRPG7 },
  smaw: { name: 'SMAW', cls: 'משגר מונחה לייזר', proj: 'smaw', rpm: 30, mag: 1, res: 5, auto: false, spread: .004, ads: 0, recoil: .05, reload: 3.4, fov: 48, snd: 'rocket', build: vSMAW }
};
const PRIMARIES = ['m4', 'ak47', 'scar', 'm249', 'fnmag', 'barrett', 'm24'], LAUNCHERS = ['rpg7', 'smaw'];

const WS = {
  slots: [], cur: 0, prev: 0, fireCd: 0, reloading: false, reloadT: 0, reloadMid: false, switchT: 0, ads: 0, scoped: false,
  kick: 0, bloom: 0, swX: 0, swY: 0, bobT: 0, boltT: 0, meleeT: 0, throwT: 0, frag: 3, smokeG: 2, c4: 2, c4s: [], sprintA: 0, flashT: 0, autoReload: 0, downPrev: 0,
  forceSecondary() { this.downPrev = this.cur; this.reloading = false; this.cur = 1; this.switchT = .3; showSlot(); },
  restoreFromDown() { if (this.downPrev !== 1) switchTo(this.downPrev, true); }
};
const VM = { root: new THREE.Group(), models: {} };
wScene.add(VM.root);
function buildViewmodels() {
  FPArms.build(); for (const id in WDEF) { const b = WDEF[id].build(); b.g.visible = false; VM.root.add(b.g); VM.models[id] = b; } }
function mkSlot(id) { const d = WDEF[id]; return { id, d, mag: d.mag, res: d.res, b: VM.models[id] }; }
function equipLoadout() {
  WS.slots = [mkSlot(settings.primary), mkSlot('pistol'), mkSlot(settings.launcher)];
  WS.cur = 0; WS.prev = 1; WS.reloading = false; WS.switchT = .5; WS.boltT = 0; WS.ads = 0; WS.frag = 3; WS.smokeG = 2; WS.c4 = 2;
  for (const c of WS.c4s) scene.remove(c.m); WS.c4s.length = 0;
  showSlot();
}
function showSlot() {
  for (const id in VM.models) VM.models[id].g.visible = false;
  const s = WS.slots[WS.cur]; s.b.g.visible = true;
  if (s.b.war) for (const m of s.b.war) m.visible = s.mag > 0;
  if (window.HUD) HUD.weaponChanged();
}
function switchTo(i, force) {
  if (!WS.slots[i] || (i === WS.cur && !force) || (WS.switchT > 0 && !force)) return;
  if (P.downed && i !== 1) return;
  WS.reloading = false; WS.prev = WS.cur; WS.cur = i; WS.switchT = .4; WS.boltT = 0; sfx('magOut', .3); showSlot();
}
function swapPrimarySecondary() { switchTo(WS.cur === 0 ? 1 : 0); }
function toggleLauncher() { switchTo(WS.cur === 2 ? (WS.prev === 2 ? 0 : WS.prev) : 2); }
function cycleWeapon(dir) { switchTo((WS.cur + dir + 3) % 3); }
function startReload() {
  const s = WS.slots[WS.cur]; if (!s || WS.reloading || s.mag >= s.d.mag || s.res <= 0 || WS.switchT > 0) return;
  WS.reloading = true; WS.reloadT = s.d.reload; WS.reloadMid = false; WS.autoReload = 0; sfx('magOut', .6);
  if (R() < .25 && squad.members.length) Voice.say('מחליף!', 'Reloading!', 1);
}
function finishReload() {
  const s = WS.slots[WS.cur]; WS.reloading = false;
  const n = Math.min(s.d.mag - s.mag, s.res); s.mag += n; s.res -= n;
  if (s.b.war) for (const m of s.b.war) m.visible = s.mag > 0;
}
function refillAll(full) {
  for (const s of WS.slots) { if (full) { s.res = s.d.res; s.mag = s.d.mag; if (s.b.war) for (const m of s.b.war) m.visible = true; } else s.res = Math.min(s.d.res * 1.5, s.res + Math.ceil(s.d.mag * 1.5)); }
  if (full) { WS.frag = 3; WS.smokeG = 2; WS.c4 = Math.max(WS.c4, 2); } else WS.frag = Math.min(4, WS.frag + 1);
}

/* ---------- aiming helpers ---------- */
const _fw = new V3(), _rt = new V3(), _up = new V3(), _mw = new V3(), _bd = new V3(), _aimP = new V3();
function camBasis() { camera.getWorldDirection(_fw); _rt.set(1, 0, 0).applyQuaternion(camera.quaternion); _up.set(0, 1, 0).applyQuaternion(camera.quaternion); }
function muzzleWorld(out) {
  const b = WS.slots[WS.cur].b; VM.root.updateMatrixWorld(true);
  out.copy(b.muzzle); b.g.localToWorld(out); return camera.localToWorld(out);
}
function aimPoint(maxD = 300) {
  camera.getWorldDirection(_fw);
  const r = rayWorld(camera.position, _fw, maxD);
  if (r.c) return _aimP.copy(camera.position).addScaledVector(_fw, r.t);
  _aimP.copy(camera.position).addScaledVector(_fw, Math.min(maxD, 120)); _aimP.y = groundH(_aimP.x, _aimP.z); return _aimP;
}
function aimTarget() {
  camera.getWorldDirection(_fw);
  let best = null, ba = .07;
  const test = (ref, y, rad) => {
    _bd.set(ref.pos.x, y, ref.pos.z).sub(camera.position); const d = _bd.length(); _bd.divideScalar(d);
    const a = Math.acos(clamp(_bd.dot(_fw), -1, 1)) - Math.atan(rad / d);
    if (a < ba && d < 400) { _fb.set(ref.pos.x, y, ref.pos.z); if (los(camera.position, _fb)) { ba = a; best = ref; } }
  };
  for (const c of chars) if (c.team === 'enemy' && c.alive) test(c, aimYOf(c), .5);
  for (const v of vehicles) if (v.team === 'enemy' && v.alive) test(v, aimYOf(v), v.rad);
  return best;
}

/* ---------- player bullets: ballistic, substepped ---------- */
const bullets = [];
const BT = [];
for (let k = 0; k < 48; k++) { const m = new THREE.Mesh(GB, TR_MATS.ally); m.visible = false; m.frustumCulled = false; m.renderOrder = 5; scene.add(m); BT.push(m); }
let btI = 0;
function spawnBullet(o, dir, d, mz) {
  const b = { p: o.clone(), v: dir.clone().multiplyScalar(d.vel), d, life: Math.min(3, 1100 / d.vel), travel: 0, tail: mz.clone(), m: null, fade: 0, near: new Set() };
  if (!d.silenced) { b.m = BT[btI++ % BT.length]; b.m.visible = true; }
  bullets.push(b);
}
const _bp = new V3(), _bs = new V3(), _bh = new V3(), _bn = new V3(), _hd = new V3();
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    if (b.fade > 0) { b.fade -= dt; if (b.fade <= 0) { if (b.m) b.m.visible = false; bullets.splice(i, 1); } continue; }
    const steps = Math.max(1, Math.ceil(b.v.length() * dt / 25)), sdt = dt / steps;
    let hit = false;
    for (let s = 0; s < steps && !hit; s++) {
      _bp.copy(b.p); b.v.y -= 9.8 * sdt; b.p.addScaledVector(b.v, sdt);
      _bs.copy(b.p).sub(_bp); const L = _bs.length(); if (L < 1e-6) continue; _bs.divideScalar(L);
      hit = bulletTrace(_bp, _bs, L, b);
      b.travel += L;
    }
    b.life -= dt;
    if (b.m) drawBullet(b);
    if (hit) { b.fade = .03; continue; }
    if (b.life <= 0) { if (b.m) b.m.visible = false; bullets.splice(i, 1); }
  }
}
function drawBullet(b) {
  const head = b.p; _hd.copy(head).sub(b.tail); let L = _hd.length();
  if (L < .05) return;
  const maxL = 9; if (L > maxL) { b.tail.copy(head).addScaledVector(_hd, -maxL / L); L = maxL; }
  b.m.position.copy(b.tail).add(head).multiplyScalar(.5); b.m.lookAt(head);
  const w = .022 * (1 + camera.position.distanceTo(b.m.position) * .015); b.m.scale.set(w, w, L);
}
function bulletTrace(o, d, L, b) {
  let best = L, kind = 0, ref = null, hc = null;
  const ex = o.x + d.x * L, ez = o.z + d.z * L, mnx = Math.min(o.x, ex) - 1, mxx = Math.max(o.x, ex) + 1, mnz = Math.min(o.z, ez) - 1, mxz = Math.max(o.z, ez) + 1;
  for (const c of colliders) {
    if (!c.on || c.x1 < mnx || c.x0 > mxx || c.z1 < mnz || c.z0 > mxz) continue;
    const t = rayAABB(o, d, c.x0, c.x1, c.y0, c.h, c.z0, c.z1, best); if (t < best) { best = t; kind = 1; hc = c; }
  }
  const gy = groundH(ex, ez);
  if (o.y + d.y * L < gy && d.y < 0) { const t = (groundH(o.x, o.z) - o.y) / d.y; const tt = clamp(t, 0, L); if (tt < best) { best = tt; kind = ez < -150 && gy < -1 ? 7 : 2; } }
  for (const e of chars) {
    if (e.team !== 'enemy' || !e.alive) continue;
    if (Math.abs(e.pos.x - o.x) > L + 2 && Math.abs(e.pos.x - ex) > 2) continue;
    const hy = e.headY();
    let t = raySphere(o, d, e.pos.x, hy, e.pos.z, .19, best);
    if (t < best) { best = t; kind = 3; ref = e; continue; }
    t = rayAABB(o, d, e.pos.x - .3, e.pos.x + .3, e.pos.y, hy - .12, e.pos.z - .3, e.pos.z + .3, best);
    if (t < best) { best = t; kind = 4; ref = e; }
    // near-miss suppression
    if (!b.near.has(e)) { _bn.set(e.pos.x, e.aimY(), e.pos.z); if (segPointDist2(o, d, L, _bn) < 6.5) { b.near.add(e); e.supp = Math.min(1, e.supp + (b.d.heavy ? .3 : .18)); } }
  }
  for (const v of vehicles) {
    if (v.team !== 'enemy' || !v.alive) continue;
    for (const s of v.T.sph) { vehSphere(v, s, _bn); const t = raySphere(o, d, _bn.x, _bn.y, _bn.z, s[3], best); if (t < best) { best = t; kind = 5; ref = v; } }
  }
  for (const br of barrels) { if (!br.alive) continue; const t = raySphere(o, d, br.x, .5, br.z, .42, best); if (t < best) { best = t; kind = 6; ref = br; } }
  if (!kind) return false;
  _bh.copy(o).addScaledVector(d, best);
  const dist = b.travel + best;
  switch (kind) {
    case 1: fxImpact(_bh, 'conc'); holeDecals.place(_bh, boxNormal(_bh, hc, _bn)); if (hc.destr) { hc.destr.hp -= b.d.dmg * .04; if (hc.destr.hp <= 0) damageDestructibles(_bh, 1, 1); } break;
    case 2: fxImpact(_bh, 'sand'); break;
    case 7: fxImpact(_bh, 'water'); break;
    case 3: case 4: {
      const head = kind === 3; let dmg = b.d.dmg * (head ? b.d.head : 1);
      if (b.d.silenced && dist > 45) dmg *= .7;
      const was = ref.alive; ref.damage(dmg, P, head);
      fxImpact(_bh, 'blood'); P.hits++;
      HUD.hit(was && !ref.alive, head);
      if (b.d.pierce && R() < .5) return false;
      break;
    }
    case 5: ref.damage(b.d.dmg * ref.armorB * (b.d.pierce ? 4 : 1), P); fxImpact(_bh, 'metal'); HUD.hit(!ref.alive, false); P.hits++; break;
    case 6: hitBarrel(ref, b.d.dmg, P); fxImpact(_bh, 'metal'); break;
  }
  b.p.copy(_bh);
  return true;
}

/* ---------- firing ---------- */
function tryFire(s) {
  const d = s.d;
  if (WS.fireCd > 0 || WS.boltT > 0) return;
  if (!d.auto && !mouse.lPressed) return;
  mouse.lPressed = false;
  if (P.downed && WS.cur !== 1) return;
  if (s.mag <= 0) { sfx('click', .6); if (s.res > 0) startReload(); return; }
  s.mag--; WS.fireCd = 60 / d.rpm; P.shots++;
  camBasis(); muzzleWorld(_mw);
  if (d.proj) fireLauncher(s, d);
  else {
    let sp = lerp(d.spread, d.ads, WS.ads) * (P.speed > 1 ? 1.5 : 1) * (P.stance === 1 ? .75 : P.stance === 2 ? .55 : 1) * (P.onGround ? 1 : 2) + WS.bloom * (1 - WS.ads * .6);
    if (P.downed) sp *= 1.5;
    if (WS.scoped && keys.ShiftLeft && P.breath > 0) sp *= .3;
    _bd.copy(_fw).addScaledVector(_rt, (R() + R() - 1) * sp).addScaledVector(_up, (R() + R() - 1) * sp).normalize();
    spawnBullet(camera.position, _bd, d, _mw);
    WS.bloom = Math.min(WS.bloom + d.recoil * .55, .05);
  }
  const rk = d.recoil * (1 - WS.ads * .35) * (P.stance === 2 ? .5 : P.stance === 1 ? .8 : 1) * (d.heavy && P.stance === 2 ? .7 : 1);
  P.pitch = clamp(P.pitch + rk * .4, -1.5, 1.5); P.recoilP += rk * .6; P.recoilY += rand(-.5, .5) * rk * .8;
  WS.kick = 1; WS.flashT = d.silenced ? 0 : .045;
  const b = s.b; b.fl.material.rotation = R() * TAU; b.fl.scale.setScalar((b.flash || .3) * rand(.8, 1.25));
  if (!d.silenced) { muzzleLight.position.copy(_mw); muzzleLight.intensity = 3.5; }
  sfx(d.snd, 1);
  if (d.bolt && s.mag > 0) { WS.boltT = d.bolt; sfx('bolt', .7, null, .3); }
  if (s.mag === 0 && s.res > 0) WS.autoReload = d.proj ? .4 : .25;
}
function fireLauncher(s, d) {
  const o = _bh.copy(camera.position).addScaledVector(_fw, .9).addScaledVector(_rt, .1).addScaledVector(_up, -.06);
  const guided = d.proj === 'smaw';
  spawnProj(guided ? 'smaw' : 'rocket', o, _fw.clone().multiplyScalar(guided ? 62 : 88), 'ally', P, { dmg: 950, r: 7, life: 6, grav: guided ? 0 : 2, guided });
  if (s.b.war) for (const m of s.b.war) m.visible = false;
  for (let i = 0; i < 10; i++) smoke.spawn(camera.position.x - _fw.x * 2, camera.position.y, camera.position.z - _fw.z * 2, -_fw.x * rand(4, 9) + rand(-1, 1), rand(0, 1.5), -_fw.z * rand(4, 9) + rand(-1, 1), 1.2, 3, 1.8, C_SMOKE_L, .55, 2);
  G.shake = Math.max(G.shake, .25);
}

/* ---------- grenades, C4, knife ---------- */
function throwGrenade(kind) {
  if (WS.throwT > 0 || P.downed || P.vaultT > 0) return;
  if (kind === 'frag' ? WS.frag <= 0 : WS.smokeG <= 0) { sfx('click', .4); return; }
  if (kind === 'frag') WS.frag--; else WS.smokeG--;
  WS.throwT = .6; WS.reloading = false; sfx('pin', .6);
  later(.22, () => {
    camBasis();
    const o = _bh.copy(camera.position).addScaledVector(_fw, .5).addScaledVector(_rt, .15);
    const v = _fw.clone().multiplyScalar(18).addScaledVector(_up, 4).add(P.vel);
    spawnProj(kind === 'frag' ? 'grenade' : 'smokeG', o, v, 'ally', P, { fuse: kind === 'frag' ? 2.4 : 1.3, dmg: 260, r: 7.5 });
    sfx('throw', .7);
  });
}
function placeC4() {
  if (P.downed || WS.c4 <= 0 || WS.throwT > 0) { if (WS.c4 <= 0) sfx('click', .4); return; }
  camBasis();
  const r = rayWorld(camera.position, _fw, 3.5);
  const p = r.c ? camera.position.clone().addScaledVector(_fw, r.t - .05) : new V3(P.pos.x - Math.sin(P.yaw) * 1.2, P.pos.y + .05, P.pos.z - Math.cos(P.yaw) * 1.2);
  const g = new THREE.Group(); box(g, .3, .12, .2, 0xb6ab86); box(g, .06, .04, .06, 0x222222, 0, .08, 0);
  const led = new THREE.Mesh(sphG(.025, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, .3, .2) })); led.position.set(.1, .08, 0); g.add(led);
  g.position.copy(p); g.rotation.y = P.yaw; scene.add(g);
  WS.c4s.push({ m: g, led }); WS.c4--; WS.throwT = .5; sfx('beep', .5);
  HUD.sub('', 'מטען הונח · F לפיצוץ');
}
function detonateC4() {
  if (!WS.c4s.length) return;
  sfx('beep', .6);
  const list = WS.c4s.splice(0);
  list.forEach((c, i) => later(.15 + i * .12, () => { scene.remove(c.m); explode(c.m.position.clone(), 700, 8.5, 'ally', P, { s: 1.7 }); }));
}
function meleeAttack() {
  if (WS.meleeT > 0 || P.downed) return;
  WS.meleeT = .45; WS.reloading = false; sfx('knife', .8);
  camBasis();
  for (const e of chars) {
    if (e.team !== 'enemy' || !e.alive) continue;
    _bd.set(e.pos.x - P.pos.x, 0, e.pos.z - P.pos.z); const d = _bd.length(); if (d > 2.4 || Math.abs(e.pos.y - P.pos.y) > 1.5) continue;
    _bd.divideScalar(d); if (_bd.x * _fw.x + _bd.z * _fw.z < Math.cos(.8) * Math.hypot(_fw.x, _fw.z)) continue;
    e.damage(400, P, false); fxImpact(_bd.set(e.pos.x, e.pos.y + 1.2, e.pos.z), 'blood'); HUD.hit(true, false); break;
  }
}

/* ---------- per-frame weapon state & procedural viewmodel animation ---------- */
function updateWeapons(dt) {
  const s = WS.slots[WS.cur]; if (!s) return;
  const d = s.d, b = s.b;
  WS.fireCd -= dt; WS.switchT = Math.max(0, WS.switchT - dt); WS.boltT = Math.max(0, WS.boltT - dt);
  WS.meleeT = Math.max(0, WS.meleeT - dt); WS.throwT = Math.max(0, WS.throwT - dt); WS.flashT -= dt;
  WS.bloom = Math.max(0, WS.bloom - dt * .12);
  if (WS.reloading) {
    WS.reloadT -= dt;
    if (!WS.reloadMid && WS.reloadT < d.reload * .45) { WS.reloadMid = true; sfx('magIn', .6); if (b.war) for (const m of b.war) m.visible = true; }
    if (WS.reloadT <= 0) finishReload();
  }
  if (WS.autoReload > 0) { WS.autoReload -= dt; if (WS.autoReload <= 0) startReload(); }
  const busy = WS.switchT > 0 || WS.reloading || WS.meleeT > 0 || WS.throwT > 0 || P.vaultT > 0;
  const adsT = mouse.r && !P.sprinting && !busy && !(d.bolt && WS.boltT > .15) ? 1 : 0;
  WS.ads = damp(WS.ads, adsT, d.scope ? 10 : 14, dt);
  WS.scoped = !!d.scope && WS.ads > .88;
  WS.sprintA = damp(WS.sprintA, P.sprinting ? 1 : 0, 10, dt);
  if (mouse.l && !busy && WS.sprintA < .4 && G.state === 'play') tryFire(s);
  const base = 78 + (P.sprinting ? 5 : 0);
  const fov = WS.scoped ? d.fov : lerp(base, d.scope ? 42 : d.fov, WS.ads);
  if (Math.abs(camera.fov - fov) > .01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  postMat.uniforms.scope.value = WS.scoped ? 1 : 0;
  postMat.uniforms.ads.value = d.scope ? 0 : WS.ads;
  VM.root.visible = !WS.scoped;
  if (FPArms.root) FPArms.root.visible = !WS.scoped;
  b.fl.visible = WS.flashT > 0;
  for (const c of WS.c4s) c.led.visible = Math.sin(G.time * 12) > 0;
  poseViewmodel(dt, s);
  if (FPArms.root && !WS.scoped) {
    VM.root.updateMatrixWorld(true);
    b.g.localToWorld(_fpR.copy(b.rg).add(FP_OFF_R)); b.g.localToWorld(_fpL.copy(b.lg).add(FP_OFF_L));
    FPArms.update(_fpR, _fpL);
  }
}
const _fpR = new V3(), _fpL = new V3(), FP_OFF_R = new V3(0, .0, .06), FP_OFF_L = new V3(-.02, -.045, .02);
function poseViewmodel(dt, s) {
  const b = s.b, d = s.d, a = WS.ads;
  let x = lerp(b.hip.x, 0, a), y = lerp(b.hip.y, -b.sightY, a), z = lerp(b.hip.z - .05, -b.adsZ, a);
  const mv = Math.min(1, P.speed / 5) * (P.onGround ? 1 : .3), bo = 1 - a * .9, sp = WS.sprintA;
  WS.bobT += dt * P.speed * 1.3;
  x += Math.sin(WS.bobT) * .014 * mv * bo * (1 + sp); y += -Math.abs(Math.cos(WS.bobT)) * .014 * mv * bo * (1 + sp * 1.3);
  WS.swX = damp(WS.swX, 0, 7, dt); WS.swY = damp(WS.swY, 0, 7, dt); WS.kick = damp(WS.kick, 0, 14, dt);
  let rx = WS.kick * .09 * (d.heavy ? 1.2 : 1) - WS.swY * .0009 * bo, ry = -WS.swX * .0009 * bo, rz = -WS.swX * .0004;
  z += WS.kick * .055 * (d.proj ? 2 : 1); y += WS.kick * .008;
  x += .06 * sp; y -= .06 * sp; ry += .65 * sp; rz += .25 * sp; rx -= .15 * sp;
  if (P.stance === 2 && a < .5) rz += .12;
  if (P.downed) { rz += .35; y -= .03; }
  if (WS.reloading) { const r = 1 - WS.reloadT / d.reload, dip = Math.sin(clamp(r, 0, 1) * PI); y -= dip * .13; rx -= dip * .55; rz += dip * .6; x += dip * .03; }
  if (WS.boltT > 0) { const k = Math.sin((1 - WS.boltT / d.bolt) * PI); rz += k * .35; y -= k * .04; }
  if (WS.switchT > 0) { const k = WS.switchT / .4; y -= k * .32; rx -= k * .6; }
  if (WS.meleeT > 0) { const k = Math.sin((1 - WS.meleeT / .45) * PI); x -= k * .12; z -= k * .2; ry += k * .5; rz -= k * .5; }
  if (WS.throwT > 0) { const k = Math.sin((1 - WS.throwT / .6) * PI); y -= k * .35; rx -= k * .8; }
  VM.root.position.set(x, y, z); VM.root.rotation.set(rx, ry, rz);
}

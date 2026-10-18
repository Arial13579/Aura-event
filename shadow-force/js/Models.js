'use strict';
/* =====================================================================
   Models.js — the embedded animated soldier (glTF, Mixamo rig):
   skinned clones per team, blended Idle/Walk/Run, analytic two-bone IK
   so hands grip the rifle and knees bend when crouching, and gloved
   first-person arms built from the same rig.
   ===================================================================== */
const Models = { ready: false, soldier: null, clips: {}, mats: {}, props: {}, propSize: {} };
function b64buf(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function loadModels() { return Promise.all([loadSoldier(), loadProps()]); }
/* Poly Haven CC0 props (glTF with embedded textures) */
function loadProps() {
  if (!window.PH_MODELS || !THREE.GLTFLoader) return Promise.resolve();
  const loader = new THREE.GLTFLoader();
  return Promise.all(Object.entries(window.PH_MODELS).map(([k, json]) => new Promise(res => {
    try {
      loader.parse(json, '', g => {
        g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.envMapIntensity = .8; } });
        Models.props[k] = g.scene;
        const b = new THREE.Box3().setFromObject(g.scene); Models.propSize[k] = { size: b.getSize(new V3()), min: b.min.clone() };
        res();
      }, e => { console.warn('prop', k, e); res(); });
    } catch (e) { console.warn('prop', k, e); res(); }
  })));
}
function propClone(k) { const s = Models.props[k]; return s ? s.clone() : null; }
/* photographed PBR surfaces (Poly Haven CC0): one decoded image shared by every repeat variant */
const _phImg = {};
function phTex(name, kind, rep, srgb) {
  const src = window.PH_TEX && PH_TEX[name] && PH_TEX[name][kind]; if (!src) return null;
  const key = name + kind;
  let e = _phImg[key];
  if (!e) { const img = new Image(); e = _phImg[key] = { img, texs: [] }; img.onload = () => { for (const t of e.texs) t.needsUpdate = true; }; img.src = src; }
  const t = new THREE.Texture(e.img); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = Math.min(8, maxAniso);
  if (rep) t.repeat.set(rep[0], rep[1]);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  if (e.img.complete && e.img.naturalWidth) t.needsUpdate = true;
  e.texs.push(t); return t;
}
function phMat(name, o = {}) {
  if (!PBR || !window.PH_TEX || !PH_TEX[name]) return null;
  const rep = o.rep;
  return new THREE.MeshStandardMaterial(Object.assign({ map: phTex(name, 'diff', rep, true), normalMap: phTex(name, 'nor', rep), roughnessMap: phTex(name, 'rough', rep), roughness: 1, metalness: 0 }, o.mat || {}));
}
const _skinC = {};
function vehicleSkin(root) {
  if (!PBR || !window.PH_TEX) return root;
  root.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial || o.material.map) return;
    const c = o.material.color, lum = c.r + c.g + c.b;
    if (lum < .03 || o.material.transparent) return;
    const k = c.getHexString();
    if (!_skinC[k]) _skinC[k] = new THREE.MeshStandardMaterial({ color: c.clone(), normalMap: phTex('metal_plate', 'nor'), normalScale: new THREE.Vector2(.45, .45), roughnessMap: phTex('metal_plate', 'rough'), roughness: .95, metalness: .3 });
    o.material = _skinC[k];
  });
  return root;
}
function loadSoldier() {
  return new Promise(res => {
    if (!window.ASSET_SOLDIER || !THREE.GLTFLoader || !THREE.SkeletonUtils) return res(false);
    try {
      new THREE.GLTFLoader().parse(b64buf(window.ASSET_SOLDIER), '', gltf => {
        Models.soldier = gltf.scene;
        for (const a of gltf.animations) Models.clips[a.name] = a;
        gltf.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false; } });
        Models.ready = true; res(true);
      }, err => { console.warn('soldier model', err); res(false); });
    } catch (e) { console.warn('soldier model', e); res(false); }
  });
}
const TEAM_TINT = { ally: [.82, .8, .64], enemy: [.4, .34, .27], hostage: [.95, .9, .82], fp: [.82, .8, .64] };
function teamMat(m, team) {
  const k = team + m.uuid;
  if (!Models.mats[k]) { const c = m.clone(); const t = TEAM_TINT[team] || TEAM_TINT.ally; c.color.setRGB(t[0], t[1], t[2]); c.envMapIntensity = .7; Models.mats[k] = c; }
  return Models.mats[k];
}

/* ---------- analytic two-bone IK (works with any bone orientation) ---------- */
const _ia = new V3(), _ib = new V3(), _ic = new V3(), _it = new V3(), _ie = new V3(), _ix = new V3(), _iy = new V3();
const _ie2 = new V3(), _it2 = new V3();
const _iq1 = new THREE.Quaternion(), _iq2 = new THREE.Quaternion(), _iq3 = new THREE.Quaternion();
function aimBone(bone, from, cur, want) {
  _ix.copy(cur).sub(from).normalize(); _iy.copy(want).sub(from).normalize();
  if (_ix.lengthSq() < .5 || _iy.lengthSq() < .5) return;
  _iq1.setFromUnitVectors(_ix, _iy);
  bone.getWorldQuaternion(_iq2); _iq2.premultiply(_iq1);
  bone.parent.getWorldQuaternion(_iq3); _iq3.invert();
  bone.quaternion.copy(_iq3.multiply(_iq2));
  bone.updateMatrixWorld(true);
}
function ik2(upper, lower, end, target, pole) {
  upper.getWorldPosition(_ia); lower.getWorldPosition(_ib); end.getWorldPosition(_ic);
  const l1 = _ia.distanceTo(_ib), l2 = _ib.distanceTo(_ic);
  _it.copy(target); let d = _it.distanceTo(_ia);
  const maxd = (l1 + l2) * .995;
  if (d > maxd) { _it.sub(_ia).setLength(maxd).add(_ia); d = maxd; }
  d = Math.max(d, Math.abs(l1 - l2) + 1e-3);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ax = _iy.copy(_it).sub(_ia).normalize();
  _ie.copy(pole).sub(_ia); _ie.addScaledVector(ax, -_ie.dot(ax)); if (_ie.lengthSq() < 1e-8) _ie.set(0, -1, 0); _ie.normalize();
  _ie.multiplyScalar(h).addScaledVector(ax, a).add(_ia);
  _ie2.copy(_ie); _it2.copy(_it);
  aimBone(upper, _ia, _ib, _ie2);
  lower.getWorldPosition(_ib); end.getWorldPosition(_ic);
  aimBone(lower, _ib, _ic, _it2);
}

/* ---------- third-person rig ---------- */
const _rp = new V3(), _rf1 = new V3(), _rf2 = new V3(), _rh = new V3(), _rpole = new V3();
class Rig {
  constructor(team) {
    this.root = THREE.SkeletonUtils.clone(Models.soldier);
    this.root.rotation.y = PI;
    this.root.traverse(o => { if (o.isMesh) { o.material = teamMat(o.material, team); if (team === 'enemy' && /visor/i.test(o.name)) o.visible = false; } });
    const B = n => this.root.getObjectByName('mixamorig' + n) || this.root.getObjectByName('mixamorig:' + n);
    this.b = {
      hips: B('Hips'), spine: B('Spine2'), rArm: B('RightArm'), rFore: B('RightForeArm'), rHand: B('RightHand'),
      lArm: B('LeftArm'), lFore: B('LeftForeArm'), lHand: B('LeftHand'),
      lUp: B('LeftUpLeg'), lLeg: B('LeftLeg'), lFoot: B('LeftFoot'), rUp: B('RightUpLeg'), rLeg: B('RightLeg'), rFoot: B('RightFoot')
    };
    this.ok = Object.values(this.b).every(Boolean);
    this.mixer = new THREE.AnimationMixer(this.root);
    this.act = {}; this.w = { Idle: 1, Walk: 0, Run: 0 };
    for (const n of ['Idle', 'Walk', 'Run']) { const a = this.mixer.clipAction(Models.clips[n]); a.play(); a.setEffectiveWeight(this.w[n]); a.time = Math.random() * a.getClip().duration; this.act[n] = a; }
  }
  update(dt, g, speed, crouch, gun, grips) {
    const want = speed < .3 ? 'Idle' : speed < 4.2 ? 'Walk' : 'Run';
    for (const n in this.act) { this.w[n] = damp(this.w[n], n === want ? 1 : 0, 8, dt); this.act[n].setEffectiveWeight(this.w[n]); }
    this.act.Walk.timeScale = clamp(speed / 1.7, .6, 2); this.act.Run.timeScale = clamp(speed / 6, .7, 1.6);
    this.mixer.update(dt);
    if (!this.ok) return;
    g.updateMatrixWorld(true);
    const b = this.b;
    if (crouch > .02) {
      b.lFoot.getWorldPosition(_rf1); b.rFoot.getWorldPosition(_rf2);
      b.hips.getWorldPosition(_rh); _rh.y -= .48 * crouch;
      b.hips.parent.worldToLocal(_rh); b.hips.position.copy(_rh); b.hips.updateMatrixWorld(true);
      ik2(b.lUp, b.lLeg, b.lFoot, _rf1, g.localToWorld(_rpole.set(.2, .5, 1.2)));
      ik2(b.rUp, b.rLeg, b.rFoot, _rf2, g.localToWorld(_rpole.set(-.2, .5, 1.2)));
    }
    if (gun && grips) {
      gun.updateMatrixWorld(true);
      ik2(b.rArm, b.rFore, b.rHand, gun.localToWorld(_rp.copy(grips.r)), g.localToWorld(_rpole.set(-.9, .2, -.6)));
      ik2(b.lArm, b.lFore, b.lHand, gun.localToWorld(_rp.copy(grips.l)), g.localToWorld(_rpole.set(.9, .3, -.2)));
    }
  }
}

const FP_CURL_AXIS = new V3(1, 0, 0); let FP_CURL_SIGN = -1;
const FP_RDIR = new V3(-.55, -.55, -.62).normalize(), FP_LDIR = new V3(.35, .15, -.92).normalize();
/* ---------- first-person arms (same rig, body collapsed out of view) ---------- */
const FPArms = {
  root: null, b: null, base: null,
  build() {
    if (!Models.ready) return false;
    this.root = THREE.SkeletonUtils.clone(Models.soldier);
    this.root.traverse(o => { if (o.isMesh) { o.material = teamMat(o.material, 'fp'); o.castShadow = false; if (/visor/i.test(o.name)) o.visible = false; } });
    const B = n => this.root.getObjectByName('mixamorig' + n) || this.root.getObjectByName('mixamorig:' + n);
    this.b = { rArm: B('RightArm'), rFore: B('RightForeArm'), rHand: B('RightHand'), lArm: B('LeftArm'), lFore: B('LeftForeArm'), lHand: B('LeftHand'), neck: B('Neck'), lUp: B('LeftUpLeg'), rUp: B('RightUpLeg'), rMid: B('RightHandMiddle1'), lMid: B('LeftHandMiddle1') };
    this.fingers = [];
    for (const side of ['Right', 'Left']) for (const f of ['Index', 'Middle', 'Ring', 'Pinky', 'Thumb']) for (let k = 1; k <= 3; k++) { const bn = B(side + 'Hand' + f + k); if (bn) this.fingers.push({ bn, side, f, k }); }
    if (!Object.values(this.b).every(Boolean)) return false;
    const mixer = new THREE.AnimationMixer(this.root); mixer.clipAction(Models.clips.Idle).play(); mixer.update(.4);
    for (const k of ['neck', 'lUp', 'rUp']) this.b[k].scale.setScalar(.001);
    // close the fingers into a grip
    for (const fi of this.fingers) {
      const ang = fi.f === 'Thumb' ? (fi.k === 1 ? .3 : .45) : (fi.k === 1 ? .9 : 1.25);
      _iq1.setFromAxisAngle(FP_CURL_AXIS, ang * (fi.side === 'Right' ? FP_CURL_SIGN : -FP_CURL_SIGN)); fi.bn.quaternion.multiply(_iq1);
    }
    this.base = ['rArm', 'rFore', 'rHand', 'lArm', 'lFore', 'lHand'].map(k => [this.b[k], this.b[k].quaternion.clone()]);
    this.root.scale.setScalar(1.65); this.root.position.set(0, -2.95, .05);
    wScene.add(this.root);
    return true;
  },
  update(rg, lg) {
    if (!this.root) return;
    for (const [bn, q] of this.base) bn.quaternion.copy(q);
    this.root.updateMatrixWorld(true);
    ik2(this.b.rArm, this.b.rFore, this.b.rHand, rg, _rpole.set(.9, -1.4, .5));
    ik2(this.b.lArm, this.b.lFore, this.b.lHand, lg, _rpole.set(-1.2, -2.2, .3));
    // point the fingers along the grip / under the handguard
    const h = this.b.rHand; h.getWorldPosition(_ia); this.b.rMid.getWorldPosition(_ib); aimBone(h, _ia, _ib, _ic.copy(_ia).add(FP_RDIR));
    const l = this.b.lHand; l.getWorldPosition(_ia); this.b.lMid.getWorldPosition(_ib); aimBone(l, _ia, _ib, _ic.copy(_ia).add(FP_LDIR));
  }
};

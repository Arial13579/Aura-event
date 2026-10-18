'use strict';
/* =====================================================================
   Actors.js — soldier meshes (with a low-detail LOD), the shared
   Soldier base class (movement, animation, firing, damage) and target
   selection used by every AI brain.
   ===================================================================== */
const chars = [];
const ROLE = {
  // friendly fireteam
  sniper: { hp: 240, dmg: 115, rate: 1.9, burst: [1, 1], pause: [1.7, 2.6], range: 200, acc: .82, speed: 4.6, snd: 'sniper', mag: 5, trc: 'ally' },
  medic: { hp: 240, dmg: 20, rate: .12, burst: [3, 5], pause: [.5, 1.1], range: 85, acc: .38, speed: 5, snd: 'm4', mag: 30, trc: 'ally' },
  mg: { hp: 290, dmg: 21, rate: .075, burst: [8, 16], pause: [.35, .8], range: 105, acc: .32, speed: 4.3, snd: 'lmg', mag: 100, trc: 'ally' },
  at: { hp: 250, dmg: 20, rate: .12, burst: [3, 5], pause: [.6, 1.2], range: 90, acc: .38, speed: 4.6, snd: 'm4', mag: 30, trc: 'ally' },
  // insurgents
  rifle: { hp: 100, dmg: 7, rate: .11, burst: [3, 6], pause: [1, 2.2], range: 80, acc: .3, speed: 3.6, snd: 'ak', mag: 30, trc: 'enemy' },
  pkm: { hp: 150, dmg: 7, rate: .085, burst: [7, 13], pause: [1.2, 2.4], range: 92, acc: .24, speed: 3, snd: 'lmg', mag: 100, trc: 'enemy' },
  rpgE: { hp: 110, dmg: 0, rate: 7, burst: [1, 1], pause: [6, 9], range: 100, acc: .6, speed: 3.4, snd: 'rocket', rocket: true, mag: 1, trc: 'enemy' },
  marksman: { hp: 110, dmg: 22, rate: 2.6, burst: [1, 1], pause: [2.6, 3.8], range: 175, acc: .4, speed: 3, snd: 'sniper', mag: 10, trc: 'enemy' },
  hostage: { hp: 1e9, dmg: 0, rate: 9, burst: [1, 1], pause: [9, 9], range: 0, acc: 0, speed: 4.4, snd: 'm4', mag: 1, trc: 'ally' }
};

/* ---------- soldier mesh ---------- */
function makeSoldier(team, role) {
  const en = team === 'enemy', hs = role === 'hostage';
  const pal = hs ? { pant: 0x4a4a52, shirt: 0x9a8f7a, vest: 0x9a8f7a, skin: 0xb08a6a }
    : en ? { pant: 0x2e2c28, shirt: 0x3d3a33, vest: 0x24231f, skin: 0x1f1e1c, band: 0x3d7a32 }
      : { pant: 0x575a40, shirt: 0x62654b, vest: 0x6e6b4d, skin: 0xb58866, helm: 0x6a6648 };
  if (en && role === 'pkm') pal.shirt = 0x4a4033;
  if (en && role === 'marksman') { pal.shirt = 0x6b5f45; pal.pant = 0x5a5040; }
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const hi = new THREE.Group(); g.add(hi);
  const hip = new THREE.Group(); hip.position.y = .95; hi.add(hip);
  const legL = new THREE.Group(); legL.position.x = -.12; hip.add(legL);
  box(legL, .19, .9, .22, pal.pant, 0, -.45, 0); box(legL, .21, .14, .32, 0x1d1b17, 0, -.88, .05);
  const legR = new THREE.Group(); legR.position.x = .12; hip.add(legR);
  box(legR, .19, .9, .22, pal.pant, 0, -.45, 0); box(legR, .21, .14, .32, 0x1d1b17, 0, -.88, .05);
  const tor = new THREE.Group(); tor.position.y = .95; hi.add(tor);
  box(tor, .48, .62, .27, pal.shirt, 0, .32, 0);
  if (!hs) box(tor, .54, .44, .34, pal.vest, 0, .36, .01);
  box(tor, .23, .26, .25, pal.skin, 0, .8, 0);
  if (pal.helm) { sph(tor, .165, pal.helm, 0, .9, 0, 1.05, .78, 1.15); box(tor, .1, .07, .05, 0x1a1a1a, 0, .96, .17); box(tor, .2, .05, .03, 0x22221f, 0, .82, .13); }
  if (en) box(tor, .245, .05, .265, pal.band, 0, .88, 0);
  if (en && role === 'marksman') sph(tor, .17, 0x5f5641, 0, .86, -.02, 1.1, .9, 1.15);
  if (!en && !hs) box(tor, .36, .42, .18, role === 'medic' ? 0x6a6a4a : 0x5a5a40, 0, .36, -.24);
  if (role === 'medic') { box(tor, .14, .14, .02, 0xf2f2f2, 0, .42, -.34); box(tor, .1, .03, .021, 0xc0201a, 0, .42, -.345); box(tor, .03, .1, .021, 0xc0201a, 0, .42, -.345); }
  const armR = new THREE.Group(); armR.position.set(.3, .6, 0); tor.add(armR); box(armR, .12, .55, .12, pal.shirt, 0, -.26, 0);
  const armL = new THREE.Group(); armL.position.set(-.3, .6, 0); tor.add(armL); box(armL, .12, .55, .12, pal.shirt, 0, -.26, 0);
  if (role === 'medic') box(armL, .13, .1, .13, 0xeeeeee, 0, -.12, 0);
  const gun = new THREE.Group(); gun.position.set(.05, .42, .32); tor.add(gun);
  const blk = 0x1b1b1b, wood = 0x6b4423;
  if (hs) { armR.rotation.set(.5, 0, -.2); armL.rotation.set(.5, 0, .2); }
  else {
    armR.rotation.x = -1.25; armL.rotation.set(-1.35, 0, .45);
    if (role === 'sniper') { box(gun, .06, .09, 1.35, 0x3d3a2c, 0, 0, .2); cyl(gun, .035, .035, .32, blk, 0, .09, .1, PI / 2); }
    else if (role === 'mg') { box(gun, .09, .12, 1.05, blk, 0, 0, .15); box(gun, .1, .14, .14, 0x4e5236, -.08, -.08, 0); }
    else if (role === 'rpgE') { cyl(gun, .05, .05, 1.0, 0x4e5236, 0, .12, .05, PI / 2); cyl(gun, .0, .08, .26, 0x4e5236, 0, .12, .66, PI / 2); }
    else if (role === 'pkm') { box(gun, .09, .11, 1.0, blk, 0, 0, .12); box(gun, .1, .12, .12, wood, 0, -.06, -.3); }
    else if (en) { box(gun, .06, .09, .82, blk, 0, 0, .1); box(gun, .065, .07, .25, wood, 0, -.01, -.22); box(gun, .045, .17, .06, 0x7a4a22, 0, -.12, .12, .35); if (role === 'marksman') { box(gun, .05, .07, .5, blk, 0, 0, .7); cyl(gun, .03, .03, .25, blk, 0, .08, .1, PI / 2); } }
    else { box(gun, .06, .1, .82, blk, 0, 0, .1); box(gun, .04, .12, .06, blk, 0, -.1, .1); cyl(gun, .022, .022, .08, blk, 0, .08, .05, PI / 2); }
    if (role === 'at') cyl(tor, .065, .065, 1.15, 0x4e5236, .05, .45, -.28, 0, 0, .45);
  }
  // low-detail stand-in for distance
  const lo = new THREE.Group(); lo.visible = false; g.add(lo);
  box(lo, .5, 1.45, .3, pal.shirt, 0, .78, 0); box(lo, .24, .3, .26, pal.helm || pal.skin, 0, 1.68, 0);
  shadows(g, true, false);
  return { g, hi, lo, hip, legL, legR, tor, armL, armR, gun };
}

/* ---------- helpers ---------- */
function aimYOf(r) {
  if (r === P) return P.eyeY - .35;
  if (r.isVeh) return r.pos.y + (r.air ? 0 : 1.6);
  return r.aimY();
}
function isAlive(t) {
  if (!t) return false;
  if (t === P) return P.alive && !P.downed;
  if (t.isVeh) return t.alive;
  return t.alive && !t.downed;
}
function enemyCount() { let n = 0; for (const c of chars) if (c.team === 'enemy' && c.alive) n++; return n; }
function enemiesNear(p, r) { let n = 0; const r2 = r * r; for (const c of chars) if (c.team === 'enemy' && c.alive && (c.pos.x - p.x) ** 2 + (c.pos.z - p.z) ** 2 < r2) n++; return n; }
function suppressNear(p, r, amt) { const r2 = r * r; for (const c of chars) if (c.team === 'enemy' && c.alive && (c.pos.x - p.x) ** 2 + (c.pos.z - p.z) ** 2 < r2) c.supp = Math.min(1, c.supp + amt); }
function applyHit(t, dmg, src) {
  if (t === P) playerDamage(dmg * D().dmg, src);
  else if (t.isVeh) t.damage(dmg * t.armorB, src);
  else t.damage(dmg, src, R() < .12);
}
const _fa = new V3(), _fb = new V3(), _cand = [];
function findTarget(from, team, range, opt = {}) {
  _cand.length = 0;
  const r2 = range * range, ox = from.pos.x, oz = from.pos.z;
  const add = ref => { const dx = ref.pos.x - ox, dz = ref.pos.z - oz, d = dx * dx + dz * dz; if (d < r2) _cand.push({ ref, s: opt.prefer ? d * opt.prefer(ref) : d }); };
  if (team === 'enemy') {
    if (opt.veh !== 'only') {
      if (P.alive && !P.downed && G.state === 'play') add(P);
      for (const c of chars) if (c.team === 'ally' && c.alive && !c.downed && c.role !== 'hostage') add(c);
    }
    if (opt.veh) for (const v of vehicles) if (v.team === 'ally' && v.alive && !v.untargetable) add(v);
  } else {
    if (opt.veh !== 'only') for (const c of chars) if (c.team === 'enemy' && c.alive) add(c);
    if (opt.veh) for (const v of vehicles) if (v.team === 'enemy' && v.alive && (opt.veh !== 'light' || v.T.light)) add(v);
  }
  if (!_cand.length) return null;
  _cand.sort((a, b) => a.s - b.s);
  _fa.set(ox, from.pos.y + (opt.eye !== undefined ? opt.eye : (from.crouch ? 1 : 1.5)), oz);
  const n = Math.min(4, _cand.length);
  for (let i = 0; i < n; i++) { const r = _cand[i].ref; _fb.set(r.pos.x, aimYOf(r), r.pos.z); if (los(_fa, _fb)) return r; }
  return null;
}

/* ---------- base soldier ---------- */
const _sv = new V3(), _sv2 = new V3(), _mz = new V3();
class Soldier {
  constructor(team, role, x, z, y = 0) {
    this.team = team; this.role = role; this.rd = ROLE[role];
    this.m = makeSoldier(team, role); this.g = this.m.g; this.pos = this.g.position; this.pos.set(x, y, z);
    this.yaw = 0; this.hp = this.max = this.rd.hp; this.alive = true; this.downed = false; this.fall = 0;
    this.goal = new V3(x, y, z); this.stopDist = 1; this.running = false; this.crouch = false; this.ca = 0;
    this.target = null; this.see = false; this.fireCd = rand(.4, 1.4); this.burst = 0; this.think = rand(0, .4);
    this.walk = R() * 6; this.supp = 0; this.lastShot = -9; this.ammo = this.rd.mag; this.reloadT = 0;
    this.det = 0; this.detX = 0; this.detZ = 0; this.lastP = new V3(x, y, z); this.stuckT = 0; this.static = false;
    this.lastHurt = -9; this.deadT = 0; this.moveYaw = 0; this.far = false; this.rocketCd = 0; this.dead = false;
    scene.add(this.g); chars.push(this);
  }
  aimY() { return this.pos.y + (this.crouch ? .98 : 1.38); }
  headY() { return this.pos.y + (this.crouch ? 1.32 : 1.76); }
  muzzle(out) { return out.set(this.pos.x + Math.sin(this.yaw) * .7, this.pos.y + (this.crouch ? .95 : 1.36), this.pos.z + Math.cos(this.yaw) * .7); }
  canFire() { return true; }
  wantRocket() { return false; }
  update(dt) {
    const m = this.m;
    const far = camera.position.distanceToSquared(this.pos) > 80 * 80;
    if (far !== this.far) { this.far = far; m.hi.visible = !far; m.lo.visible = far; }
    if (!this.alive || this.downed) {
      this.fall = Math.min(1, this.fall + dt * 2.8); this.g.rotation.x = -this.fall * 1.5;
      if (!this.alive) { this.deadT += dt; if (this.deadT > 15) this.remove(); }
      else this.downedUpdate(dt);
      return;
    }
    if (this.fall > 0) { this.fall = Math.max(0, this.fall - dt * 2); this.g.rotation.x = -this.fall * 1.5; }
    this.supp = Math.max(0, this.supp - dt * .3);
    this.rocketCd -= dt;
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.ammo = this.rd.mag; }
    this.think -= dt;
    if (this.think <= 0) { this.think = rand(.25, .45); this.decide(); }
    const sp = this.static ? 0 : this.move(dt);
    let fy = this.yaw;
    if (this.target && this.see) fy = Math.atan2(this.target.pos.x - this.pos.x, this.target.pos.z - this.pos.z);
    else if (sp > .2) fy = this.moveYaw;
    else if (this.faceYaw !== undefined) fy = this.faceYaw;
    this.yaw += angDiff(fy, this.yaw) * Math.min(1, dt * 9); this.g.rotation.y = this.yaw;
    this.ca = damp(this.ca, this.crouch ? 1 : 0, 10, dt);
    if (!far) this.anim(dt, sp);
    this.fireCd -= dt;
    if (this.target && this.see && this.fireCd <= 0 && this.reloadT <= 0 && this.canFire()) this.shoot();
    if (this.tick) this.tick(dt);
  }
  move(dt) {
    const gx = this.goal.x - this.pos.x, gz = this.goal.z - this.pos.z, gd = Math.hypot(gx, gz);
    if (gd <= this.stopDist && this.det <= 0) return 0;
    const sp = this.rd.speed * (this.running ? 1.65 : 1) * (this.crouch ? .55 : 1);
    let dx, dz;
    if (this.det > 0) { this.det -= dt; dx = this.detX; dz = this.detZ; } else { dx = gx / gd; dz = gz / gd; }
    this.pos.x += dx * sp * dt; this.pos.z += dz * sp * dt; this.moveYaw = Math.atan2(dx, dz);
    collideCircle(this.pos, .38, 0, 1.7); pushFromVehicles(this.pos, .38);
    this.stuckT += dt;
    if (this.stuckT > .8) {
      const mv = dxz(this.pos, this.lastP);
      if (mv < sp * .8 * .3 && this.det <= 0) {
        const s = R() < .5 ? 1 : -1; let ex = -dz * s + dx * .25, ez = dx * s + dz * .25; const l = Math.hypot(ex, ez) || 1;
        this.detX = ex / l; this.detZ = ez / l; this.det = rand(.8, 1.7);
      }
      this.lastP.copy(this.pos); this.stuckT = 0;
    }
    return sp;
  }
  anim(dt, sp) {
    const m = this.m, ca = this.ca;
    this.walk += dt * sp * 2.3;
    const a = Math.min(1, sp / 3) * .75, s = Math.sin(this.walk) * a;
    m.legL.rotation.x = s - ca * 1.1; m.legR.rotation.x = -s + ca * .25;
    m.hip.position.y = m.tor.position.y = .95 - ca * .4;
    m.tor.rotation.x = ca * .15;
  }
  shoot() {
    const t = this.target, rd = this.rd;
    if (!isAlive(t)) { this.target = null; return; }
    if (rd.rocket || this.wantRocket(t)) return this.fireRocket(t);
    if (this.burst <= 0) this.burst = ri(rd.burst[0], rd.burst[1]);
    this.burst--; this.ammo--;
    this.fireCd = this.burst > 0 ? rd.rate : rand(rd.pause[0], rd.pause[1]) * (1 + this.supp);
    if (this.ammo <= 0) { this.reloadT = 2.6; this.burst = 0; if (this.onReload) this.onReload(); }
    const mz = this.muzzle(_mz), ay = aimYOf(t);
    const d = Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
    let acc = rd.acc * clamp(1.15 - d / (rd.range * 1.25), .15, 1) * (1 - this.supp * .65);
    if (this.team === 'enemy') {
      acc *= D().acc;
      if (t === P) { if (P.speed > 2.5) acc *= .6; if (P.stance === 1) acc *= .72; if (P.stance === 2) acc *= .5; if (P.slideT > 0) acc *= .4; }
    } else acc *= this.accMul || 1;
    if (t.isVeh) acc = Math.min(.9, acc * 1.5);
    const hit = R() < acc;
    _sv.set(t.pos.x, ay, t.pos.z);
    if (!hit) { _sv.x += rand(-1.8, 1.8); _sv.y += rand(-.7, 1.4); _sv.z += rand(-1.8, 1.8); _sv.sub(mz).multiplyScalar(1.5).add(mz); }
    else applyHit(t, rd.dmg, this);
    tracers.spawn(mz, _sv, rd.trc);
    fxMuzzle(mz, .7);
    sfx(rd.snd, .85, mz);
    this.lastShot = G.time;
    if (t === P && !hit && d < 110 && R() < .45) sfx(R() < .5 ? 'crack' : 'whiz', .6);
    if (this.team === 'ally') suppressNear(_sv, 3, .12);
  }
  fireRocket(t) {
    const mz = this.muzzle(_mz); mz.y += .2;
    const d = dxz(t.pos, this.pos);
    _sv.set(t.pos.x, aimYOf(t) - (t.isVeh && !t.air ? .5 : .2), t.pos.z);
    const err = this.team === 'enemy' ? (1.2 + d * .045) / D().acc : .5;
    _sv.x += rand(-err, err); _sv.y += rand(-err * .3, err * .4); _sv.z += rand(-err, err);
    if (t.vel) _sv.addScaledVector(t.vel, d / 80);
    const dir = _sv2.copy(_sv).sub(mz).normalize();
    spawnProj('rocket', mz, dir.multiplyScalar(80), this.team, this, { dmg: this.team === 'enemy' ? 130 : 600, r: 5.5, life: 4 });
    fxMuzzle(mz, 1.6); sfx('rocket', 1, mz);
    for (let i = 0; i < 6; i++) smoke.spawn(mz.x - Math.sin(this.yaw) * 1.4, mz.y, mz.z - Math.cos(this.yaw) * 1.4, rand(-1, 1) - Math.sin(this.yaw) * 4, rand(0, 1), rand(-1, 1) - Math.cos(this.yaw) * 4, 1, 2.5, 1.6, C_SMOKE_L, .5, 2);
    this.fireCd = this.rd.rocket ? rand(this.rd.pause[0], this.rd.pause[1]) : .9;
    this.rocketCd = 8;
    if (this.onRocket) this.onRocket(t);
  }
  damage(a, src, head) {
    if (!this.alive || this.downed || this.role === 'hostage') return;
    this.hp -= a; this.lastHurt = G.time; this.supp = Math.min(1, this.supp + .35);
    if (this.onHurt) this.onHurt(src);
    if (this.hp <= 0) { if (this.team === 'ally') this.goDown(src); else this.die(src, head); }
  }
  die(src, head) { this.alive = false; this.deadT = 0; this.target = null; if (this.cover) { this.cover.taken = null; this.cover = null; } onEnemyKilled(this, src, head); }
  downedUpdate() { }
  remove() { if (this.dead) return; this.dead = true; scene.remove(this.g); if (this.spot) this.spot.used = false; }
}

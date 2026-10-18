'use strict';
/* =====================================================================
   EnemyAI.js — insurgent behaviour tree: perceive → (rooftop ambush |
   take cover & peek | flank | grenade a hidden target | advance), with
   suppression, reinforcement calls and mission-driven spawning.
   ===================================================================== */
let reinfCd = 0;
class Enemy extends Soldier {
  constructor(role, x, z, y = 0, opt = {}) {
    super('enemy', role, x, z, y);
    this.onRoof = !!opt.roof; this.static = this.onRoof; this.spot = opt.spot || null;
    this.flanker = !this.onRoof && R() < .32;
    this.cover = null; this.coverT = 0; this.peeking = false; this.phaseEnd = 0; this.side = R() < .5 ? 1 : -1;
    this.lastSeenPos = new V3(); this.lastSeenT = -99; this.grenCd = rand(7, 16); this.spotted = false;
    if (this.onRoof) { this.faceYaw = opt.ry || 0; this.yaw = this.faceYaw; this.g.rotation.y = this.yaw; }
  }
  aimY() { return this.onRoof && this.crouch ? this.pos.y + .55 : this.pos.y + (this.crouch ? .98 : 1.38); }
  headY() { return this.onRoof && this.crouch ? this.pos.y + .78 : this.pos.y + (this.crouch ? 1.32 : 1.76); }
  canFire() {
    if (this.onRoof) return !this.crouch;
    if (this.cover && !this.peeking && dxz(this.pos, this.cover) < 1.5) return false;
    return true;
  }
  wantRocket(t) { return this.role === 'rpgE'; }
  onHurt(src) { if (src && src.pos && !this.target) { this.lastSeenPos.copy(src.pos); this.lastSeenT = G.time; } }
  decide() {
    const rd = this.rd;
    // 1. perceive
    const t = findTarget(this, 'enemy', rd.range, { veh: this.role === 'rpgE', eye: this.onRoof ? (this.crouch ? 1.1 : 1.5) : (this.crouch ? 1 : 1.5), prefer: v => (v.isVeh && this.role === 'rpgE') ? .3 : 1 });
    if (t) {
      this.target = t; this.see = true; this.lastSeenPos.copy(t.pos); this.lastSeenT = G.time;
      if (!this.spotted) { this.spotted = true; if (R() < .22) callReinforcements(this); }
    } else { this.see = false; if (G.time - this.lastSeenT > 10) this.target = null; }
    this.grenCd -= .35;

    // 2. rooftop ambusher: duck behind the parapet, pop up to fire
    if (this.onRoof) {
      if (G.time > this.phaseEnd) {
        this.crouch = !this.crouch;
        this.phaseEnd = G.time + (this.crouch ? rand(1.4, 3) * (1 + this.supp) : rand(1.6, 3.2) * (1 - this.supp * .5));
      }
      if (!this.target && G.time - this.lastSeenT > 6) this.crouch = R() < .5;
      return;
    }
    const hurt = this.hp < this.max * .4 || this.supp > .6;
    // 3. engaged: hold a cover position and alternate hiding / peeking
    if (this.target && (this.see || G.time - this.lastSeenT < 6)) {
      const tg = this.target, d = dxz(tg.pos, this.pos);
      if (!this.cover || !this.cover.c.on || G.time - this.coverT > (this.flanker ? 9 : 16) || hurt && !this.retreated) {
        const cp = this.findCover(tg, hurt);
        if (cp) { if (this.cover) this.cover.taken = null; this.cover = cp; cp.taken = this; this.coverT = G.time; if (hurt) this.retreated = true; }
      }
      // grenade a target that went to ground behind cover
      if (this.grenCd <= 0 && d > 9 && d < 32 && (!this.see || R() < .12) && G.time - this.lastSeenT < 5) {
        throwGrenadeFrom(this, this.lastSeenPos, 'frag'); this.grenCd = rand(14, 24);
      }
      if (this.cover) {
        const cp = this.cover, at = Math.hypot(cp.x - this.pos.x, cp.z - this.pos.z) < 1.3;
        if (!at) { this.goal.set(cp.x, 0, cp.z); this.stopDist = .4; this.running = true; this.crouch = false; this.peeking = false; return; }
        this.running = false;
        if (G.time > this.phaseEnd) {
          this.peeking = !this.peeking;
          this.phaseEnd = G.time + (this.peeking ? rand(1.3, 2.8) * (1 - this.supp * .5) : rand(1, 2.4) * (1 + this.supp * 1.5));
          if (this.peeking && this.supp > .8 && R() < .5) this.peeking = false;
        }
        if (this.peeking) {
          if (cp.h < 1.7) { this.crouch = false; this.goal.set(cp.x, 0, cp.z); }
          else { this.crouch = R() < .3; this.goal.set(cp.x - cp.nz * 1.4 * this.side + cp.nx * .3, 0, cp.z + cp.nx * 1.4 * this.side + cp.nz * .3); }
        } else { this.crouch = true; this.goal.set(cp.x, 0, cp.z); }
        this.stopDist = .35;
        return;
      }
      // no cover available: strafe and close distance
      if (R() < .45) {
        const px = -(tg.pos.z - this.pos.z) / (d || 1), pz = (tg.pos.x - this.pos.x) / (d || 1), s = rand(-7, 7);
        const adv = d > 45 ? 10 : d < 14 ? -6 : rand(-2, 4);
        this.goal.set(this.pos.x + px * s + (tg.pos.x - this.pos.x) / (d || 1) * adv, 0, this.pos.z + pz * s + (tg.pos.z - this.pos.z) / (d || 1) * adv);
      }
      this.crouch = R() < .3; this.running = false; this.stopDist = 1;
      return;
    }
    // 4. lost contact: release cover and search toward the last known position, flanking
    if (this.cover) { this.cover.taken = null; this.cover = null; }
    this.crouch = false; this.peeking = false; this.stopDist = 1.5;
    const m = G.mission;
    if (G.time - this.lastSeenT < 14) {
      if (dxz(this.goal, this.pos) < 3 || R() < .1) {
        const off = this.flanker ? 18 : 6, a = Math.atan2(this.pos.x - this.lastSeenPos.x, this.pos.z - this.lastSeenPos.z) + (this.flanker ? this.side * 1.2 : 0);
        this.goal.set(this.lastSeenPos.x + Math.sin(a) * off, 0, this.lastSeenPos.z + Math.cos(a) * off);
      }
      this.running = true; return;
    }
    // 5. advance on the objective / the player
    const ap = m && m.attack ? m.attack : P.pos, spread = m && m.attackSpread || 20;
    if (dxz(this.goal, this.pos) < 4 || R() < .06) this.goal.set(ap.x + rand(-spread, spread), 0, ap.z + rand(-spread, spread));
    this.running = dxz(this.pos, ap) > 55;
  }
  findCover(t, retreat) {
    let best = null, bs = 1e9;
    const tx = t.pos.x, tz = t.pos.z, ta = Math.atan2(this.pos.x - tx, this.pos.z - tz);
    const pref = retreat ? 40 : this.flanker ? 18 : rand(22, 34);
    for (const cp of coverPts) {
      if (!cp.c.on || (cp.taken && cp.taken !== this && cp.taken.alive)) continue;
      const ddx = cp.x - this.pos.x, ddz = cp.z - this.pos.z, dm = ddx * ddx + ddz * ddz;
      if (dm > 900) continue;
      const cx = cp.x - tx, cz = cp.z - tz, dt = Math.hypot(cx, cz);
      if (dt < 8 || dt > 75) continue;
      if (cp.nx * (tx - cp.x) + cp.nz * (tz - cp.z) > -.3 * dt) continue;   // collider must sit between us and the target
      let s = Math.sqrt(dm) + Math.abs(dt - pref) * .8;
      if (this.flanker) s -= Math.abs(angDiff(Math.atan2(cx, cz), ta)) * 14;
      if (s < bs) { bs = s; best = cp; }
    }
    return best;
  }
}

/* ---------- spawning ---------- */
function spawnEnemy(p, role, opt) { return new Enemy(role, p.x + rand(-2, 2), p.z + rand(-2, 2), 0, opt || {}); }
function pickSpawn(zone, minD = 45) {
  for (let k = 0; k < 30; k++) {
    const p = pick(spawnPts);
    if (zone && !zone(p)) continue;
    if (dxz(p, P.pos) < minD) continue;
    let ok = true; for (const a of squad.members) if (a.alive && dxz(p, a.pos) < 28) { ok = false; break; }
    if (ok) return p;
  }
  return null;
}
function spawnRoof(zone) {
  for (let k = 0; k < 20; k++) {
    const s = pick(roofSpots); if (!s || s.used) continue;
    if (zone && !zone(s)) continue;
    const d = Math.hypot(s.x - P.pos.x, s.z - P.pos.z); if (d < 35 || d > 140) continue;
    s.used = true;
    return new Enemy(R() < .55 ? 'rpgE' : 'marksman', s.x, s.z, s.y, { roof: true, ry: s.ry, spot: s });
  }
  return null;
}
function rollRole() { const r = R(); return r < .62 ? 'rifle' : r < .8 ? 'pkm' : r < .94 ? 'rpgE' : 'rifle'; }
function maintainEnemies(m, dt) {
  reinfCd -= dt; m.spawnT = (m.spawnT || 0) - dt;
  if (m.budget !== undefined && m.budget <= 0) return;
  if (enemyCount() < m.maxAlive && m.spawnT <= 0) {
    m.spawnT = m.spawnGap || 1.3;
    let e = null;
    if (m.roofChance && R() < m.roofChance) e = spawnRoof(m.zone);
    if (!e) { const p = pickSpawn(m.zone, m.minD || 45); if (p) e = spawnEnemy(p, rollRole()); }
    if (e && m.budget !== undefined) m.budget--;
  }
}
function callReinforcements() {
  const m = G.mission;
  if (!m || m.noReinf || reinfCd > 0 || enemyCount() > m.maxAlive + 3) return;
  reinfCd = 50;
  callout(squad.members.find(a => a.alive && !a.downed), 'reinf');
  HUD.feed('האויב הזעיק תגבורת', 'e');
  const n = ri(3, 5);
  for (let i = 0; i < n; i++) { const p = pickSpawn(m.zone, 60); if (p) spawnEnemy(p, pick(['rifle', 'rifle', 'pkm', 'rpgE'])); }
  if (m.allowVeh && R() < .5) { const r = pick([ROUTES.west, ROUTES.east, ROUTES.ring]); new Veh('technical', 'enemy', r[0][0], r[0][1], 0, r, true); }
}

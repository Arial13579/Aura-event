'use strict';
/* =====================================================================
   SquadAI.js — the player's special-forces fireteam: sniper, combat
   medic, machine gunner and anti-armor specialist. Role-specific target
   priorities, formation movement, five player orders and radio callouts.
   ===================================================================== */
const SQUAD_DEF = [
  { role: 'sniper', name: 'עידו', en: 'Ido', title: 'צלף', pitch: .9, off: [-4.5, 6] },
  { role: 'medic', name: 'נועם', en: 'Noam', title: 'חובש', pitch: 1.15, off: [2, 3.2] },
  { role: 'mg', name: 'אביתר', en: 'Evyatar', title: 'מקלען', pitch: .8, off: [4.2, 1.2] },
  { role: 'at', name: 'יונתן', en: 'Yonatan', title: 'נ״ט', pitch: 1.02, off: [-3.2, 2.4] }
];
const squad = { order: 'follow', point: new V3(), yaw: 0, focus: null, supPt: new V3(), members: [], markT: 0, markPos: new V3(), markKind: '' };
const ORDER_NAMES = { follow: 'עקבו אחריי', move: 'נעים לנקודה', suppress: 'אש חיפוי', hold: 'מחזיקים עמדה', focus: 'ריכוז אש' };
const LINES = {
  contact: { he: 'מגע! מחבלים לפנים', en: 'Contact front!' },
  tank: { he: 'טנק מתקרב!', en: 'Tank incoming!' },
  heli: { he: 'מסוק אויב באוויר!', en: 'Enemy chopper!' },
  apc: { he: 'נגמ״ש אויב!', en: 'Enemy APC!' },
  tech: { he: 'טנדר חמוש!', en: 'Technical!' },
  roofRpg: { he: 'אר פי ג׳י על הגג!', en: 'RPG on the rooftop!' },
  sniperRoof: { he: 'צלף על הגג!', en: 'Sniper on the roof!' },
  reload: { he: 'מחליף מחסנית!', en: 'Reloading!' },
  rocket: { he: 'טיל באוויר!', en: 'Rocket out!' },
  smoke: { he: 'זורק עשן!', en: 'Deploying smoke!' },
  heal: { he: 'אני עליך, תחזיק מעמד', en: 'I got you, hold on!' },
  revive: { he: 'מטפל בפצוע!', en: 'Treating the wounded!' },
  down: { he: 'נפגעתי! חובש!', en: 'I\'m hit! Medic!' },
  kill: { he: 'מטרה נוטרלה', en: 'Target down' },
  cover: { he: 'מחפה!', en: 'Covering fire!' },
  vehDown: { he: 'הרכב הושמד!', en: 'Vehicle destroyed!' },
  grenade: { he: 'רימון! תתפזרו!', en: 'Grenade! Scatter!' },
  move: { he: 'קיבלתי, נעים', en: 'Copy, moving' },
  suppress: { he: 'פותחים באש חיפוי', en: 'Suppressing!' },
  hold: { he: 'מחזיקים עמדה', en: 'Holding position' },
  focus: { he: 'מרכזים אש על המטרה', en: 'Focusing fire' },
  follow: { he: 'חוזרים אליך', en: 'Regrouping on you' },
  reinf: { he: 'הם מזעיקים תגבורת!', en: 'They\'re calling reinforcements!' },
  good: { he: 'ירייה יפה, המפקד', en: 'Nice shot, boss' },
  up: { he: 'חזרתי לפעולה', en: 'I\'m back in the fight' }
};
let lastCallout = -9;
const calloutT = {};
function callout(who, key, prio = false) {
  const L = LINES[key]; if (!L) return;
  const now = G.time;
  if (!prio && (now - lastCallout < 2.4 || (calloutT[key] && now - calloutT[key] < 10))) return;
  lastCallout = now; calloutT[key] = now;
  HUD.sub(who && who.def ? who.def.name : 'מפקדה', L.he);
  sfx('radio', .6);
  Voice.say(L.he, L.en, who && who.def ? who.def.pitch : 1, prio);
}

class Ally extends Soldier {
  constructor(def, x, z) {
    super('ally', def.role, x, z);
    this.def = def; this.name = def.name; this.reviveP = 0; this.smokeCd = 0; this.task = null; this.downT = 0; this.suppressing = false; this.supCd = 0;
  }
  wantRocket(t) { return this.role === 'at' && this.rocketCd <= 0 && t.isVeh && (t.T.heavy || t.air); }
  canFire() { return !this.task; }
  onReload() { if (R() < .3) callout(this, 'reload'); }
  onRocket() { callout(this, 'rocket'); }
  announce(t) {
    if (t.isVeh) { const k = t.type === 'hind' ? 'heli' : t.type === 'apc' ? 'apc' : t.type === 't72' ? 'tank' : t.type === 'technical' ? 'tech' : null; if (k) callout(this, k); return; }
    if (t.role === 'rpgE' && t.onRoof) callout(this, 'roofRpg');
    else if (t.role === 'marksman') callout(this, 'sniperRoof');
    else if (R() < .25) callout(this, 'contact');
  }
  decide() {
    const role = this.role;
    if (role === 'medic') {
      let job = null;
      if (P.downed) job = P; else if (P.alive && P.hp < P.maxHp * .32) job = P;
      if (!job) for (const c of squad.members) if (c !== this && (c.downed || (c.alive && c.hp < c.max * .3))) { job = c; break; }
      if (job) {
        this.task = job; this.goal.copy(job.pos); this.stopDist = 1.1; this.running = true; this.crouch = false; this.target = null; this.see = false;
        if (this.smokeCd <= 0 && dxz(this.pos, job.pos) < 28 && enemiesNear(job.pos, 50) > 1) {
          throwGrenadeFrom(this, job.pos, 'smoke'); this.smokeCd = 22; callout(this, 'smoke');
        }
        return;
      }
      this.task = null;
    }
    // ---- target selection by role ----
    let t = null;
    if (squad.order === 'focus' && isAlive(squad.focus)) {
      const f = squad.focus; _fa.set(this.pos.x, this.pos.y + 1.5, this.pos.z); _fb.set(f.pos.x, aimYOf(f), f.pos.z);
      if (dxz(f.pos, this.pos) < this.rd.range * 1.4 && los(_fa, _fb)) t = f;
    }
    if (!t) {
      if (role === 'at') { t = findTarget(this, 'ally', 160, { veh: 'only', prefer: v => (v.T.heavy || v.air) ? .15 : 4 }); if (t && !(t.T.heavy || t.air)) t = null; if (!t) t = findTarget(this, 'ally', 32); }
      else if (role === 'sniper') t = findTarget(this, 'ally', this.rd.range, { prefer: c => (c.role === 'rpgE' || c.role === 'marksman') ? .04 : 1 });
      else if (role === 'mg') t = findTarget(this, 'ally', this.rd.range, { veh: 'light', prefer: c => c.isVeh ? .3 : 1 });
      else t = findTarget(this, 'ally', this.rd.range);
    }
    if (t && t !== this.target) this.announce(t);
    this.target = t; this.see = !!t;
    // ---- positioning ----
    const o = squad.order;
    let ax = P.pos.x, az = P.pos.z, yaw = P.yaw, sc = 1;
    if (o === 'move' || o === 'hold' || o === 'suppress') { ax = squad.point.x; az = squad.point.z; yaw = squad.yaw; sc = 1.3; }
    const [ox, oz] = this.def.off;
    const gx = ax + Math.cos(yaw) * ox * sc + Math.sin(yaw) * oz * sc, gz = az - Math.sin(yaw) * ox * sc + Math.cos(yaw) * oz * sc;
    if (Math.hypot(gx - this.goal.x, gz - this.goal.z) > 1.5) this.goal.set(gx, 0, gz);
    this.stopDist = 1.2;
    const farD = Math.hypot(gx - this.pos.x, gz - this.pos.z);
    this.running = farD > 9;
    this.crouch = !this.running && farD < 2.5 && (!!t || o === 'hold' || o === 'suppress' || P.stance > 0);
    this.suppressing = o === 'suppress' && !t && dxz(this.pos, squad.supPt) < this.rd.range;
  }
  tick(dt) {
    this.smokeCd -= dt; this.supCd -= dt;
    if (G.time - this.lastHurt > 6 && this.hp < this.max) this.hp = Math.min(this.max, this.hp + 12 * dt);
    // medic treatment
    if (this.task) {
      const job = this.task; this.goal.copy(job.pos);
      if (dxz(this.pos, job.pos) < 2) {
        this.crouch = true;
        if (R() < dt * 6) smoke.spawn(job.pos.x, (job === P ? P.pos.y : job.pos.y) + .8, job.pos.z, 0, 1, 0, .25, .2, .6, C_GREEN, 1, 0, 0);
        if (job === P) {
          if (P.downed) { P.reviveP += dt; if (P.reviveP >= 2.6) { revivePlayer(); this.task = null; } }
          else { P.hp = Math.min(P.maxHp, P.hp + 26 * dt); if (P.hp >= P.maxHp * .9) this.task = null; callout(this, 'heal'); }
        } else if (job.downed) { job.reviveP += dt; callout(this, 'revive'); if (job.reviveP >= 3) { job.revive(.6); this.task = null; } }
        else { job.hp = Math.min(job.max, job.hp + 40 * dt); if (job.hp > job.max * .8) this.task = null; }
      }
    }
    // suppressive fire on a marked area
    if (this.suppressing && this.supCd <= 0 && this.reloadT <= 0) {
      const mg = this.role === 'mg';
      this.supCd = mg ? .08 : (R() < .5 ? .14 : rand(.6, 1.2));
      const mz = this.muzzle(_mz);
      _sv.set(squad.supPt.x + rand(-4, 4), rand(.3, 2.5), squad.supPt.z + rand(-4, 4));
      this.faceYaw = Math.atan2(_sv.x - this.pos.x, _sv.z - this.pos.z);
      if (Math.abs(angDiff(this.faceYaw, this.yaw)) < .4) {
        tracers.spawn(mz, _sv, 'ally'); fxMuzzle(mz, .7); sfx(this.rd.snd, .7, mz);
        if (R() < .3) fxImpact(_sv, 'sand', 1);
        suppressNear(_sv, 9, mg ? .1 : .05);
        for (const c of chars) if (c.team === 'enemy' && c.alive && dxz(c.pos, _sv) < 1.4 && R() < .25) c.damage(this.rd.dmg, this);
        if (mg && R() < .02) callout(this, 'cover');
        this.ammo--; if (this.ammo <= 0) { this.reloadT = 2.6; this.onReload(); }
      }
    } else if (!this.suppressing) this.faceYaw = undefined;
  }
  goDown() {
    this.downed = true; this.hp = 0; this.downT = 30; this.reviveP = 0; this.target = null; this.task = null;
    callout(this, 'down', true); HUD.feed(`<span class="a">${this.name}</span> נפגע · ממתין לחובש`, 'e');
  }
  downedUpdate(dt) { this.downT -= dt; if (this.downT <= 0) this.revive(.4); }
  revive(f) { this.downed = false; this.hp = this.max * f; this.reviveP = 0; callout(this, 'up'); }
}

function createSquad() {
  squad.members.length = 0; squad.order = 'follow'; squad.focus = null; squad.markT = 0;
  SQUAD_DEF.forEach((def, i) => {
    const a = new Ally(def, P.pos.x + def.off[0], P.pos.z + def.off[1] + 2);
    a.yaw = P.yaw + PI; squad.members.push(a);
  });
  HUD.buildSquad();
}
function issueOrder(o) {
  if (!squad.members.length) return;
  const ap = aimPoint(260).clone();
  squad.yaw = P.yaw;
  if (o === 'move') { squad.point.copy(ap); markOrder(ap, 'move', 'נעים לכאן'); }
  else if (o === 'suppress') { squad.supPt.copy(ap); squad.point.copy(P.pos); markOrder(ap, 'sup', 'אש חיפוי'); }
  else if (o === 'hold') { squad.point.copy(P.pos); markOrder(P.pos, 'move', 'עמדה'); }
  else if (o === 'focus') {
    const t = aimTarget();
    if (!t) { HUD.sub('', 'אין מטרה בכוונת · כוונו על אויב או רכב'); sfx('click', .5); return; }
    squad.focus = t; markOrder(t.pos, 'foc', 'ריכוז אש');
  }
  squad.order = o;
  const sp = squad.members.find(m => m.alive && !m.downed);
  callout(sp, o, true);
  HUD.order(o); sfx('radio', .7);
  for (const m of squad.members) m.think = 0;
}
function markOrder(p, kind, label) { squad.markPos.copy(p); squad.markKind = kind; squad.markLabel = label; squad.markT = 3.5; }

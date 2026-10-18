'use strict';
/* =====================================================================
   Player.js — first-person controller: walk/sprint, crouch, prone,
   slide, vault over low cover, jump, head-bob, camera shake, health
   regeneration, the "downed" state and medic revive.
   ===================================================================== */
const P = {
  pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, hp: 100, maxHp: 100, alive: true, downed: false, stance: 0,
  eyeH: 1.65, eyeY: 1.65, onGround: true, speed: 0, lastHit: -9, reviveP: 0, downT: 0, isPlayer: true, team: 'ally',
  slideT: 0, slideDir: new V3(), vaultT: 0, vaultA: new V3(), vaultB: new V3(), vaultH: 0, bob: 0, stepAcc: 0,
  recoilP: 0, recoilY: 0, sprinting: false, kills: 0, heads: 0, shots: 0, hits: 0, score: 0, streak: 0, breath: 1
};
const keys = {};
const mouse = { l: false, r: false, lPressed: false };
let locked = false, lockFallback = false;
const STANCE_NAMES = ['עמידה', 'כריעה', 'שכיבה'];

function resetPlayer(pos, yaw) {
  P.pos.copy(pos); P.vel.set(0, 0, 0); P.yaw = yaw; P.pitch = 0; P.maxHp = 100; P.hp = P.maxHp; P.alive = true; P.downed = false;
  P.stance = 0; P.eyeH = 1.65; P.slideT = 0; P.vaultT = 0; P.recoilP = P.recoilY = 0; P.reviveP = 0; P.breath = 1;
  P.kills = P.heads = P.shots = P.hits = P.score = 0; P.streak = 0;
  for (const k in keys) keys[k] = false; mouse.l = mouse.r = false;
}
const _pv = new V3(), _pd = new V3();
function tryVault() {
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
  _pv.set(P.pos.x, P.pos.y + .4, P.pos.z); _pd.set(fx, 0, fz);
  let best = null, bt = 1.5;
  for (const c of colliders) {
    if (!c.on) continue;
    const top = c.h - P.pos.y;
    if (c.y0 > P.pos.y + .3 || top < .45 || top > 1.7) continue;
    const t = rayAABB(_pv, _pd, c.x0, c.x1, c.y0, c.h, c.z0, c.z1, bt);
    if (t < bt) { bt = t; best = c; }
  }
  if (!best) return false;
  // distance to the far face of the obstacle along our heading
  let tx = Infinity, tz = Infinity;
  if (Math.abs(fx) > 1e-6) tx = Math.max((best.x0 - P.pos.x) / fx, (best.x1 - P.pos.x) / fx);
  if (Math.abs(fz) > 1e-6) tz = Math.max((best.z0 - P.pos.z) / fz, (best.z1 - P.pos.z) / fz);
  const exit = Math.min(tx, tz);
  if (!isFinite(exit) || exit > 4) return false;
  const lx = P.pos.x + fx * (exit + .6), lz = P.pos.z + fz * (exit + .6);
  if (blockedAt(lx, lz, .4, P.pos.y)) return false;
  P.vaultT = .45; P.vaultA.copy(P.pos); P.vaultB.set(lx, P.pos.y, lz); P.vaultH = best.h + .35;
  P.stance = 0; sfx('step', .9); sfx('throw', .4);
  return true;
}
function jumpOrVault() {
  if (P.downed || P.vaultT > 0) return;
  if (P.stance > 0) { P.stance = 0; return; }
  if (tryVault()) return;
  if (P.onGround) { P.vel.y = 7.4; P.onGround = false; }
}
function toggleCrouch() {
  if (P.downed) return;
  if (P.sprinting && P.onGround && P.slideT <= 0) {
    P.slideT = .85; P.slideDir.set(P.vel.x, 0, P.vel.z).normalize(); P.stance = 1; sfx('slide', .8); return;
  }
  P.stance = P.stance === 1 ? 0 : 1;
}
function toggleProne() { if (P.downed) return; P.stance = P.stance === 2 ? 0 : 2; P.slideT = 0; }

function updatePlayer(dt) {
  if (!P.alive) return;
  const ads = WS.ads;
  const fwd = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  P.sprinting = !P.downed && keys.ShiftLeft && fwd > 0 && P.stance === 0 && !mouse.r && P.slideT <= 0 && P.vaultT <= 0;
  let speed = P.downed ? .9 : P.sprinting ? 8.6 : P.stance === 1 ? 3.1 : P.stance === 2 ? 1.25 : 5.4;
  if (ads > .5) speed *= .6;
  if (WS.cur >= 0 && WS.slots[WS.cur] && WS.slots[WS.cur].d.heavy) speed *= .9;
  const s = Math.sin(P.yaw), c = Math.cos(P.yaw);
  let wx = -s * fwd + c * str, wz = -c * fwd - s * str; const wl = Math.hypot(wx, wz); if (wl > 0) { wx /= wl; wz /= wl; }

  if (P.vaultT > 0) {
    P.vaultT -= dt; const t = clamp(1 - P.vaultT / .45, 0, 1);
    P.pos.x = lerp(P.vaultA.x, P.vaultB.x, t); P.pos.z = lerp(P.vaultA.z, P.vaultB.z, t);
    P.pos.y = P.vaultA.y + Math.sin(t * PI) * (P.vaultH - P.vaultA.y) * .9 + (t > .5 ? 0 : 0);
    if (P.vaultT <= 0) { P.vel.set(-s * 4, 0, -c * 4); P.pos.y = Math.max(P.vaultA.y, collideCircle(P.pos, .42, P.pos.y)); }
  } else {
    if (P.slideT > 0) {
      P.slideT -= dt; const k = Math.max(0, P.slideT / .85);
      P.vel.x = P.slideDir.x * (4 + 8 * k); P.vel.z = P.slideDir.z * (4 + 8 * k);
      if (R() < dt * 30) smoke.spawn(P.pos.x, .2, P.pos.z, rand(-1, 1), rand(.3, 1), rand(-1, 1), .5, 1.6, .9, C_DUST, .5, 2);
    } else {
      const acc = P.onGround ? 11 : 2.2;
      P.vel.x = damp(P.vel.x, wx * speed, acc, dt); P.vel.z = damp(P.vel.z, wz * speed, acc, dt);
    }
    P.vel.y -= 24 * dt;
    P.pos.addScaledVector(P.vel, dt);
    const floor = collideCircle(P.pos, .42, P.pos.y, P.stance === 2 ? .6 : 1.7);
    pushFromVehicles(P.pos, .42);
    if (P.pos.y <= floor) { if (!P.onGround && P.vel.y < -9) sfx('step', 1); P.pos.y = floor; P.vel.y = 0; P.onGround = true; }
    else if (P.onGround && P.pos.y - floor < .6 && P.vel.y <= 0) { P.pos.y = floor; P.vel.y = 0; }
    else P.onGround = false;
  }
  P.speed = Math.hypot(P.vel.x, P.vel.z);
  if (P.onGround && P.speed > 1.5 && P.slideT <= 0) { P.stepAcc += dt * P.speed; if (P.stepAcc > (P.sprinting ? 2.7 : 2.1)) { P.stepAcc = 0; sfx('step', P.sprinting ? .55 : P.stance ? .2 : .35); } }

  const tH = P.downed ? .42 : P.slideT > 0 ? .85 : [1.65, 1.08, .42][P.stance];
  P.eyeH = damp(P.eyeH, tH, 11, dt);
  if (!P.downed && P.hp < P.maxHp && G.time - P.lastHit > 5) P.hp = Math.min(P.maxHp, P.hp + 13 * dt);
  if (P.downed) { P.downT -= dt; if (P.downT <= 0) { failMission('נפלת בקרב · החובש לא הגיע בזמן'); return; } }

  // breath (steady scope with Shift)
  const holding = WS.scoped && keys.ShiftLeft && P.breath > 0;
  P.breath = clamp(P.breath + (holding ? -dt / 4 : dt / 6), 0, 1);

  // camera
  P.bob += dt * P.speed * (P.onGround ? 1.3 : 0);
  const bobA = (1 - ads * .85) * Math.min(1, P.speed / 5) * .045 * (P.slideT > 0 ? 0 : 1);
  P.eyeY = P.pos.y + P.eyeH;
  const sh = G.shake; G.shake = Math.max(0, G.shake - dt * 1.6);
  P.recoilP = damp(P.recoilP, 0, 9, dt); P.recoilY = damp(P.recoilY, 0, 9, dt);
  let swX = 0, swY = 0;
  if (WS.scoped) { const k = holding ? .12 : (1 + (P.stance === 2 ? -.6 : P.stance === 1 ? -.3 : 0)) * (P.breath < .05 ? 2 : 1); swX = Math.sin(G.time * .9) * .0055 * k; swY = Math.sin(G.time * 1.37) * .0045 * k; }
  camera.position.set(P.pos.x, P.eyeY + Math.abs(Math.sin(P.bob)) * bobA * 1.2, P.pos.z);
  const tilt = (P.slideT > 0 ? .08 : 0) + (P.downed ? .25 : 0);
  camera.rotation.set(P.pitch + P.recoilP + (Math.random() - .5) * sh * .05 + swY, P.yaw + P.recoilY + (Math.random() - .5) * sh * .05 + swX, (Math.random() - .5) * sh * .03 + Math.sin(P.bob) * bobA * .1 + tilt);
  camera.updateMatrixWorld();
}

function playerDamage(a, src) {
  if (!P.alive || P.downed || G.state !== 'play') return;
  P.hp -= a; P.lastHit = G.time;
  G.dmgPulse = Math.min(1, G.dmgPulse + a / 35);
  HUD.dmgFrom(src && src.pos ? src.pos : null);
  if (P.hp <= 0) playerDown();
}
function playerDown() {
  const medic = squad.members.find(m => m.role === 'medic' && m.alive && !m.downed);
  if (!medic) { P.hp = 0; failMission('נפלת בקרב'); return; }
  P.downed = true; P.hp = 0; P.downT = 16; P.reviveP = 0; P.stance = 0; P.slideT = 0;
  WS.forceSecondary();
  HUD.downed(true);
  callout(medic, 'heal', true);
}
function revivePlayer() {
  P.downed = false; P.hp = 55; P.lastHit = G.time; P.reviveP = 0;
  HUD.downed(false); WS.restoreFromDown();
  sfx('heal', .8);
}

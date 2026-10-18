'use strict';
/* =====================================================================
   Missions.js — campaign operations and survival mode, objectives,
   scoring, pickups, interaction (revive / armory / hostage) and the
   mission start / end flow.
   ===================================================================== */
const pickups = [];
class Hostage extends Soldier {
  constructor(x, z) { super('ally', 'hostage', x, z); this.follow = false; this.m.hip.position.y = this.m.tor.position.y = .5; this.m.legL.rotation.x = this.m.legR.rotation.x = 1.5; }
  decide() {
    if (!this.follow) { this.goal.copy(this.pos); return; }
    this.m.hip.position.y = this.m.tor.position.y = .95;
    const yaw = P.yaw; this.goal.set(P.pos.x + Math.sin(yaw) * 2.5, 0, P.pos.z + Math.cos(yaw) * 2.5);
    this.stopDist = 1.5; this.running = dxz(this.pos, P.pos) > 8;
  }
  anim(dt, sp) { if (this.follow) super.anim(dt, sp); }
}
function centroidEnemies() {
  let x = 0, z = 0, n = 0;
  for (const c of chars) if (c.team === 'enemy' && c.alive && dxz(c.pos, P.pos) < 160) { x += c.pos.x; z += c.pos.z; n++; }
  return n ? _cen.set(x / n, 0, z / n) : null;
}
const _cen = new V3();
function nearestAlive(list) { let b = null, bd = 1e9; for (const v of list) if (v.alive) { const d = dxz(v.pos, P.pos); if (d < bd) { bd = d; b = v; } } return b ? b.pos : null; }
function spawnHind() {
  const h = new Veh('hind', 'enemy', -320, -260, 0); h.pos.y = 70; h.center.set(0, 0, -10); h.radius = 85; h.alt = 38; h.angSpd = .11;
  HUD.banner('מסוק קרב של האויב', 'Mi-24 נכנס לגזרה · נ״ט, RPG או SMAW', 3);
  later(2, () => callout(squad.members.find(a => a.alive && !a.downed), 'heli', true));
  return h;
}

const MISSIONS = [
  {
    name: 'פשיטה על הכפר', place: 'כפר החוף · גזרה צפונית', time: '05:40', tag: 'מבצע 1',
    brief: 'חוליות מחבלים התבצרו בבתי הכפר, במתחמים הסגורים ועל הגגות. הכוח יוצא מהבסיס הדרומי, נכנס בציר המרכזי ומטהר את הכפר עד החוף.',
    goals: ['חסלו 25 מחבלים', 'צלפים ומשגרי אר-פי-ג׳י על הגגות', 'שני טנדרים חמושים מסיירים בצירים'],
    setup(m) {
      m.goal = 25; m.maxAlive = 10; m.zone = p => p.z < 45; m.roofChance = .18; m.initial = 7; m.allowVeh = true;
      new Veh('technical', 'enemy', -138, -24, PI / 2, ROUTES.west, true); new Veh('technical', 'enemy', 138, -24, -PI / 2, ROUTES.east, true);
    },
    update(m, dt) { maintainEnemies(m, dt); if (m.kills >= m.goal) return 'win'; },
    obj(m) { return ['טיהור הכפר', `מחבלים שחוסלו ${Math.min(m.kills, m.goal)}/${m.goal}`, 'שימו לב לגגות']; },
    marker() { return centroidEnemies() || _cen.set(0, 0, -40); }
  },
  {
    name: 'השמדת המשגרים', place: 'מרכז הכפר · שלוש עמדות שיגור', time: '11:15', tag: 'מבצע 2',
    brief: 'שלושה משגרי רקטות ממוקמים בין הבתים ויורים לעבר העורף. כל משגר מוגן בחוליה ונגמ״ש מסייר באזור. מטעני C4, טילים ורימונים יעילים במיוחד.',
    goals: ['השמידו 3 משגרי רקטות', 'נגמ״ש BTR מסייר בגזרה', 'צפו למסוק קרב לאחר הפגיעה הראשונה'],
    setup(m) {
      m.maxAlive = 11; m.zone = p => p.z < 40; m.roofChance = .2; m.initial = 4; m.allowVeh = true;
      m.launchers = LAUNCHER_POS.map(([x, z]) => new Veh('launcher', 'enemy', x, z, R() * TAU));
      for (const [x, z] of LAUNCHER_POS) for (let k = 0; k < 3; k++) spawnEnemy({ x: x + rand(-8, 8), z: z + rand(-8, 8) }, rollRole());
      new Veh('apc', 'enemy', 138, -138, -PI / 2, ROUTES.ring.slice().reverse(), true);
    },
    update(m, dt) {
      maintainEnemies(m, dt);
      if (!m.hind && m.launchers.some(l => !l.alive)) m.hind = spawnHind();
      if (m.launchers.every(l => !l.alive)) return 'win';
    },
    obj(m) { return ['השמדת המשגרים', `משגרים שהושמדו ${m.launchers.filter(l => !l.alive).length}/3`, 'C4, RPG ורימונים פוגעים במשגרים']; },
    marker(m) { return nearestAlive(m.launchers); }
  },
  {
    name: 'חילוץ בני ערובה', place: 'מתחם מערבי · נקודת חילוץ בציר הרוחב', time: '02:20', tag: 'מבצע 3',
    brief: 'בן ערובה מוחזק במתחם סגור במערב הכפר. הגיעו אליו, שחררו אותו והחזיקו את האזור עד שהבלאק הוק ינחת בנקודת החילוץ.',
    goals: ['הגיעו למתחם ושחררו את בן הערובה (החזיקו E)', 'הגנו על האזור 70 שניות', 'עלו למסוק בנקודת החילוץ'],
    setup(m) {
      m.phase = 'reach'; m.maxAlive = 10; m.zone = p => dxz(p, HOSTAGE_POS) < 90 && p.z < 30; m.roofChance = .15; m.initial = 5; m.allowVeh = true; m.freeP = 0;
      m.hostage = new Hostage(HOSTAGE_POS.x, HOSTAGE_POS.z);
      for (let k = 0; k < 4; k++) spawnEnemy({ x: HOSTAGE_POS.x + rand(-6, 6), z: HOSTAGE_POS.z + rand(-6, 6) }, 'rifle');
    },
    interact(m) {
      if (m.phase !== 'reach' || dxz(P.pos, m.hostage.pos) > 2.6) return false;
      HUD.prompt('<kbd>E</kbd> החזיקו לשחרור בן הערובה' + (m.freeP > 0 ? ` · ${Math.round(m.freeP / 3 * 100)}%` : ''));
      if (keys.KeyE) {
        m.freeP += G.dt;
        if (m.freeP >= 3) {
          m.phase = 'defend'; m.defT = 70; m.hostage.follow = true; m.maxAlive = 13; m.spawnGap = .9; m.attack = HOSTAGE_POS; m.attackSpread = 14;
          HUD.banner('בן הערובה שוחרר', 'החזיקו את האזור עד הגעת המסוק', 3);
          Voice.say('בן הערובה איתנו. מסוק בדרך, החזיקו מעמד', 'Hostage secured. Bird inbound, hold the line', 1, true);
          new Veh('technical', 'enemy', -138, -138, 0, ROUTES.west.slice(2).concat([ROUTES.west[0]]), true);
        }
      }
      return true;
    },
    update(m, dt) {
      maintainEnemies(m, dt);
      if (m.phase === 'defend') {
        m.defT -= dt;
        if (m.defT <= 0) {
          m.phase = 'extract';
          const bh = new Veh('blackhawk', 'ally', LZ.x + 260, LZ.z - 220, 0); bh.pos.y = 70; bh.mode = 'goto'; bh.dest.set(LZ.x, 28, LZ.z); bh.untargetable = true; bh.invuln = true;
          bh.onArrive = v => { v.landing = true; v.dest.set(LZ.x, 1.7, LZ.z); v.onArrive = () => { m.landed = true; HUD.banner('המסוק נחת', 'עלו למסוק עם בן הערובה', 2.5); }; };
          m.heli = bh; HUD.banner('המסוק בדרך', 'התקדמו לנקודת החילוץ', 3);
        }
      }
      if (m.phase === 'extract' && m.landed && dxz(P.pos, LZ) < 9 && !P.downed) return 'win';
    },
    obj(m) {
      if (m.phase === 'reach') return ['חילוץ בני ערובה', 'הגיעו למתחם המערבי', 'שחררו את בן הערובה'];
      if (m.phase === 'defend') return ['החזיקו את האזור', `המסוק בעוד ${Math.ceil(m.defT)} שניות`, 'שמרו על בן הערובה קרוב'];
      return ['פינוי', m.landed ? 'עלו למסוק' : 'המסוק בגישה לנחיתה', 'נקודת החילוץ בציר הרוחב'];
    },
    marker(m) { return m.phase === 'extract' ? LZ : HOSTAGE_POS; }
  },
  {
    name: 'עצירת שריון', place: 'שדה הפתוח מול הבסיס', time: '16:50', tag: 'מבצע 4',
    brief: 'טור שריון נחת בחוף ומתקדם דרך הכפר לעבר הבסיס: שלושה טנקי T-72, שני נגמ״שים, טנדרים וחי״ר. טנקי המרכבה בבסיס יסייעו. לוחם הנ״ט שלכם יעדיף את השריון.',
    goals: ['השמידו 3 טנקים ו־2 נגמ״שים', 'הפילו את מסוק הקרב', 'מנעו מהשריון לפרוץ לבסיס'],
    setup(m) {
      m.maxAlive = 9; m.zone = p => p.z < 10; m.roofChance = .12; m.initial = 6; m.allowVeh = true; m.attack = new V3(0, 0, 88); m.attackSpread = 40;
      m.heavy = [
        new Veh('t72', 'enemy', 0, -142, 0, [[0, -24], [0, 62]]),
        new Veh('t72', 'enemy', -138, -142, 0, [[-138, -24], [-138, 62], [-50, 72]]),
        new Veh('t72', 'enemy', 138, -142, 0, [[138, -24], [138, 62], [50, 72]]),
        new Veh('apc', 'enemy', -60, -138, PI / 2, [[0, -138], [0, -24], [-60, -24], [-60, 66]]),
        new Veh('apc', 'enemy', 60, -138, -PI / 2, [[0, -138], [0, -24], [70, -24], [70, 66]])
      ];
      m.heavy.forEach((v, i) => { v.speed *= .8; if (i > 2) v.holdT = 4; });
      new Veh('technical', 'enemy', -138, -24, PI / 2, ROUTES.south, true);
      WS.slots[2].res += 4;
    },
    update(m, dt) {
      maintainEnemies(m, dt);
      if (!m.hind && m.time > 35) m.hind = spawnHind();
      if (m.heavy.every(v => !v.alive) && m.hind && !m.hind.alive) return 'win';
    },
    obj(m) {
      const t = m.heavy.slice(0, 3).filter(v => !v.alive).length, a = m.heavy.slice(3).filter(v => !v.alive).length;
      return ['עצירת שריון', `טנקים ${t}/3 · נגמ״שים ${a}/2`, m.hind ? (m.hind.alive ? 'מסוק Mi-24 באוויר' : 'המסוק הופל') : 'מסוק אויב צפוי'];
    },
    marker(m) { return nearestAlive(m.heavy) || (m.hind && m.hind.alive ? m.hind.pos : null); }
  },
  {
    name: 'הישרדות', place: 'כל הגזרה · גלים בלתי פוסקים', time: '19:30', tag: 'מצב אינסופי', survival: true,
    brief: 'גלים הולכים וגדלים של חי״ר, טנדרים, נגמ״שים, טנקים ומסוקים. כמה גלים הצוות שלך יחזיק?',
    goals: ['שרדו כמה שיותר גלים', 'בין הגלים: תחמושת בארגז בבסיס', 'כל גל רביעי מגיע טנק'],
    setup(m) { m.wave = 0; m.waveT = 4; m.budget = 0; m.maxAlive = 0; m.zone = p => p.z < 60; m.roofChance = .14; m.allowVeh = true; m.attack = null; m.noReinf = true; },
    update(m, dt) {
      const vehAlive = vehicles.some(v => v.team === 'enemy' && v.alive);
      if (m.budget <= 0 && enemyCount() === 0 && !vehAlive) {
        m.waveT -= dt;
        if (m.waveT <= 0) {
          m.wave++; m.budget = 6 + m.wave * 3; m.maxAlive = Math.min(7 + m.wave, 16); m.waveT = 8; m.spawnGap = Math.max(.6, 1.4 - m.wave * .05);
          if (m.wave >= 3) { const r = pick([ROUTES.west, ROUTES.east, ROUTES.ring]); new Veh('technical', 'enemy', r[0][0], r[0][1], 0, r, true); }
          if (m.wave >= 2 && m.wave % 3 === 2) new Veh('apc', 'enemy', 0, -140, 0, [[0, -24], [0, 60]]);
          if (m.wave % 4 === 0) new Veh('t72', 'enemy', pick([-138, 138]), -142, 0, [[0, -138], [0, -24], [0, 60]]);
          if (m.wave % 5 === 0) spawnHind();
          HUD.banner(`גל ${m.wave}`, 'האויב מתקדם', 2.5); refillAll(false);
        }
      } else maintainEnemies(m, dt);
    },
    obj(m) { return ['הישרדות', `גל ${m.wave || 1}`, m.wave ? `אויבים שנותרו ${enemyCount() + Math.max(0, m.budget)}` : 'הגל הראשון מתקרב']; },
    marker() { return null; }
  }
];

/* ---------- flow ---------- */
function clearAll() {
  for (const c of chars) scene.remove(c.g); chars.length = 0;
  squad.members.length = 0;
  clearBattlefield();
  for (const b of bullets) if (b.m) b.m.visible = false; bullets.length = 0;
  for (const p of pickups) scene.remove(p.m); pickups.length = 0;
  for (const c of WS.c4s) scene.remove(c.m); WS.c4s.length = 0;
  G.delayed.length = 0; G.uavT = 0;
  for (const k in streakReady) streakReady[k] = 0;
  resetWorldState();
}
function spawnAmbient() {
  const bh = new Veh('blackhawk', 'ally', -150, 120, 0); bh.center.set(0, 0, 10); bh.radius = 175; bh.alt = 58; bh.angSpd = .085; bh.untargetable = true; bh.invuln = true; bh.doorGun = true;
}
function startMission(i) {
  G.missionIdx = i;
  const def = MISSIONS[i];
  clearAll();
  resetPlayer(PLAYER_SPAWN, 0);
  equipLoadout();
  createSquad();
  const mk1 = new Veh('merkava', 'ally', -22, 98, PI), mk2 = new Veh('merkava', 'ally', 22, 98, PI);
  mk1.cd = mk2.cd = 4;
  spawnAmbient();
  const m = { def, kills: 0, vehKills: 0, time: 0, spawnT: 0, maxAlive: 8 };
  G.mission = m;
  def.setup(m);
  for (let k = 0; k < (m.initial || 0); k++) { const p = pickSpawn(m.zone, 55); if (p) spawnEnemy(p, rollRole()); }
  later(1.2, () => { const f = new V3(-60, 0, 500), t = new V3(40, 0, -600); spawnJet(f, t, 60, { life: 7 }); later(.35, () => spawnJet(f.clone().add(new V3(25, 0, 20)), t.clone().add(new V3(25, 0, 0)), 66, { life: 7 })); });
  HUD.show(true); HUD.streaks();
  HUD.banner(def.name, def.place + ' · ' + def.time, 3.5);
  later(1.5, () => Voice.say('צוות, זזים. שמרו על מרווחים', 'Team, move out. Keep your spacing', .95, true));
  G.state = 'play';
  sunFollow(P.pos);
}
function updateMission(dt) {
  const m = G.mission; if (!m || G.state !== 'play') return;
  m.time += dt;
  let prompted = false;
  if (m.def.interact) prompted = m.def.interact(m);
  if (!prompted) prompted = interactGeneric(dt);
  if (!prompted) HUD.prompt(null);
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.t -= dt; p.m.rotation.y += dt * 2; p.m.position.y = .35 + Math.sin(G.time * 3 + i) * .08;
    if (dxz(p.m.position, P.pos) < 1.6 && !P.downed) { refillAll(false); HUD.popup('+ תחמושת'); sfx('magIn', .6); scene.remove(p.m); pickups.splice(i, 1); continue; }
    if (p.t <= 0) { scene.remove(p.m); pickups.splice(i, 1); }
  }
  const r = m.def.update(m, dt);
  if (r === 'win') endMission(true);
}
let armoryLatch = false, ammoLatch = false;
function interactGeneric(dt) {
  if (P.downed) return false;
  for (const a of squad.members) {
    if (!a.downed || dxz(a.pos, P.pos) > 2.3) continue;
    HUD.prompt(`<kbd>E</kbd> החזיקו להחייאת ${a.name}` + (a.reviveP > 0 ? ` · ${Math.round(a.reviveP / 2.5 * 100)}%` : ''));
    if (keys.KeyE) { a.reviveP += dt; if (a.reviveP >= 2.5) a.revive(.6); }
    return true;
  }
  for (const c of ammoCrates) {
    if (dxz(c, P.pos) > 2.8) continue;
    HUD.prompt('<kbd>E</kbd> תחמושת מלאה &nbsp; <kbd>Y</kbd> החלפת נשק ראשי');
    if (keys.KeyE && !ammoLatch) { ammoLatch = true; refillAll(true); HUD.popup('תחמושת מלאה'); sfx('magIn', .8); }
    if (keys.KeyY && !armoryLatch) {
      armoryLatch = true;
      const i = (PRIMARIES.indexOf(WS.slots[0].id) + 1) % PRIMARIES.length;
      WS.slots[0] = mkSlot(PRIMARIES[i]); settings.primary = PRIMARIES[i]; saveSettings(); switchTo(0, true); sfx('magIn', .8);
    }
    if (!keys.KeyE) ammoLatch = false; if (!keys.KeyY) armoryLatch = false;
    return true;
  }
  return false;
}
function dropAmmo(p) {
  const g = new THREE.Group(); box(g, .45, .28, .3, 0x4a5530); box(g, .46, .06, .31, 0xc9a23a, 0, .1, 0); g.position.set(p.x, .35, p.z); shadows(g); scene.add(g);
  pickups.push({ m: g, t: 30 });
}
function onEnemyKilled(e, src, head) {
  const m = G.mission; if (!m) return;
  m.kills++;
  if (src === P) {
    P.kills++; if (head) P.heads++;
    const pts = head ? 150 : 100; P.score += pts; HUD.popup('+' + pts + (head ? ' · ראש' : ''));
    HUD.feed(`<span class="y">אתה</span> ⟵ מחבל${head ? ' · ירייה בראש' : ''}`, 'me');
    streakAdd();
    if (head && R() < .25) callout(squad.members.find(a => a.alive && !a.downed), 'good');
  } else if (src && src.def) { HUD.feed(`<span class="a">${src.name}</span> ⟵ מחבל`); if (R() < .2) callout(src, 'kill'); }
  else if (src && src.isVeh) HUD.feed(`<span class="a">${src.T.name}</span> ⟵ מחבל`);
  else HUD.feed('מחבל חוסל', 's');
  if (R() < .28) dropAmmo(e.pos);
}
function onVehicleDestroyed(v, src) {
  const m = G.mission; if (!m || G.state !== 'play') return;
  if (v.team === 'enemy') {
    m.vehKills++;
    if (src === P) { P.score += 500; HUD.popup('+500 · ' + v.T.name); streakAdd(); streakAdd(); HUD.feed(`<span class="y">אתה</span> ⟵ ${v.T.name}`, 'me'); }
    else if (src && src.def) HUD.feed(`<span class="a">${src.name}</span> ⟵ ${v.T.name}`);
    else if (src && src.isVeh) HUD.feed(`<span class="a">${src.T.name}</span> ⟵ ${v.T.name}`);
    else HUD.feed(`${v.T.name} הושמד`, 'y');
    callout(squad.members.find(a => a.alive && !a.downed), 'vehDown');
  } else HUD.feed(`${v.T.name} שלנו נפגע`, 'e');
}
function endMission(win, reason) {
  if (G.state !== 'play') return;
  const m = G.mission, def = m.def;
  G.state = 'end'; Voice.stop();
  if (document.pointerLockElement) document.exitPointerLock();
  HUD.show(false);
  const acc = P.shots ? Math.round(P.hits / P.shots * 100) : 0, mins = Math.floor(m.time / 60), secs = Math.floor(m.time % 60);
  $('eTag').textContent = def.tag;
  if (def.survival) {
    $('eTitle').textContent = `שרדת ${Math.max(0, (m.wave || 1) - 1)} גלים`;
    $('eText').textContent = reason || 'הצוות נפל בגל ' + (m.wave || 1) + '.';
    const best = store('sf.bestWave') || 0; if ((m.wave || 0) > best) store('sf.bestWave', m.wave);
  } else {
    $('eTitle').textContent = win ? 'המבצע הושלם' : 'המבצע נכשל';
    $('eText').textContent = win ? `${def.name} · כל המטרות הושגו.` : (reason || 'נפלת בקרב.');
  }
  $('eStats').innerHTML = [['ניקוד', P.score], ['הריגות', P.kills], ['ירי בראש', P.heads], ['דיוק', acc + '%'], ['רכבים', m.vehKills], ['זמן', `${mins}:${String(secs).padStart(2, '0')}`]]
    .map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('');
  $('eNext').hidden = !win || G.missionIdx >= MISSIONS.length - 1;
  $('end').hidden = false;
  if (win) { const done = store('sf.done') || []; if (!done.includes(G.missionIdx)) { done.push(G.missionIdx); store('sf.done', done); } }
  sfx(win ? 'kill' : 'boomS', .8);
}
function failMission(reason) { endMission(false, reason); }

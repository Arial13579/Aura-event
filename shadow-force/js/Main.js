'use strict';
/* =====================================================================
   Main.js — boot, menu & loadout, pointer lock, input bindings, pause,
   and the main loop (simulation → render → HUD).
   ===================================================================== */
const menuEl = $('menu'), briefEl = $('brief'), pauseEl = $('pause'), endEl = $('end');
let menuAng = 0;

/* ---------- menu ---------- */
let menuInit = false, selMission = 0, MSHOT = [];
const SHOT_CAM = [[0, 16, 70, 0, 4, -30], [-36, 20, -44, -72, 2, -96], [-64, 12, -6, -96, 3, -50], [34, 9, 108, 0, 4, 40], [90, 44, -150, 0, 0, -20]];
function captureMissionShots() {
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const cx = cv.getContext('2d');
  MSHOT = SHOT_CAM.map(([x, y, z, lx, ly, lz]) => {
    camera.fov = 62; camera.updateProjectionMatrix();
    camera.position.set(x, y, z); camera.lookAt(lx, ly, lz); camera.updateMatrixWorld(); sunFollow(_tv.set(lx, 0, lz));
    skyMesh.position.copy(camera.position); renderFrame(false);
    try { cx.drawImage(canvas, 0, 0, 640, 360); return cv.toDataURL('image/jpeg', .82); } catch (e) { return ''; }
  });
  camera.fov = 70; camera.updateProjectionMatrix();
}
function showTab(t) {
  document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  document.querySelectorAll('#mBody .tab').forEach(sec => { sec.hidden = sec.id !== 'tab-' + t; });
}
function weaponStats(d) {
  if (d.proj) return [['נזק', 1], ['רדיוס פיצוץ', .85], ['הנחיה', d.proj === 'smaw' ? 1 : .15], ['תחמושת', d.res / 8], ['ניידות', .6]];
  return [['נזק', clamp(Math.sqrt(d.dmg * (d.pellets || 1) / 260), .08, 1)], ['קצב אש', clamp(d.rpm / 950, .05, 1)], ['טווח', clamp(d.vel / 900 * (d.scope ? 1.1 : 1), .2, 1)], ['שליטה', clamp(1 - d.recoil / .075, .05, 1)], ['ניידות', d.heavy ? .45 : d.scope ? .6 : .85]];
}
function showWeaponDetail(id) {
  const d = WDEF[id];
  $('wDetail').innerHTML = `<img src="${WICON[id] || ''}" alt=""><h2>${d.name}</h2><div class="cls">${d.cls} · מחסנית ${d.mag}${d.scope ? ' · כוונת טלסקופית' : ''}${d.bolt ? ' · בריח' : ''}</div>`
    + weaponStats(d).map(([k, v]) => `<div class="stat"><span>${k}</span><span class="t"><i style="width:${Math.round(v * 100)}%"></i></span><span>${Math.round(v * 100)}</span></div>`).join('')
    + `<p class="fine" style="margin-top:12px">אקדח Mk23 עם משתיק · 3 רסס · 2 עשן · 2 מטעני C4. בארגז התחמושת בבסיס מחליפים נשק ראשי עם Y.</p>`;
}
function renderLoadout() {
  const cards = (el, list, key) => {
    el.innerHTML = list.map(id => `<button type="button" class="wCard" data-id="${id}" aria-pressed="${settings[key] === id}"><img src="${WICON[id] || ''}" alt=""><b>${WDEF[id].name}</b><small>${WDEF[id].cls}</small></button>`).join('');
    el.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => { settings[key] = b.dataset.id; saveSettings(); sfx('ui', .6); renderLoadout(); showWeaponDetail(b.dataset.id); selectMission(selMission); });
      b.addEventListener('mouseenter', () => showWeaponDetail(b.dataset.id));
      b.addEventListener('focus', () => showWeaponDetail(b.dataset.id));
    });
  };
  cards($('pickPrimary'), PRIMARIES, 'primary'); cards($('pickLauncher'), LAUNCHERS, 'launcher');
}
function selectMission(i) {
  selMission = i; const m = MISSIONS[i];
  document.querySelectorAll('.msn').forEach(b => b.setAttribute('aria-pressed', +b.dataset.i === i));
  $('bTag').textContent = m.tag; $('bTitle').textContent = m.name; $('bMeta').textContent = `${m.place} · שעה ${m.time}`;
  $('bText').textContent = m.brief; $('bGoals').innerHTML = m.goals.map(g => `<li>${g}</li>`).join('');
  $('bLoad').innerHTML = `<img src="${WICON[settings.primary] || ''}" alt="">${WDEF[settings.primary].name} · <img src="${WICON[settings.launcher] || ''}" alt="">${WDEF[settings.launcher].name}`;
}
function initMenu() {
  if (menuInit) return; menuInit = true;
  document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => { initAudio(); sfx('ui', .5); showTab(b.dataset.tab); }));
  const sens = $('setSens'), vol = $('setVol'), q = $('setQual'), d = $('setDiff'), v = $('setVoice');
  sens.value = settings.sens; vol.value = settings.vol; q.value = settings.quality; d.value = settings.diff; v.value = settings.voice ? '1' : '0';
  const out = () => { $('outSens').textContent = (+settings.sens).toFixed(2); $('outVol').textContent = Math.round(settings.vol * 100) + '%'; };
  out();
  sens.addEventListener('input', () => { settings.sens = +sens.value; out(); saveSettings(); });
  vol.addEventListener('input', () => { settings.vol = +vol.value; setVolume(settings.vol); out(); saveSettings(); });
  q.addEventListener('change', () => { settings.quality = q.value; saveSettings(); applyQuality(); });
  d.addEventListener('change', () => { settings.diff = d.value; saveSettings(); });
  v.addEventListener('change', () => { settings.voice = v.value === '1'; saveSettings(); });
  $('bGo').addEventListener('click', () => deploy(selMission));
  if (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) $('touchNote').hidden = false;
}
function buildMenu() {
  initMenu();
  const done = store('sf.done') || [];
  $('msnList').innerHTML = MISSIONS.map((m, i) => `<button class="msn${m.survival ? ' wide' : ''}" data-i="${i}" style="background-image:url('${MSHOT[i] || ''}')"><span class="num">${m.survival ? '∞' : String(i + 1).padStart(2, '0')}</span>${done.includes(i) ? '<span class="done">הושלם</span>' : ''}<span class="txt"><b>${m.name}</b><small>${m.place}</small></span></button>`).join('');
  $('msnList').querySelectorAll('.msn').forEach(b => {
    b.addEventListener('click', () => { initAudio(); sfx('ui', .6); selectMission(+b.dataset.i); });
    b.addEventListener('dblclick', () => deploy(+b.dataset.i));
  });
  renderLoadout(); showWeaponDetail(settings.primary); selectMission(selMission);
  const best = store('sf.bestWave'); $('bestLine').textContent = best ? `שיא הישרדות: גל ${best}` : 'ההתקדמות נשמרת בדפדפן הזה בלבד';
}
function openBrief(i) { initAudio(); sfx('ui', .7); showTab('ops'); selectMission(i); }
function deploy(i) {
  initAudio();
  briefEl.hidden = endEl.hidden = pauseEl.hidden = true; menuEl.hidden = true;
  startMission(i);
  lockPointer();
}
function toMenu() {
  G.state = 'menu'; G.mission = null;
  clearAll(); spawnAmbient();
  HUD.show(false); pauseEl.hidden = endEl.hidden = briefEl.hidden = true; menuEl.hidden = false;
  postMat.uniforms.scope.value = 0; postMat.uniforms.ads.value = 0; postMat.uniforms.down.value = 0; camera.fov = 70; camera.updateProjectionMatrix();
  buildMenu();
  if (document.pointerLockElement) document.exitPointerLock();
}
function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'pause'; $('pTitle').textContent = G.mission ? G.mission.def.name : ''; pauseEl.hidden = false; Voice.stop();
  for (const k in keys) keys[k] = false; mouse.l = mouse.r = false;
}
function resumeGame() { if (G.state !== 'pause') return; pauseEl.hidden = true; G.state = 'play'; lockPointer(); }

/* ---------- pointer lock ---------- */
function lockPointer() {
  try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { lockFallback = true; }); } catch (e) { lockFallback = true; }
}
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) lockFallback = false;
  else if (G.state === 'play' && !lockFallback) pauseGame();
});
document.addEventListener('pointerlockerror', () => { lockFallback = true; });

/* ---------- input ---------- */
const ORDER_KEYS = { Digit1: 'move', Digit2: 'suppress', Digit3: 'hold', Digit4: 'focus', Digit5: 'follow' };
const STREAK_KEYS = { Digit6: 'uav', Digit7: 'air', Digit8: 'apache', Digit9: 'naval' };
addEventListener('keydown', e => {
  if (G.state !== 'play') {
    if (e.code === 'Escape' && G.state === 'pause') resumeGame();
    if (e.code === 'Enter' && G.state === 'menu' && !menuEl.hidden) deploy(selMission);
    return;
  }
  if (['Space', 'Tab', 'KeyF', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].includes(e.code)) e.preventDefault();
  if (e.repeat) { keys[e.code] = true; return; }
  keys[e.code] = true;
  switch (e.code) {
    case 'Space': jumpOrVault(); break;
    case 'KeyC': toggleCrouch(); break;
    case 'KeyZ': toggleProne(); break;
    case 'KeyR': startReload(); break;
    case 'KeyQ': swapPrimarySecondary(); break;
    case 'KeyX': toggleLauncher(); break;
    case 'KeyG': throwGrenade('frag'); break;
    case 'KeyH': throwGrenade('smoke'); break;
    case 'KeyB': placeC4(); break;
    case 'KeyF': detonateC4(); break;
    case 'KeyV': meleeAttack(); break;
    case 'Escape': case 'KeyP': if (lockFallback || e.code === 'KeyP') { if (document.pointerLockElement) document.exitPointerLock(); pauseGame(); } break;
  }
  if (ORDER_KEYS[e.code]) issueOrder(ORDER_KEYS[e.code]);
  if (STREAK_KEYS[e.code]) useStreak(STREAK_KEYS[e.code]);
});
addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousedown', e => {
  if (G.state !== 'play') return;
  if (!locked && !lockFallback) { lockPointer(); return; }
  if (e.button === 0) { mouse.l = true; mouse.lPressed = true; }
  if (e.button === 2) mouse.r = true;
});
addEventListener('mouseup', e => { if (e.button === 0) mouse.l = false; if (e.button === 2) mouse.r = false; });
addEventListener('contextmenu', e => { if (G.state === 'play') e.preventDefault(); });
addEventListener('mousemove', e => {
  if (G.state !== 'play' || (!locked && !lockFallback)) return;
  const mx = clamp(e.movementX || 0, -300, 300), my = clamp(e.movementY || 0, -300, 300);
  const s = .0021 * settings.sens * (camera.fov / 78);
  P.yaw -= mx * s; P.pitch = clamp(P.pitch - my * s, -1.5, 1.5);
  WS.swX = clamp(WS.swX + mx, -60, 60); WS.swY = clamp(WS.swY + my, -60, 60);
});
addEventListener('wheel', e => { if (G.state === 'play' && Math.abs(e.deltaY) > 4) cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
addEventListener('blur', () => { if (G.state === 'play') pauseGame(); });
addEventListener('resize', resize);

$('pResume').addEventListener('click', resumeGame);
$('pRestart').addEventListener('click', () => deploy(G.missionIdx));
$('pMenu').addEventListener('click', toMenu);
$('eNext').addEventListener('click', () => { const n = Math.min(MISSIONS.length - 1, G.missionIdx + 1); toMenu(); openBrief(n); });
$('eRetry').addEventListener('click', () => deploy(G.missionIdx));
$('eMenu').addEventListener('click', toMenu);

/* ---------- main loop ---------- */
let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsT0 = performance.now();
function menuCamera(dt) {
  menuAng += dt * .035;
  camera.position.set(Math.cos(menuAng) * 150, 46 + Math.sin(menuAng * 1.7) * 8, -30 + Math.sin(menuAng) * 150);
  camera.lookAt(0, 6, -30);
  camera.updateMatrixWorld();
  sunFollow(_tv.set(0, 0, -30));
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  G.dt = dt; sndBudget = 0; G.frame++;
  const st = G.state;
  if (st === 'play' || st === 'menu') {
    G.time += dt;
    if (st === 'play') { updatePlayer(dt); if (G.state === 'play') updateWeapons(dt); if (G.state === 'play') updateMission(dt); }
    else menuCamera(dt);
    for (let i = chars.length - 1; i >= 0; i--) { const c = chars[i]; c.update(dt); if (c.dead) chars.splice(i, 1); }
    updateBattlefield(dt); updateProjectiles(dt); updateBullets(dt); processDelayed(dt);
    updateWorld(dt);
    fire.update(dt); smoke.update(dt); tracers.update(dt); updateLights(dt);
    if (st === 'play') sunFollow(P.pos);
  }
  G.flash = Math.max(0, G.flash - dt * 1.6); G.dmgPulse = Math.max(0, G.dmgPulse - dt * .9);
  const u = postMat.uniforms;
  u.flash.value = G.flash;
  u.dmg.value = st === 'play' ? clamp(Math.max(G.dmgPulse, (1 - P.hp / P.maxHp) * .85), 0, 1) : 0;
  u.down.value = st === 'play' && P.downed ? 1 : 0;
  renderFrame((st === 'play' || st === 'pause') && !WS.scoped);
  if (st === 'play') HUD.update(dt);
  fpsN++;
  if (now - fpsT0 > 500) { if (HUD.el.fps) HUD.el.fps.textContent = Math.round(fpsN * 1000 / (now - fpsT0)) + ' FPS'; fpsN = 0; fpsT0 = now; }
}

/* ---------- boot ---------- */
function boot() {
  loadModels().then(boot2);
}
function boot2() {
  try {
    buildWorld();
    buildViewmodels();
    makeWeaponIcons();
    HUD.init();
    applyQuality();
    spawnAmbient();
    const imgs = Object.values(_phImg).map(e => e.img.decode ? e.img.decode().catch(() => { }) : Promise.resolve());
    Promise.race([Promise.all(imgs), new Promise(r => setTimeout(r, 6000))]).then(() => {
      for (const e of Object.values(_phImg)) for (const t of e.texs) t.needsUpdate = true;
      captureMissionShots();
      buildMenu();
      G.state = 'menu';
      $('loading').hidden = true;
      requestAnimationFrame(t => { last = t; frame(t); });
    });
  } catch (err) {
    console.error(err);
    $('loadErr').hidden = false; $('loadErr').textContent = 'שגיאה בטעינת הזירה: ' + err.message;
  }
}
boot();

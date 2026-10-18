'use strict';
/* =====================================================================
   HUD.js — tactical overlay: dynamic crosshair, hit markers, damage
   direction, compass, rotating radar with pings, objective marker,
   squad cards & name tags, kill feed, radio subtitles, killstreaks.
   ===================================================================== */
const _hp = new V3();
const HUD = {
  el: {}, cache: {}, dmgArcs: [], tagEls: [], subT: 0, bannerT: 0, hitT: 0, slowT: 0,
  init() {
    for (const id of ['hud', 'cross', 'hitm', 'dmgRing', 'grenadeWarn', 'compStrip', 'radar', 'radarInfo', 'objTag', 'objTitle', 'objText', 'feed', 'orderName', 'squadCards',
      'streaks', 'stance', 'hpFill', 'hpNum', 'wName', 'aMag', 'aRes', 'gear', 'subs', 'banner', 'bannerT', 'bannerS', 'prompt', 'marker', 'orderMark', 'tags', 'popups', 'downed', 'downedTxt', 'downedFill', 'fps'])
      this.el[id] = $(id);
    this.rctx = this.el.radar.getContext('2d');
    // compass strip: 4px per degree, labels every 15°
    const names = { 0: 'צ', 90: 'מז', 180: 'ד', 270: 'מע' };
    let html = '';
    for (let d = -360; d <= 720; d += 15) { const n = ((d % 360) + 360) % 360; html += `<span style="left:${(d + 360) * 4}px" class="${names[n] ? 'c' : ''}">${names[n] || n}</span>`; }
    this.el.compStrip.innerHTML = html;
    for (let i = 0; i < 4; i++) { const a = document.createElement('div'); a.className = 'arc'; this.el.dmgRing.appendChild(a); this.dmgArcs.push({ el: a, t: 0, x: 0, z: 0 }); }
    this.streaks();
  },
  set(id, v) { if (this.cache[id] !== v) { this.cache[id] = v; this.el[id].textContent = v; } },
  html(id, v) { if (this.cache[id] !== v) { this.cache[id] = v; this.el[id].innerHTML = v; } },
  show(on) { this.el.hud.hidden = !on; },
  buildSquad() {
    this.el.squadCards.innerHTML = squad.members.map((m, i) => `<div class="sq" id="sq${i}"><b>${m.def.name}</b><em>${m.def.title}</em><div class="bar"><i id="sqb${i}"></i></div><div class="st" id="sqs${i}"></div></div>`).join('');
    this.el.tags.innerHTML = squad.members.map(m => `<div>${m.def.name}<small>${m.def.title}</small></div>`).join('');
    this.tagEls = [...this.el.tags.children];
    this.sqEls = squad.members.map((m, i) => ({ card: $('sq' + i), bar: $('sqb' + i), st: $('sqs' + i), last: '' }));
    this.order('follow');
  },
  order(o) { this.set('orderName', ORDER_NAMES[o]); },
  weaponChanged() { this.cache.wName = null; },
  streaks() {
    this.el.streaks.innerHTML = STREAKS.map(s => {
      const n = streakReady[s.id] || 0;
      return `<div class="stk ${n ? 'rdy' : ''}"><kbd>${s.key}</kbd>${s.name}<span class="n">${n ? (n > 1 ? '×' + n : 'מוכן') : Math.min(P.streak, s.need) + '/' + s.need}</span></div>`;
    }).join('');
  },
  feed(html, cls = '') {
    const d = document.createElement('div'); d.innerHTML = html; if (cls) d.className = cls;
    this.el.feed.appendChild(d); while (this.el.feed.children.length > 6) this.el.feed.firstChild.remove();
    setTimeout(() => d.remove(), 6000);
  },
  sub(name, text) {
    const d = document.createElement('div'); d.innerHTML = name ? `<b>${name}:</b>${text}` : text;
    this.el.subs.appendChild(d); while (this.el.subs.children.length > 3) this.el.subs.firstChild.remove();
    setTimeout(() => d.remove(), 3800);
  },
  banner(t, s, dur = 3) { this.el.bannerT.textContent = t; this.el.bannerS.textContent = s || ''; this.el.banner.classList.add('on'); this.bannerT = dur; },
  popup(txt) { const d = document.createElement('div'); d.textContent = txt; this.el.popups.appendChild(d); setTimeout(() => d.remove(), 1100); },
  hit(kill, head) {
    const h = this.el.hitm; h.className = kill ? (head ? 'kill head' : 'kill') : head ? 'head' : '';
    h.style.opacity = 1; this.hitT = kill ? .32 : .16;
    sfx(kill ? 'kill' : head ? 'head' : 'hit', .9);
  },
  dmgFrom(pos) {
    if (!pos) return;
    const a = this.dmgArcs.reduce((m, x) => x.t < m.t ? x : m, this.dmgArcs[0]);
    a.t = 1.3; a.x = pos.x; a.z = pos.z;
  },
  downed(on) { this.el.downed.hidden = !on; },
  prompt(txt) { if (txt) { this.html('prompt', txt); this.el.prompt.classList.add('on'); } else this.el.prompt.classList.remove('on'); },
  project(p, out) {
    _hp.copy(p).project(camera);
    const behind = _hp.z > 1;
    let x = (_hp.x * .5 + .5) * innerWidth, y = (-_hp.y * .5 + .5) * innerHeight;
    if (behind) { x = innerWidth - x; y = innerHeight - 40; }
    out.x = x; out.y = y; out.behind = behind; out.on = !behind && x > 0 && x < innerWidth && y > 0 && y < innerHeight; return out;
  },
  update(dt) {
    const s = WS.slots[WS.cur];
    // crosshair spread
    const d = s.d, sp = (lerp(d.spread, d.ads, WS.ads) * (P.speed > 1 ? 1.5 : 1) * (P.stance === 1 ? .75 : P.stance === 2 ? .55 : 1) + WS.bloom) * innerHeight / (2 * Math.tan(camera.fov * PI / 360)) + 4;
    const c = this.el.cross;
    const hide = WS.ads > .55 || P.sprinting || WS.scoped || d.proj && WS.ads > .3;
    c.style.opacity = hide ? 0 : 1;
    if (!hide) { const k = c.children; const g = Math.min(80, sp).toFixed(1); k[0].style.top = `${-g - 8}px`; k[1].style.top = `${+g}px`; k[2].style.left = `${-g - 8}px`; k[3].style.left = `${+g}px`; }
    if (this.hitT > 0) { this.hitT -= dt; if (this.hitT <= 0) this.el.hitm.style.opacity = 0; }
    // damage arcs
    for (const a of this.dmgArcs) {
      if (a.t <= 0) continue; a.t -= dt;
      const ang = Math.atan2(a.x - P.pos.x, a.z - P.pos.z), rel = -(ang - (P.yaw + PI));
      a.el.style.transform = `rotate(${rel}rad)`; a.el.style.opacity = Math.min(1, a.t);
    }
    // weapon & ammo
    if (this.cache.wName !== d.name) { this.set('wName', d.name + ' · ' + d.cls); }
    this.set('aMag', String(s.mag)); this.set('aRes', '/ ' + s.res);
    const low = s.mag <= Math.ceil(d.mag * .25); if (this.cache.low !== low) { this.cache.low = low; this.el.aMag.classList.toggle('low', low); }
    this.html('gear', `רסס <b>${WS.frag}</b> · עשן <b>${WS.smokeG}</b> · C4 <b>${WS.c4}</b>${WS.c4s.length ? ` (${WS.c4s.length} מונחים)` : ''}`);
    const hp = Math.max(0, Math.round(P.hp));
    this.set('hpNum', String(hp)); this.el.hpFill.style.width = hp + '%';
    const lowHp = hp < 35; if (this.cache.lowHp !== lowHp) { this.cache.lowHp = lowHp; this.el.hpFill.classList.toggle('low', lowHp); }
    this.set('stance', (P.downed ? 'פצוע' : P.slideT > 0 ? 'החלקה' : STANCE_NAMES[P.stance]) + (WS.scoped ? ` · נשימה ${Math.round(P.breath * 100)}%` : ''));
    // compass
    const head = ((-P.yaw * 180 / PI) % 360 + 360) % 360;
    this.el.compStrip.style.transform = `translateX(${-(head + 360) * 4 + this.el.compStrip.parentElement.clientWidth / 2}px)`;
    // objective
    const m = G.mission;
    if (m) {
      const o = m.def.obj(m); this.set('objTitle', o[0]); this.html('objText', o.slice(1).map(t => `<div>${t}</div>`).join(''));
      const mk = m.def.marker ? m.def.marker(m) : null;
      const me = this.el.marker;
      if (mk) {
        const pr = this.project(_hp.set(mk.x, (mk.y || 0) + 2.5, mk.z), {});
        const x = clamp(pr.x, 30, innerWidth - 30), y = clamp(pr.y, 60, innerHeight - 60);
        me.style.display = 'block'; me.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
        me.lastChild.textContent = Math.round(dxz(mk, P.pos)) + ' מ׳';
      } else me.style.display = 'none';
    }
    // order marker
    const om = this.el.orderMark;
    if (squad.markT > 0) {
      squad.markT -= dt;
      const p = squad.markKind === 'foc' && squad.focus && isAlive(squad.focus) && squad.order === 'focus' ? squad.focus.pos : squad.markPos;
      const pr = this.project(_hp.set(p.x, (p.y || 0) + 1.5, p.z), {});
      if (pr.on) { om.style.display = 'block'; om.className = squad.markKind; om.style.transform = `translate(${pr.x}px,${pr.y}px) translate(-50%,-50%)`; om.lastChild.textContent = squad.markLabel; } else om.style.display = 'none';
    } else om.style.display = 'none';
    // squad cards + name tags
    squad.members.forEach((a, i) => {
      const e = this.sqEls[i]; if (!e) return;
      const st = a.downed ? `פצוע · ${Math.ceil(a.downT)} שנ׳` : a.task ? (a.task === P ? 'מטפל בך' : 'מטפל בפצוע') : a.reloadT > 0 ? 'טוען' : a.suppressing ? 'אש חיפוי' : a.target && a.see ? (a.target.isVeh ? 'מעסיק רכב' : 'באש') : squad.order === 'hold' ? 'בעמדה' : 'בתנועה';
      if (e.last !== st) { e.last = st; e.st.textContent = st; e.card.className = 'sq' + (a.downed ? ' down' : a.task ? ' busy' : ''); }
      e.bar.style.width = (a.downed ? 0 : Math.max(0, a.hp / a.max * 100)) + '%';
      const t = this.tagEls[i], pr = this.project(_hp.set(a.pos.x, a.pos.y + 2.15, a.pos.z), {});
      const dist = dxz(a.pos, P.pos);
      if (pr.on && dist < 140) { t.style.display = 'block'; t.style.transform = `translate(${pr.x}px,${pr.y}px) translate(-50%,-100%)`; t.style.opacity = dist > 60 ? .6 : 1; t.className = a.downed ? 'down' : ''; }
      else t.style.display = 'none';
    });
    // grenade warning
    let gw = false; for (const p of projs) if (p.type === 'grenade' && p.team === 'enemy' && p.pos.distanceTo(P.pos) < 9) { gw = true; break; }
    if (this.cache.gw !== gw) { this.cache.gw = gw; this.el.grenadeWarn.hidden = !gw; }
    // subs / banner timers
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.el.banner.classList.remove('on'); }
    if (P.downed) { this.set('downedTxt', squad.members.some(a => a.role === 'medic' && a.alive && !a.downed) ? `החובש בדרך · ${Math.ceil(P.downT)} שנ׳ · ירי באקדח בלבד` : 'אין חובש זמין'); this.el.downedFill.style.width = (P.reviveP / 2.6 * 100) + '%'; }
    this.radar();
  },
  radar() {
    const g = this.rctx, S = 200, C = S / 2, range = 90, k = C / range;
    g.clearRect(0, 0, S, S);
    g.save(); g.beginPath(); g.arc(C, C, C - 1, 0, TAU); g.clip();
    g.translate(C, C); g.rotate(P.yaw);
    const px = P.pos.x, pz = P.pos.z;
    // sea
    if (pz - range < -150) { g.fillStyle = 'rgba(60,120,150,.28)'; g.fillRect((-range * 2) * k, (-152 - pz) * k - range * 2 * k, range * 4 * k, range * 2 * k); }
    g.fillStyle = 'rgba(210,190,140,.22)';
    for (const c of colliders) {
      if (!c.on || c.y0 > 0 || c.h < 1.5) continue;
      if (c.x1 < px - range || c.x0 > px + range || c.z1 < pz - range || c.z0 > pz + range) continue;
      g.fillRect((c.x0 - px) * k, (c.z0 - pz) * k, (c.x1 - c.x0) * k, (c.z1 - c.z0) * k);
    }
    const dot = (x, z, r, col, sq) => { const dx = (x - px) * k, dz = (z - pz) * k; if (dx * dx + dz * dz > (C - 4) ** 2) return; g.fillStyle = col; if (sq) g.fillRect(dx - r, dz - r, r * 2, r * 2); else { g.beginPath(); g.arc(dx, dz, r, 0, TAU); g.fill(); } };
    const uav = G.uavT > 0;
    for (const e of chars) {
      if (e.team === 'enemy' && e.alive) { const seen = uav || G.time - e.lastShot < 1.6 && !(e.rd.snd === 'pistolS') || dxz(e.pos, P.pos) < 14; if (seen) dot(e.pos.x, e.pos.z, 3.2, '#ff5a3c'); }
      else if (e.team === 'ally') dot(e.pos.x, e.pos.z, 3.2, e.downed ? '#ff9a7a' : '#6cc7ff');
    }
    for (const v of vehicles) { if (!v.alive) continue; if (v.team === 'enemy' && (uav || dxz(v.pos, P.pos) < 70 || v.air)) dot(v.pos.x, v.pos.z, v.air ? 5 : 4.5, '#ff5a3c', true); else if (v.team === 'ally') dot(v.pos.x, v.pos.z, 4.5, '#6cc7ff', true); }
    const m = G.mission; const mk = m && m.def.marker ? m.def.marker(m) : null;
    if (mk) { let dx = (mk.x - px) * k, dz = (mk.z - pz) * k; const dd = Math.hypot(dx, dz); if (dd > C - 8) { dx *= (C - 8) / dd; dz *= (C - 8) / dd; } g.save(); g.translate(dx, dz); g.rotate(PI / 4); g.fillStyle = '#ffb238'; g.fillRect(-4, -4, 8, 8); g.restore(); }
    g.restore();
    // sweep when UAV is up
    if (uav) { const a = (G.time * 2.4) % TAU; const gr = g.createConicGradient ? g.createConicGradient(a, C, C) : null; if (gr) { gr.addColorStop(0, 'rgba(255,178,56,.35)'); gr.addColorStop(.12, 'rgba(255,178,56,0)'); gr.addColorStop(1, 'rgba(255,178,56,0)'); g.fillStyle = gr; g.beginPath(); g.arc(C, C, C - 1, 0, TAU); g.fill(); } }
    // player arrow + range rings
    g.strokeStyle = 'rgba(236,229,207,.12)'; g.lineWidth = 1; g.beginPath(); g.arc(C, C, C / 2, 0, TAU); g.stroke();
    g.fillStyle = '#ece5cf'; g.beginPath(); g.moveTo(C, C - 7); g.lineTo(C + 5, C + 5); g.lineTo(C, C + 2); g.lineTo(C - 5, C + 5); g.closePath(); g.fill();
    this.html('radarInfo', `${uav ? '<b>מל״ט פעיל</b> · ' : ''}${enemyCount()} מחבלים בגזרה`);
  }
};

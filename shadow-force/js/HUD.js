'use strict';
/* =====================================================================
   HUD.js — tactical overlay in the style of modern military shooters:
   dynamic crosshair, hit markers, damage direction, compass with
   objective/enemy pips, rotating square minimap, squad list & name
   tags, kill feed with weapon icons, score medals, killstreak cards,
   weapon block with rendered weapon silhouette and ammo ticks.
   ===================================================================== */
const _hp = new V3();
const STREAK_ICON = { uav: 'i-uav', air: 'i-jet', apache: 'i-heli', naval: 'i-ship' };
const ROLE_ICON = { sniper: 'i-sniper', medic: 'i-medic', mg: 'i-mg', at: 'i-rocket' };
const STANCE_ICON = ['i-stand', 'i-crouch', 'i-prone'];
const HUD = {
  el: {}, cache: {}, dmgArcs: [], tagEls: [], bannerT: 0, hitT: 0, popQ: [],
  init() {
    for (const id of ['hud', 'cross', 'hitm', 'dmgRing', 'grenadeWarn', 'compStrip', 'compMarks', 'compDeg', 'radar', 'radarInfo', 'objTag', 'objTitle', 'objText', 'feed', 'orderName', 'squadCards',
      'streaks', 'stance', 'stanceIco', 'hpFill', 'hpGhost', 'hpNum', 'wIcon', 'wName', 'aMag', 'aRes', 'ammoTicks', 'ammoFill', 'gFrag', 'gSmoke', 'gC4', 'gLnch',
      'subs', 'banner', 'bannerK', 'bannerT', 'bannerS', 'prompt', 'marker', 'orderMark', 'tags', 'popups', 'downed', 'downedTxt', 'downedFill', 'fps'])
      this.el[id] = $(id);
    this.rctx = this.el.radar.getContext('2d');
    const names = { 0: 'צ', 45: 'צמ', 90: 'מז', 135: 'דמ', 180: 'ד', 225: 'דמע', 270: 'מע', 315: 'צמע' };
    let html = '';
    for (let d = -360; d <= 720; d += 5) {
      const n = ((d % 360) + 360) % 360, left = (d + 360) * 4;
      if (n % 15) html += `<span class="m" style="left:${left}px"></span>`;
      else html += `<span style="left:${left}px" class="${names[n] ? 'c' : ''}">${names[n] || n}</span>`;
    }
    this.el.compStrip.innerHTML = html;
    for (let i = 0; i < 4; i++) { const a = document.createElement('div'); a.className = 'arc'; this.el.dmgRing.appendChild(a); this.dmgArcs.push({ el: a, t: 0, x: 0, z: 0 }); }
    this.streaks();
  },
  set(id, v) { if (this.cache[id] !== v) { this.cache[id] = v; this.el[id].textContent = v; } },
  html(id, v) { if (this.cache[id] !== v) { this.cache[id] = v; this.el[id].innerHTML = v; } },
  show(on) { this.el.hud.hidden = !on; this.cache = {}; },
  buildSquad() {
    this.el.squadCards.innerHTML = squad.members.map((m, i) => `<div class="sq" id="sq${i}"><svg><use href="#${ROLE_ICON[m.role]}"/></svg><b>${m.def.name}</b><em>${m.def.title}</em><div class="st" id="sqs${i}"></div><div class="bar"><i id="sqb${i}"></i></div></div>`).join('');
    this.el.tags.innerHTML = squad.members.map(m => `<div>${m.def.name}<small>${m.def.title}</small></div>`).join('');
    this.tagEls = [...this.el.tags.children];
    this.sqEls = squad.members.map((m, i) => ({ card: $('sq' + i), bar: $('sqb' + i), st: $('sqs' + i), last: '' }));
    this.order('follow');
  },
  order(o) { this.set('orderName', ORDER_NAMES[o]); },
  weaponChanged() { this.cache.wId = null; },
  streaks() {
    this.el.streaks.innerHTML = STREAKS.map(s => {
      const n = streakReady[s.id] || 0, prog = Math.min(P.streak, s.need) / s.need;
      return `<div class="stk ${n ? 'rdy' : ''}" title="${s.name}"><kbd>${s.key}</kbd><svg><use href="#${STREAK_ICON[s.id]}"/></svg><span class="n">${n ? (n > 1 ? '×' + n : '') : Math.min(P.streak, s.need) + '/' + s.need}</span>${n ? '' : `<i class="fill" style="width:${prog * 100}%"></i>`}</div>`;
    }).join('');
  },
  feed(html, cls = '') {
    const d = document.createElement('div'); d.innerHTML = html; if (cls) d.className = cls;
    this.el.feed.appendChild(d); while (this.el.feed.children.length > 6) this.el.feed.firstChild.remove();
    setTimeout(() => d.remove(), 6000);
  },
  kill(killer, kCls, icon, victim, head, me) {
    const img = icon ? `<img src="${icon}" alt="">` : '';
    this.feed(`<span class="${kCls}">${killer}</span>${img}${head ? '<svg><use href="#i-skull"/></svg>' : ''}<span class="e">${victim}</span>`, me ? 'me' : '');
  },
  sub(name, text) {
    const d = document.createElement('div'); d.innerHTML = name ? `<b>${name}:</b>${text}` : text;
    this.el.subs.appendChild(d); while (this.el.subs.children.length > 3) this.el.subs.firstChild.remove();
    setTimeout(() => d.remove(), 3800);
  },
  banner(t, s, dur = 3, k = '') {
    this.el.bannerK.textContent = k; this.el.bannerT.textContent = t; this.el.bannerS.textContent = s || '';
    const b = this.el.banner; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); this.bannerT = dur;
  },
  score(pts, label) {
    const d = document.createElement('div'); d.innerHTML = `<b>+${pts}</b><span>${label}</span>`;
    const n = this.el.popups.children.length; d.style.top = (n * 34) + 'px';
    this.el.popups.appendChild(d); setTimeout(() => d.remove(), 1300);
  },
  popup(txt) { this.score('', txt); },
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
  bearing(x, z) { return ((Math.atan2(x - P.pos.x, -(z - P.pos.z)) * 180 / PI) + 360) % 360; },
  update(dt) {
    const s = WS.slots[WS.cur], d = s.d;
    // crosshair spread
    const sp = (lerp(d.spread, d.ads, WS.ads) * (P.speed > 1 ? 1.5 : 1) * (P.stance === 1 ? .75 : P.stance === 2 ? .55 : 1) + WS.bloom) * innerHeight / (2 * Math.tan(camera.fov * PI / 360)) + 4;
    const c = this.el.cross;
    const hide = WS.ads > .55 || P.sprinting || WS.scoped || d.proj && WS.ads > .3;
    c.style.opacity = hide ? 0 : 1;
    if (!hide) { const k = c.children; const g = Math.min(80, sp).toFixed(1); k[0].style.top = `${-g - 9}px`; k[1].style.top = `${+g}px`; k[2].style.left = `${-g - 9}px`; k[3].style.left = `${+g}px`; }
    if (this.hitT > 0) { this.hitT -= dt; if (this.hitT <= 0) this.el.hitm.style.opacity = 0; }
    for (const a of this.dmgArcs) {
      if (a.t <= 0) continue; a.t -= dt;
      const ang = Math.atan2(a.x - P.pos.x, a.z - P.pos.z), rel = -(ang - (P.yaw + PI));
      a.el.style.transform = `rotate(${rel}rad)`; a.el.style.opacity = Math.min(1, a.t);
    }
    // weapon block
    if (this.cache.wId !== s.id) { this.cache.wId = s.id; this.el.wIcon.src = WICON[s.id] || ''; this.el.wName.textContent = d.name + ' · ' + d.cls; }
    this.set('aMag', String(s.mag)); this.set('aRes', String(s.res));
    const low = s.mag <= Math.ceil(d.mag * .25);
    if (this.cache.low !== low) { this.cache.low = low; this.el.aMag.classList.toggle('low', low); this.el.ammoTicks.classList.toggle('low', low); }
    const tw = Math.min(220, Math.max(24, d.mag * 4)); if (this.cache.tw !== tw) { this.cache.tw = tw; this.el.ammoTicks.style.width = tw + 'px'; }
    this.el.ammoFill.style.width = (s.mag / d.mag * 100) + '%';
    const gear = (el, n, key) => { if (this.cache[key] !== n) { this.cache[key] = n; el.querySelector('b').textContent = n; el.classList.toggle('empty', !n); } };
    gear(this.el.gFrag, WS.frag, 'gF'); gear(this.el.gSmoke, WS.smokeG, 'gS'); gear(this.el.gC4, WS.c4 + (WS.c4s.length ? '·' + WS.c4s.length : ''), 'gC');
    const ln = WS.slots[2]; gear(this.el.gLnch, ln ? ln.mag + ln.res : 0, 'gL');
    // vitals
    const hp = Math.max(0, Math.round(P.hp));
    this.set('hpNum', String(hp)); this.el.hpFill.style.width = hp + '%'; this.el.hpGhost.style.width = hp + '%';
    const lowHp = hp < 35; if (this.cache.lowHp !== lowHp) { this.cache.lowHp = lowHp; this.el.hpFill.classList.toggle('low', lowHp); }
    const stI = P.downed ? 2 : P.slideT > 0 ? 1 : P.stance;
    if (this.cache.stI !== stI) { this.cache.stI = stI; this.el.stanceIco.innerHTML = `<use href="#${STANCE_ICON[stI]}"/>`; }
    this.set('stance', (P.downed ? 'פצוע' : P.slideT > 0 ? 'החלקה' : STANCE_NAMES[P.stance]) + (WS.scoped ? ` · נשימה ${Math.round(P.breath * 100)}%` : ''));
    // compass + pips
    const head = ((-P.yaw * 180 / PI) % 360 + 360) % 360, half = this.el.compStrip.parentElement.clientWidth / 2, tx = -(head + 360) * 4 + half;
    this.el.compStrip.style.transform = `translateX(${tx}px)`; this.el.compMarks.style.transform = `translateX(${tx}px)`;
    this.set('compDeg', String(Math.round(head) % 360).padStart(3, '0'));
    let pips = '';
    const pip = (b, cls) => { for (const o of [-360, 0, 360]) pips += `<i class="${cls}" style="left:${(b + o + 360) * 4}px"></i>`; };
    const m = G.mission, mk = m && m.def.marker ? m.def.marker(m) : null;
    if (mk) pip(this.bearing(mk.x, mk.z), 'o');
    for (const e of chars) if (e.team === 'enemy' && e.alive && (G.uavT > 0 || G.time - e.lastShot < 1.2)) pip(this.bearing(e.pos.x, e.pos.z), 'e');
    this.el.compMarks.innerHTML = pips;
    // objective
    if (m) {
      const o = m.def.obj(m); this.set('objTitle', o[0]); this.html('objText', o.slice(1).map(t => `<div>${t}</div>`).join(''));
      const me = this.el.marker;
      if (mk) {
        const pr = this.project(_hp.set(mk.x, (mk.y || 0) + 2.5, mk.z), {});
        const x = clamp(pr.x, 30, innerWidth - 30), y = clamp(pr.y, 70, innerHeight - 70);
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
    // squad list + name tags
    squad.members.forEach((a, i) => {
      const e = this.sqEls[i]; if (!e) return;
      const st = a.downed ? `פצוע · ${Math.ceil(a.downT)} שנ׳` : a.task ? (a.task === P ? 'מטפל בך' : 'מטפל בפצוע') : a.reloadT > 0 ? 'טוען' : a.suppressing ? 'אש חיפוי' : a.target && a.see ? (a.target.isVeh ? 'מעסיק רכב' : 'באש') : squad.order === 'hold' ? 'בעמדה' : 'בתנועה';
      if (e.last !== st) { e.last = st; e.st.textContent = st; e.card.className = 'sq' + (a.downed ? ' down' : a.task ? ' busy' : ''); }
      e.bar.style.width = (a.downed ? 0 : Math.max(0, a.hp / a.max * 100)) + '%';
      const t = this.tagEls[i], pr = this.project(_hp.set(a.pos.x, a.pos.y + 2.2, a.pos.z), {});
      const dist = dxz(a.pos, P.pos);
      if (pr.on && dist < 140) { t.style.display = 'flex'; t.style.flexDirection = 'column'; t.style.transform = `translate(${pr.x}px,${pr.y}px) translate(-50%,-100%)`; t.style.opacity = dist > 60 ? .55 : 1; t.className = a.downed ? 'down' : ''; }
      else t.style.display = 'none';
    });
    let gw = false; for (const p of projs) if (p.type === 'grenade' && p.team === 'enemy' && p.pos.distanceTo(P.pos) < 9) { gw = true; break; }
    if (this.cache.gw !== gw) { this.cache.gw = gw; this.el.grenadeWarn.hidden = !gw; }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.el.banner.classList.remove('on'); }
    if (P.downed) { this.set('downedTxt', squad.members.some(a => a.role === 'medic' && a.alive && !a.downed) ? `החובש בדרך · ${Math.ceil(P.downT)} שנ׳ · ירי באקדח בלבד` : 'אין חובש זמין'); this.el.downedFill.style.width = (P.reviveP / 2.6 * 100) + '%'; }
    this.radar();
  },
  radar() {
    const g = this.rctx, S = 440, C = S / 2, range = 85, k = C / range;
    g.clearRect(0, 0, S, S);
    g.save(); g.translate(C, C); g.rotate(P.yaw);
    const px = P.pos.x, pz = P.pos.z, R2 = range * 1.5;
    // terrain tint, sea, roads
    if (pz - R2 < -150) { g.fillStyle = 'rgba(48,104,128,.45)'; g.fillRect(-R2 * 2 * k, (-150 - pz) * k - R2 * 2 * k, R2 * 4 * k, R2 * 2 * k); }
    g.fillStyle = 'rgba(160,150,128,.18)';
    const road = (x, z, w, d) => g.fillRect((x - w / 2 - px) * k, (z - d / 2 - pz) * k, w * k, d * k);
    road(0, -28, 10, 236); road(0, -24, 292, 10); road(0, -138, 292, 9); road(-138, -34, 9, 216); road(138, -34, 9, 216); road(0, 72, 292, 9);
    g.fillStyle = 'rgba(214,200,164,.34)'; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5;
    for (const c of colliders) {
      if (!c.on || c.y0 > 0 || c.h < 1.5) continue;
      if (c.x1 < px - R2 || c.x0 > px + R2 || c.z1 < pz - R2 || c.z0 > pz + R2) continue;
      const x = (c.x0 - px) * k, y = (c.z0 - pz) * k, w = (c.x1 - c.x0) * k, h = (c.z1 - c.z0) * k;
      g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h);
    }
    const dot = (x, z, r, col, sq, rot) => {
      const dx = (x - px) * k, dz = (z - pz) * k; if (Math.abs(dx) > C * 1.42 || Math.abs(dz) > C * 1.42) return;
      g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2;
      if (sq) { g.fillRect(dx - r, dz - r, r * 2, r * 2); g.strokeRect(dx - r, dz - r, r * 2, r * 2); }
      else if (rot !== undefined) { g.save(); g.translate(dx, dz); g.rotate(-rot + PI); g.beginPath(); g.moveTo(0, -r * 1.5); g.lineTo(r, r); g.lineTo(-r, r); g.closePath(); g.fill(); g.stroke(); g.restore(); }
      else { g.beginPath(); g.arc(dx, dz, r, 0, TAU); g.fill(); g.stroke(); }
    };
    const uav = G.uavT > 0;
    for (const e of chars) {
      if (e.team === 'enemy' && e.alive) { const seen = uav || G.time - e.lastShot < 1.6 || dxz(e.pos, P.pos) < 14; if (seen) dot(e.pos.x, e.pos.z, 6, '#ff4a3a'); }
      else if (e.team === 'ally' && e.alive) dot(e.pos.x, e.pos.z, 6, e.downed ? '#ff9a7a' : '#5ec8ff', false, e.yaw);
    }
    for (const v of vehicles) { if (!v.alive) continue; if (v.team === 'enemy' && (uav || dxz(v.pos, P.pos) < 70 || v.air)) dot(v.pos.x, v.pos.z, v.air ? 9 : 8, '#ff4a3a', true); else if (v.team === 'ally') dot(v.pos.x, v.pos.z, 8, '#5ec8ff', true); }
    const m = G.mission, mk = m && m.def.marker ? m.def.marker(m) : null;
    if (mk) { let dx = (mk.x - px) * k, dz = (mk.z - pz) * k; const lim = C - 14; const sc = Math.max(Math.abs(dx), Math.abs(dz)) / lim; if (sc > 1) { dx /= sc; dz /= sc; } g.save(); g.translate(dx, dz); g.rotate(-P.yaw + PI / 4); g.fillStyle = '#ffb238'; g.strokeStyle = '#000'; g.lineWidth = 2; g.fillRect(-8, -8, 16, 16); g.strokeRect(-8, -8, 16, 16); g.restore(); }
    g.restore();
    // north marker riding the square frame
    const na = P.yaw - PI / 2, cx = Math.cos(na), cy = Math.sin(na), nr = (C - 18) / Math.max(Math.abs(cx), Math.abs(cy));
    const nx = C + cx * nr, ny = C + cy * nr;
    g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.arc(nx, ny, 14, 0, TAU); g.fill();
    g.fillStyle = '#e9c46a'; g.font = '800 18px Heebo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('צ', nx, ny + 1);
    if (uav) { const a = (G.time * 2.4) % TAU; const gr = g.createConicGradient ? g.createConicGradient(a, C, C) : null; if (gr) { gr.addColorStop(0, 'rgba(233,196,106,.35)'); gr.addColorStop(.1, 'rgba(233,196,106,0)'); gr.addColorStop(1, 'rgba(233,196,106,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); } }
    g.strokeStyle = 'rgba(241,239,232,.1)'; g.lineWidth = 2; g.beginPath(); g.arc(C, C, C * .5, 0, TAU); g.stroke();
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(C, C - 13); g.lineTo(C + 9, C + 9); g.lineTo(C, C + 4); g.lineTo(C - 9, C + 9); g.closePath(); g.fill(); g.stroke();
    this.html('radarInfo', `<span>${uav ? '<b>מל״ט פעיל</b>' : 'מכ״ם'}</span><span>${enemyCount()} מחבלים</span>`);
  }
};

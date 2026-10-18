'use strict';
/* =====================================================================
   Audio.js — fully synthesized sound (no assets): weapons, explosions,
   bullet cracks, rotor wash, war-zone ambience, spatial panning with
   distance attenuation/low-pass, and radio voice callouts.
   ===================================================================== */
let revSend = null, AC = null, master = null, NB = null, rotorG = null, battleG = null, sndBudget = 0, _dst = null, _t = 0;
const _ap = new V3(), _ar = new V3();

function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .25;
  comp.connect(AC.destination);
  master = AC.createGain(); master.gain.value = settings.vol; master.connect(comp);
  // generated impulse response: outdoor slap-back echo + long desert tail
  const ir = AC.createBuffer(2, AC.sampleRate * 2.4, AC.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) { const t = i / AC.sampleRate; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / 2.4, 3.2) * (t > .09 && t < .13 ? 2.2 : 1) * .6; } }
  const conv = AC.createConvolver(); conv.buffer = ir; revSend = AC.createGain(); revSend.gain.value = .32; revSend.connect(conv); conv.connect(master);
  NB = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
  const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  loopNoise(320, 'lowpass', .05, .7);                    // desert wind
  battleG = loopNoise(90, 'lowpass', .06, .5);           // distant battle rumble
  // helicopter rotor: low noise amplitude-modulated at blade-pass frequency
  const r = AC.createBufferSource(); r.buffer = NB; r.loop = true;
  const rf = AC.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 170;
  const am = AC.createGain(); am.gain.value = .45;
  const lfo = AC.createOscillator(); lfo.frequency.value = 17; const lg = AC.createGain(); lg.gain.value = .55;
  lfo.connect(lg); lg.connect(am.gain);
  rotorG = AC.createGain(); rotorG.gain.value = 0;
  r.connect(rf); rf.connect(am); am.connect(rotorG); rotorG.connect(master); r.start(); lfo.start();
  Voice.init();
}
function loopNoise(f, type, g, q = 1) {
  const s = AC.createBufferSource(); s.buffer = NB; s.loop = true;
  const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const gn = AC.createGain(); gn.gain.value = g; s.connect(fl); fl.connect(gn); gn.connect(master); s.start(); return gn;
}
function setVolume(v) { if (master) master.gain.value = v; }
function setRotor(v) { if (rotorG) rotorG.gain.setTargetAtTime(v, AC.currentTime, .15); }

function nz(dt, dur, f, q, g, type = 'bandpass', f2) {
  const t = _t + dt, s = AC.createBufferSource(); s.buffer = NB;
  const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
  const gn = AC.createGain(); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(fl); fl.connect(gn); gn.connect(_dst); s.start(t, Math.random() * 1.4); s.stop(t + dur + .05);
}
function tn(dt, f0, f1, dur, g, type = 'sine') {
  const t = _t + dt, o = AC.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  const gn = AC.createGain(); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(gn); gn.connect(_dst); o.start(t); o.stop(t + dur + .05);
}
const REVERB = { m4: 1, ak: 1, scar: 1, lmg: 1, sniper: 1, rocket: 1, tank: 1, boom: 1, boomS: 1, far: 1, sonic: 1, jet: 1 };
const SND = {
  m4() { nz(0, .12, 1500, .8, 1.1); nz(0, .05, 6500, .7, .55, 'highpass'); tn(0, 170, 45, .1, 1); nz(.012, .45, 520, .6, .22, 'lowpass'); },
  ak() { nz(0, .13, 1150, .8, 1.15); nz(0, .05, 5200, .7, .5, 'highpass'); tn(0, 150, 42, .11, 1); nz(.015, .5, 480, .6, .24, 'lowpass'); },
  scar() { nz(0, .15, 1000, .7, 1.25); nz(0, .05, 5000, .7, .55, 'highpass'); tn(0, 125, 36, .14, 1.15); nz(.015, .6, 420, .6, .27, 'lowpass'); },
  lmg() { nz(0, .13, 950, .7, 1.2); nz(0, .04, 5500, .7, .4, 'highpass'); tn(0, 135, 40, .12, 1.1); nz(.015, .5, 420, .6, .24, 'lowpass'); },
  sniper() { nz(0, .26, 850, .5, 1.5); tn(0, 95, 28, .4, 1.4); nz(0, .08, 4200, .5, .75, 'highpass'); nz(.04, 1.7, 260, .5, .42, 'lowpass'); },
  pistolS() { nz(0, .06, 2600, 1.2, .55); nz(0, .03, 8000, .8, .22, 'highpass'); tn(0, 420, 180, .03, .25, 'triangle'); },
  rocket() { nz(0, .8, 600, .4, 1.1, 'lowpass'); tn(0, 85, 40, .45, .9); nz(0, 1.4, 1800, 1.2, .35, 'bandpass', 600); },
  tank() { tn(0, 62, 22, .9, 1.8); nz(0, .4, 700, .4, 1.5, 'lowpass'); nz(0, .1, 3500, .6, .8, 'highpass'); nz(.05, 2.6, 160, .4, .6, 'lowpass'); },
  boom() { tn(0, 68, 20, 1.3, 1.9); nz(0, 1.8, 280, .4, 1.7, 'lowpass'); nz(0, .25, 2200, .5, .7); nz(.08, 2.8, 110, .4, .75, 'lowpass'); },
  boomS() { tn(0, 90, 30, .5, 1.1); nz(0, .7, 400, .5, 1, 'lowpass'); nz(0, .12, 2500, .5, .45); },
  far() { tn(0, 50, 22, 1.4, .8); nz(0, 2.2, 140, .4, .8, 'lowpass'); },
  crack() { nz(0, .05, 4500, 1.5, .9); tn(0, 2800, 900, .04, .25, 'sawtooth'); },
  whiz() { nz(0, .22, 2600, 4, .6, 'bandpass', 900); },
  click() { tn(0, 2000, 1700, .02, .3, 'square'); },
  hit() { tn(0, 2100, 1900, .045, .32, 'triangle'); nz(0, .03, 5000, 2, .2); },
  kill() { tn(0, 1250, 1250, .06, .35, 'triangle'); tn(.06, 1700, 1700, .1, .35, 'triangle'); },
  head() { tn(0, 2600, 2400, .05, .4, 'triangle'); nz(0, .06, 3000, 3, .45); tn(.05, 3100, 3100, .08, .25, 'triangle'); },
  magOut() { tn(0, 900, 600, .03, .25, 'square'); nz(0, .06, 2000, 2, .2); },
  magIn() { tn(0, 600, 450, .035, .35, 'square'); nz(0, .05, 1500, 2, .3); tn(.12, 1300, 1100, .03, .25, 'square'); },
  bolt() { tn(0, 700, 500, .04, .3, 'square'); tn(.18, 1100, 900, .04, .3, 'square'); nz(.1, .1, 2500, 2, .2); },
  step() { nz(0, .07, 240 + Math.random() * 140, 1, .2, 'lowpass'); },
  slide() { nz(0, .6, 900, .8, .4, 'bandpass', 300); },
  jet() { nz(0, 4.2, 1100, .6, 1.1, 'bandpass', 160); nz(0, 3, 3200, 1, .45, 'bandpass', 500); tn(0, 150, 55, 3.2, .45, 'sawtooth'); },
  sonic() { tn(0, 55, 25, .7, 1.7); nz(0, .45, 500, .5, 1.3, 'lowpass'); },
  whistle() { tn(0, 1700, 450, 1.1, .2); },
  knife() { nz(0, .14, 3800, 2, .55, 'bandpass', 1500); },
  throw() { nz(0, .18, 900, 1, .3, 'bandpass', 300); },
  pin() { tn(0, 3200, 3000, .04, .22, 'triangle'); },
  radio() { nz(0, .1, 2400, 3, .18); tn(0, 1400, 1400, .05, .07, 'square'); },
  ui() { tn(0, 880, 880, .07, .2, 'triangle'); },
  beep() { tn(0, 1800, 1800, .08, .25, 'square'); },
  heal() { tn(0, 700, 950, .2, .16); },
  hiss() { nz(0, 1.6, 3000, .7, .35, 'highpass'); },
  splash() { nz(0, .5, 900, .7, .5, 'bandpass', 300); }
};
function sfx(name, vol = 1, pos = null, delay = 0) {
  if (!AC || !master || sndBudget > 22) return;
  let pan = 0, dist = 0;
  if (pos) {
    dist = camera.position.distanceTo(pos); vol *= 18 / (18 + dist); if (vol < .02) return;
    _ap.copy(pos).sub(camera.position).normalize(); _ar.set(1, 0, 0).applyQuaternion(camera.quaternion);
    pan = clamp(_ap.dot(_ar), -1, 1) * .85; delay += dist / 343 * .5;
  }
  sndBudget++;
  const g = AC.createGain(); g.gain.value = vol; let last = g;
  if (revSend && REVERB[name]) g.connect(revSend);
  if (dist > 25) { const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(380, 9000 * 25 / dist); g.connect(lp); last = lp; }
  if (AC.createStereoPanner) { const p = AC.createStereoPanner(); p.pan.value = pan; last.connect(p); p.connect(master); } else last.connect(master);
  _dst = g; _t = AC.currentTime + delay;
  try { if (SND[name]) SND[name](); } catch (e) { /* ignore scheduling races */ }
}

/* ---------- radio voice (speech synthesis; Hebrew voice when installed, otherwise English) ---------- */
const Voice = {
  he: null, en: null, busyUntil: 0,
  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      const vs = speechSynthesis.getVoices();
      this.he = vs.find(v => /^(he|iw)/i.test(v.lang)) || null;
      this.en = vs.find(v => /^en-(US|GB)/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
    };
    load();
    try { speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { /* older browsers */ }
  },
  say(he, en, pitch = 1, prio = false) {
    if (!settings.voice || !('speechSynthesis' in window)) return;
    const now = performance.now();
    if (!prio && now < this.busyUntil) return;
    try {
      if (prio) speechSynthesis.cancel();
      const useHe = !!this.he, u = new SpeechSynthesisUtterance(useHe ? he : en);
      if (useHe) { u.voice = this.he; u.lang = this.he.lang; } else if (this.en) { u.voice = this.en; u.lang = this.en.lang; }
      u.rate = 1.2; u.pitch = pitch; u.volume = Math.min(1, settings.vol + .1);
      speechSynthesis.speak(u); this.busyUntil = now + 1700;
    } catch (e) { /* speech unavailable */ }
  },
  stop() { try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* noop */ } }
};

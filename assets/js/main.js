const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WA_NUMBER = '972512440252';
const waUrl = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

document.body.classList.add('loading');
$('#year').textContent = new Date().getFullYear();

/* ---------- loader + 3D ---------- */
const fillEl = $('#loader-fill');
function progress(p) { fillEl.style.transform = `scaleX(${p / 100})`; }

let booth = null;
const started = performance.now();
async function boot() {
  try {
    const { initBooth } = await import('./booth3d.js');
    booth = await initBooth($('#booth-canvas'), { onProgress: progress });
  } catch (err) {
    console.warn('3D disabled:', err);
    document.documentElement.classList.add('no-webgl');
    progress(100);
  }
  await sleep(Math.max(0, 1400 - (performance.now() - started)));
  $('#loader').classList.add('done');
  document.body.classList.remove('loading');
  document.dispatchEvent(new Event('aura:ready'));
}
boot();
// never trap visitors behind the loader
setTimeout(() => { $('#loader').classList.add('done'); document.body.classList.remove('loading'); }, 9000);

/* ---------- header, nav, progress ---------- */
const header = $('header');
const bar = $('#progress-bar');
const navLinks = $$('#nav a');
function onScroll() {
  header.classList.toggle('scrolled', scrollY > 40);
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const secObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach((s) => secObs.observe(s));

const burger = $('#burger');
burger.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  burger.setAttribute('aria-expanded', open);
});
navLinks.forEach((a) => a.addEventListener('click', () => { document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded', 'false'); }));

/* ---------- split headings + reveals ---------- */
$$('[data-split]').forEach((el) => {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = part;
          inner.style.transitionDelay = `${i++ * 70}ms`;
          w.append(inner); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
});

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    revealObs.unobserve(e.target);
  });
}, { threshold: .15, rootMargin: '0px 0px -8% 0px' });
function armReveals() {
  $$('.reveal, [data-split]').forEach((el, i) => {
    if (el.classList.contains('reveal') && el.parentElement) {
      const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 6) * 90}ms`;
    }
    revealObs.observe(el);
  });
}
document.addEventListener('aura:ready', armReveals, { once: true });

/* ---------- counters ---------- */
const countObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = reduced ? 1 : 2200;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countObs.unobserve(el);
  });
}, { threshold: .6 });
$$('[data-count]').forEach((el) => countObs.observe(el));

/* ---------- WhatsApp ---------- */
$$('.wa-link').forEach((a) => { a.href = waUrl('היי! אשמח לשמוע עוד על עמדות הצילום של AURA event 📸✨'); a.target = '_blank'; a.rel = 'noopener'; });
$$('.pkg-cta').forEach((a) => { a.href = waUrl(`היי! אשמח לפרטים על חבילת ${a.dataset.pkg} של AURA event 📸`); a.target = '_blank'; a.rel = 'noopener'; });

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

/* ---------- forms ---------- */
async function submitForm(form, okMsg) {
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true; btn.style.opacity = .6;
  try {
    const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    toast(okMsg);
    return true;
  } catch {
    toast('משהו השתבש בשליחה. אפשר לכתוב לנו בוואטסאפ 💬');
    return false;
  } finally { btn.disabled = false; btn.style.opacity = ''; }
}
$('#contact-form').addEventListener('submit', (e) => { e.preventDefault(); submitForm(e.target, 'הפרטים התקבלו ✨ נחזור אליכם בהקדם'); });

const stars = $$('.stars button'), ratingInput = $('#rating');
const paint = (v, cls) => stars.forEach((s) => s.classList.toggle(cls, +s.dataset.v <= v));
stars.forEach((s) => {
  s.addEventListener('mouseenter', () => paint(+s.dataset.v, 'hov'));
  s.addEventListener('mouseleave', () => paint(0, 'hov'));
  s.addEventListener('click', () => { ratingInput.value = s.dataset.v; paint(+s.dataset.v, 'on'); });
});
$('#review-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!ratingInput.value) { toast('בחרו דירוג בכוכבים ⭐'); return; }
  if (await submitForm(e.target, 'תודה על הביקורת 💛')) paint(0, 'on');
});

/* ---------- try it: webcam + snap + polaroid ---------- */
const video = $('#cam-video');
const camBtn = $('#cam-toggle');
const snapBtn = $('#snap-btn');
const countEl = $('#countdown');
const slot = $('#print-slot');
let stream = null, busy = false;

async function startCam() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    video.srcObject = stream;
    await video.play();
    booth?.setVideo(video);
    camBtn.classList.add('on'); camBtn.querySelector('span').textContent = 'מצלמה פעילה';
    toast('אתם על המסך של ה־Snap Box 😍');
  } catch {
    toast('לא הצלחנו לגשת למצלמה, נצלם עם תמונת הדוגמה');
  }
}
function stopCam() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null; video.srcObject = null;
  booth?.setVideo(null);
  camBtn.classList.remove('on'); camBtn.querySelector('span').textContent = 'הפעלת מצלמה';
}
camBtn.addEventListener('click', () => (stream ? stopCam() : startCam()));

const sample = new Image();
sample.src = 'assets/snapbox.webp';

function makePolaroid() {
  const W = 600, H = 740, P = 36, S = W - P * 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const paper = g.createLinearGradient(0, 0, W, H);
  paper.addColorStop(0, '#fbf7ee'); paper.addColorStop(1, '#efe6d4');
  g.fillStyle = paper; g.fillRect(0, 0, W, H);
  const live = stream && video.readyState >= 2;
  const src = live ? video : sample;
  const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight;
  g.fillStyle = '#111'; g.fillRect(P, P, S, S);
  if (sw && sh) {
    const s = Math.max(S / sw, S / sh), dw = sw * s, dh = sh * s;
    g.save();
    g.beginPath(); g.rect(P, P, S, S); g.clip();
    if (live) { g.translate(W, 0); g.scale(-1, 1); }
    g.filter = 'contrast(1.06) saturate(1.08)';
    g.drawImage(src, (W - dw) / 2, P + (S - dh) / (live ? 2 : 4), dw, dh);
    g.restore();
  }
  // golden frame line
  const gold = g.createLinearGradient(0, 0, W, 0);
  gold.addColorStop(0, '#9b7431'); gold.addColorStop(.5, '#e9c979'); gold.addColorStop(1, '#9b7431');
  g.strokeStyle = gold; g.lineWidth = 2; g.strokeRect(P + 10, P + 10, S - 20, S - 20);
  const f1 = '600 48px "Cormorant Garamond", Georgia, serif', f2 = 'italic 500 44px "Cormorant Garamond", Georgia, serif';
  g.font = f1; const w1 = g.measureText('AURA ').width;
  g.font = f2; const w2 = g.measureText('event').width;
  const x0 = (W - w1 - w2) / 2;
  g.textAlign = 'left';
  g.font = f1; g.fillStyle = '#1a1510'; g.fillText('AURA', x0, H - 86);
  g.font = f2; g.fillStyle = '#a07a33'; g.fillText('event', x0 + w1, H - 86);
  g.textAlign = 'center'; g.fillStyle = '#6d6252';
  g.font = '500 20px "Cormorant Garamond", Georgia, serif';
  const d = new Date();
  g.fillText(`SNAP BOX  ·  ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`, W / 2, H - 48);
  return c.toDataURL('image/jpeg', .92);
}

async function snap() {
  if (busy) return;
  busy = true; snapBtn.disabled = true;
  slot.hidden = true; slot.classList.remove('printing', 'done');
  for (const n of [3, 2, 1]) {
    booth?.setCountdown(n);
    countEl.textContent = n;
    countEl.classList.remove('tick'); void countEl.offsetWidth; countEl.classList.add('tick');
    await sleep(900);
  }
  booth?.setCountdown(0);
  countEl.textContent = '';
  const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  booth?.flash();
  const url = makePolaroid();
  await sleep(500);
  $('#polaroid-img').src = url;
  $('#download-btn').href = url;
  slot.hidden = false;
  void slot.offsetWidth;
  slot.classList.add('printing');
  await sleep(2400);
  slot.classList.add('done');
  busy = false; snapBtn.disabled = false;
}
snapBtn.addEventListener('click', snap);
$('#again-btn').addEventListener('click', snap);

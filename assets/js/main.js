const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

const WA_NUMBER = '972546056180';
const waUrl = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

document.body.classList.add('loading');
$('#year').textContent = new Date().getFullYear();

/* ---------- loader + 3D ---------- */
const fillEl = $('#loader-fill');
const progress = (p) => { fillEl.style.transform = `scaleX(${p / 100})`; };
let booth = null;
const started = performance.now();
function hideLoader() { $('#loader').classList.add('done'); document.body.classList.remove('loading'); }
async function boot() {
  try {
    const { initBooth } = await import('./booth3d.js');
    booth = await initBooth($('#booth-canvas'), { onProgress: progress });
  } catch (err) {
    console.warn('3D disabled:', err);
    document.documentElement.classList.add('no-webgl');
    progress(100);
  }
  await sleep(Math.max(0, 1200 - (performance.now() - started)));
  hideLoader();
  document.dispatchEvent(new Event('site:ready'));
}
boot();
setTimeout(hideLoader, 9000);

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
    if (e.isIntersecting) navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${e.target.id}`));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
$$('main section[id]').forEach((s) => secObs.observe(s));

const burger = $('#burger');
burger.addEventListener('click', () => burger.setAttribute('aria-expanded', document.body.classList.toggle('nav-open')));
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
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); revealObs.unobserve(e.target); } });
}, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
document.addEventListener('site:ready', () => {
  $$('.reveal, [data-split]').forEach((el) => {
    if (el.classList.contains('reveal')) {
      const sibs = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.transitionDelay = `${Math.min(sibs.indexOf(el), 6) * 80}ms`;
    }
    revealObs.observe(el);
  });
}, { once: true });

/* ---------- gallery: drop media that isn't uploaded yet ---------- */
const galleryTrack = $('#gallery-track');
function checkGallery() {
  const items = $$('.gallery-item', galleryTrack).filter((m) => !m.dataset.clone);
  $('#gallery').hidden = items.length < 3;
}
$$('.gallery-item', galleryTrack).forEach((m) => {
  m.addEventListener('error', () => { m.remove(); checkGallery(); }, { once: true });
  if (m.tagName === 'VIDEO') {
    const vo = new IntersectionObserver(([e]) => { e.isIntersecting ? m.play().catch(() => {}) : m.pause(); });
    vo.observe(m);
  }
});
checkGallery();
// duplicate once media settles so the marquee loops seamlessly
addEventListener('load', () => {
  $$('.gallery-item', galleryTrack).forEach((m) => {
    const c = m.cloneNode(true); c.dataset.clone = '1'; c.setAttribute('aria-hidden', 'true');
    if (c.tagName === 'VIDEO') { c.autoplay = true; c.muted = true; }
    galleryTrack.append(c);
  });
  $('#gallery').classList.add('loop');
});

/* ---------- WhatsApp ---------- */
$$('.wa-link').forEach((a) => {
  a.href = waUrl('היי מה נשמע, רציתי לשמוע יותר על החבילות שלכם של עמדת הצילום');
  a.target = '_blank'; a.rel = 'noopener noreferrer';
});

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

/* ---------- contact form → WhatsApp ---------- */
$('#contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = (id) => $(id).value.trim();
  const d = v('#c-date');
  const date = d ? d.split('-').reverse().join('/') : '';
  const msg = '✨ *בקשה חדשה לסנאפ בוקס* ✨\n\n'
    + `👤 *שם:* ${v('#c-name')}\n`
    + `📞 *טלפון:* ${v('#c-phone')}\n`
    + `📍 *מיקום:* ${v('#c-location')}\n`
    + `🎉 *סוג אירוע:* ${v('#c-type')}\n`
    + `👥 *כמות מוזמנים:* ${v('#c-guests')}\n`
    + `📅 *תאריך:* ${date}\n`
    + `📝 *הערות:* ${v('#c-notes')}`;
  window.open(waUrl(msg), '_blank', 'noopener');
});

/* ---------- FAQ: one open at a time + structured data ---------- */
const faqs = $$('.faq');
faqs.forEach((d) => d.addEventListener('toggle', () => { if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; }); }));
$('#faq-ld').textContent = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((d) => ({
    '@type': 'Question',
    name: d.querySelector('summary').textContent.trim(),
    acceptedAnswer: { '@type': 'Answer', text: d.querySelector('p').textContent.trim() },
  })),
});

/* ---------- accessibility + cookies ---------- */
const a11yBtn = $('#a11y-btn'), a11yMenu = $('#a11y-menu');
a11yBtn.addEventListener('click', () => { a11yMenu.hidden = !a11yMenu.hidden; a11yBtn.setAttribute('aria-expanded', !a11yMenu.hidden); });
const savedA11y = (store.get('sbA11y') || '').split(' ').filter(Boolean);
$$('[data-a11y]', a11yMenu).forEach((b) => {
  const cls = b.dataset.a11y;
  const apply = (on) => { document.documentElement.classList.toggle(cls, on); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); };
  apply(savedA11y.includes(cls));
  b.addEventListener('click', () => {
    apply(!document.documentElement.classList.contains(cls));
    store.set('sbA11y', $$('[data-a11y]', a11yMenu).map((x) => x.dataset.a11y).filter((c) => document.documentElement.classList.contains(c)).join(' '));
  });
});
if (!store.get('sbCookieConsent')) { $('#cookie').hidden = false; document.body.classList.add('cookie-on'); }
$('#cookie-ok').addEventListener('click', () => { store.set('sbCookieConsent', '1'); $('#cookie').hidden = true; document.body.classList.remove('cookie-on'); });

/* ---------- reviews (Firebase) ---------- */
const track = $('#reviews-track');
function reviewItem(text, name) {
  const div = document.createElement('div'); div.className = 'review-item';
  const q = document.createElement('p'); q.className = 'review-quote'; q.textContent = text;
  div.append(q);
  if (name) { const n = document.createElement('span'); n.className = 'review-name'; n.textContent = `— ${name}`; div.append(n); }
  return div;
}
let slide = 0;
setInterval(() => {
  const n = track.children.length;
  if (n <= 1) return;
  slide = (slide + 1) % n;
  track.style.transform = `translateX(${slide * 100}%)`;
}, 5000);

let reviewsCol = null, fs = null;
(async () => {
  try {
    const [{ initializeApp }, firestore] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'),
    ]);
    fs = firestore;
    const app = initializeApp({
      apiKey: 'AIzaSyBTR6_WpHJv9bw7UtIF4yRpHcGydYFj9pk',
      authDomain: 'snapbox-reviews.firebaseapp.com',
      projectId: 'snapbox-reviews',
      storageBucket: 'snapbox-reviews.firebasestorage.app',
      messagingSenderId: '665556822467',
      appId: '1:665556822467:web:8bfbff09c668c77c76f576',
    });
    reviewsCol = fs.collection(fs.getFirestore(app), 'reviews');
    fs.onSnapshot(fs.query(reviewsCol, fs.orderBy('createdAt', 'desc')), (snap) => {
      track.replaceChildren();
      slide = 0; track.style.transform = '';
      if (snap.empty) { track.append(reviewItem('עוד אין ביקורות. תהיו הראשונים?')); return; }
      snap.forEach((d) => { const r = d.data(); track.append(reviewItem(`"${r.text}"`, r.name)); });
    }, () => { track.replaceChildren(reviewItem('לא הצלחנו לטעון ביקורות כרגע.')); });
  } catch {
    track.replaceChildren(reviewItem('לא הצלחנו לטעון ביקורות כרגע.'));
  }
})();

$('#review-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#rv-submit');
  if (!reviewsCol) { toast('שליחת ביקורות לא זמינה כרגע, נסו שוב מאוחר יותר'); return; }
  btn.disabled = true; btn.textContent = 'שולח…';
  try {
    await fs.addDoc(reviewsCol, { name: $('#rv-name').value.trim(), email: $('#rv-email').value.trim(), text: $('#rv-text').value.trim(), createdAt: fs.serverTimestamp() });
    e.target.reset();
    toast('תודה! הביקורת התקבלה 🤍');
  } catch {
    toast('שגיאה בשליחת הביקורת');
  } finally { btn.disabled = false; btn.textContent = 'שליחת ביקורת'; }
});

/* ---------- Try me: camera, countdown, strip / magnet ---------- */
const video = $('#cam-video');
const preview = $('#preview');
const snapBtn = $('#snap-btn');
const hint = $('#try-hint');
const pCount = $('#preview-count');
const pShots = $('#preview-shots');
const bigCount = $('#countdown');
const slot = $('#print-slot');
let stream = null, busy = false, mode = 'strip', lastBlob = null;

const sample = new Image();
sample.src = 'assets/snapbox.webp';

$$('.mode').forEach((b) => b.addEventListener('click', () => {
  if (busy) return;
  mode = b.dataset.mode;
  $$('.mode').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
}));

function setIdleButton() {
  snapBtn.textContent = stream ? (mode === 'strip' ? 'צלמו סטריפ 📸' : 'צלמו מגנט 📸') : 'נסו אותי';
  hint.textContent = stream ? 'עמדו מול המצלמה ולחצו כשאתם מוכנים' : 'בלחיצה הדפדפן יבקש הרשאה להשתמש במצלמה';
}
$$('.mode').forEach((b) => b.addEventListener('click', setIdleButton));

async function startCam() {
  if (!navigator.mediaDevices?.getUserMedia) {
    toast('הדפדפן הזה לא תומך במצלמה. נצלם עם תמונת דוגמה');
    return false;
  }
  try {
    hint.textContent = 'אשרו את הגישה למצלמה בחלון שנפתח בדפדפן';
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
    video.srcObject = stream;
    await video.play();
    preview.classList.add('live');
    $('#cam-off').hidden = false;
    booth?.setVideo(video);
    setIdleButton();
    return true;
  } catch (err) {
    stream = null;
    const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
    toast(denied ? 'לא ניתנה הרשאה למצלמה. אפשר לאשר אותה בהגדרות הדפדפן' : 'לא מצאנו מצלמה זמינה');
    hint.textContent = 'בלי מצלמה נשתמש בתמונת דוגמה';
    return false;
  }
}
function stopCam() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null; video.srcObject = null;
  preview.classList.remove('live');
  $('#cam-off').hidden = true;
  booth?.setVideo(null);
  setIdleButton();
}
$('#cam-off').addEventListener('click', stopCam);

function grabFrame() {
  const live = stream && video.readyState >= 2;
  const src = live ? video : sample;
  const sw = src.videoWidth || src.naturalWidth || 4, sh = src.videoHeight || src.naturalHeight || 3;
  const c = document.createElement('canvas'); c.width = 960; c.height = 720;
  const g = c.getContext('2d');
  const s = Math.max(c.width / sw, c.height / sh), dw = sw * s, dh = sh * s;
  if (live) { g.translate(c.width, 0); g.scale(-1, 1); }
  g.drawImage(src, (c.width - dw) / 2, live ? (c.height - dh) / 2 : (c.height - dh) / 3, dw, dh);
  return c;
}

async function countdown() {
  for (const n of [3, 2, 1]) {
    booth?.setCountdown(n);
    pCount.textContent = n;
    bigCount.textContent = n;
    bigCount.classList.remove('tick'); void bigCount.offsetWidth; bigCount.classList.add('tick');
    await sleep(reduced ? 500 : 850);
  }
  booth?.setCountdown(0);
  pCount.textContent = ''; bigCount.textContent = '';
  const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  booth?.flash();
}

function drawCover(g, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  g.restore();
}
function brandFooter(g, W, yBase) {
  const f1 = '600 46px "Cormorant Garamond", Georgia, serif', f2 = 'italic 500 44px "Cormorant Garamond", Georgia, serif';
  g.font = f1; const w1 = g.measureText('SNAP ').width;
  g.font = f2; const w2 = g.measureText('Box').width;
  const x0 = (W - w1 - w2) / 2;
  g.textAlign = 'left';
  g.font = f1; g.fillStyle = '#1a1510'; g.fillText('SNAP', x0, yBase);
  g.font = f2; g.fillStyle = '#a07a33'; g.fillText('Box', x0 + w1, yBase);
  const d = new Date();
  g.textAlign = 'center'; g.fillStyle = '#6d6252';
  g.font = '500 19px "Cormorant Garamond", Georgia, serif';
  g.fillText(`${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}  ·  פשוט רגעים יפים`, W / 2, yBase + 36);
}
function paper(g, W, H) {
  const p = g.createLinearGradient(0, 0, W, H);
  p.addColorStop(0, '#fbf7ee'); p.addColorStop(1, '#efe6d4');
  g.fillStyle = p; g.fillRect(0, 0, W, H);
}
function composeMagnet(frame) {
  const W = 600, H = 740, P = 36, S = W - P * 2;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  paper(g, W, H);
  g.filter = 'contrast(1.05) saturate(1.06)';
  drawCover(g, frame, P, P, S, S);
  g.filter = 'none';
  g.strokeStyle = 'rgba(168,134,79,.8)'; g.lineWidth = 1.5; g.strokeRect(P + 10, P + 10, S - 20, S - 20);
  brandFooter(g, W, H - 90);
  return c;
}
function composeStrip(frames) {
  // 2x6 inch strip at 100 px/inch
  const W = 400, H = 1200, P = 22, gap = 16, fw = W - P * 2, fh = 300;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  paper(g, W, H);
  g.filter = 'contrast(1.05) saturate(1.06)';
  frames.forEach((f, i) => drawCover(g, f, P, P + i * (fh + gap), fw, fh));
  g.filter = 'none';
  const yb = P + 3 * (fh + gap) + 80;
  g.save(); g.scale(.82, .82); brandFooter(g, W / .82, yb / .82); g.restore();
  return c;
}

async function snap() {
  if (busy) return;
  if (!stream) {
    if (await startCam()) await sleep(900);
    else if (!confirm('לצלם עם תמונת דוגמה במקום מצלמה?')) return;
  }
  busy = true; snapBtn.disabled = true;
  $$('.mode').forEach((b) => { b.disabled = true; });
  slot.hidden = true; slot.classList.remove('printing', 'done');
  pShots.replaceChildren();
  const shots = mode === 'strip' ? 3 : 1;
  const frames = [];
  for (let i = 0; i < shots; i++) {
    hint.textContent = shots > 1 ? `תמונה ${i + 1} מתוך ${shots}` : 'חייכו!';
    await countdown();
    const f = grabFrame();
    frames.push(f);
    const th = new Image(); th.src = f.toDataURL('image/jpeg', .6); pShots.append(th);
    if (i < shots - 1) await sleep(700);
  }
  const out = mode === 'strip' ? composeStrip(frames) : composeMagnet(frames[0]);
  const url = out.toDataURL('image/jpeg', .92);
  lastBlob = await new Promise((r) => out.toBlob(r, 'image/jpeg', .92));
  await sleep(400);
  const img = $('#polaroid-img');
  img.src = url;
  img.classList.toggle('strip', mode === 'strip');
  const dl = $('#download-btn');
  dl.href = url; dl.download = mode === 'strip' ? 'snapbox-strip.jpg' : 'snapbox-magnet.jpg';
  const shareBtn = $('#share-btn');
  const file = lastBlob && new File([lastBlob], dl.download, { type: 'image/jpeg' });
  shareBtn.hidden = !(file && navigator.canShare?.({ files: [file] }));
  slot.hidden = false; void slot.offsetWidth; slot.classList.add('printing');
  slot.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  await sleep(2400);
  slot.classList.add('done');
  busy = false; snapBtn.disabled = false;
  $$('.mode').forEach((b) => { b.disabled = false; });
  setIdleButton();
}
snapBtn.addEventListener('click', snap);
$('#again-btn').addEventListener('click', snap);
$('#share-btn').addEventListener('click', async () => {
  const name = $('#download-btn').download;
  try { await navigator.share({ files: [new File([lastBlob], name, { type: 'image/jpeg' })], title: 'Snap Box' }); } catch { /* cancelled */ }
});

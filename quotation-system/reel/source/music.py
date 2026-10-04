"""Feel-good pop soundtrack (D major, I–V–vi–IV) with soft phone-style UI sounds.
Synthesized from scratch. No risers or booms; transitions are carried by the arrangement.
Bar downbeats are locked to 3.3s (brand reveal) and 34.0s (offer)."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, sys

SR = 48000
DUR = 41.5
N = int(SR * DUR)
rng = np.random.default_rng(11)
T0 = 3.3
BEAT = 30.7 / 60            # ~117 BPM
BAR = 4 * BEAT
tt = np.arange(N) / SR

def bar_t(k): return T0 + k * BAR
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def zeros(): return np.zeros((N, 2))
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)

def place(buf, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l, sig * r], 1) * 1.414
    s0 = max(0, -i); i0 = max(0, i)
    n = min(len(sig) - s0, N - i0)
    if n > 0: buf[i0:i0 + n] += sig[s0:s0 + n] * gain

def adsr(n, a, d, s, r_len=0.03):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    rl = int(r_len * SR)
    if rl and rl < n: e[-rl:] *= np.linspace(1, 0, rl)
    return e

IR_LEN = 2.6
_ir_t = np.arange(int(IR_LEN * SR)) / SR
IR = lp(rng.standard_normal((len(_ir_t), 2)) * np.exp(-3.8 * _ir_t / IR_LEN)[:, None], 5000)
IR[:int(.015 * SR)] = 0
IR /= np.sqrt((IR ** 2).sum(0, keepdims=True))
def reverb(x, mix):
    wet = np.stack([fftconvolve(x[:, c], IR[:, c])[:N] for c in range(2)], 1)
    return x + wet * mix

def delay(x, t, fb=0.3, taps=4):
    out = x.copy(); d = int(t * SR); g = 1.0
    for k in range(1, taps + 1):
        g *= fb
        if d * k >= N: break
        sh = np.zeros_like(x); sh[d * k:] = x[:N - d * k]
        out += (sh[:, ::-1] if k % 2 else sh) * g
    return out

# ---------------- harmony ----------------
CHORDS = [[62, 66, 69], [61, 64, 69], [62, 66, 71], [62, 67, 71]]   # D  A/C#  Bm  G   (close voicings)
ROOTS = [50, 45, 47, 43]                                            # D3 A2 B2 G2 (audible on phone speakers)
def harm(t):
    k = int(np.floor((t - T0) / BAR + 1e-6)) % 4
    return CHORDS[k], ROOTS[k]

LAST = bar_t(18)            # final chord ~40.14
BREAK = 8                   # signature moment: drums out
LIFT = 14                   # bar before the offer: drums out, tension by arrangement only

def bar_of(t): return int(np.floor((t - T0) / BAR + 1e-6))

# ---------------- electric piano ----------------
def epiano(f, n, vel=1.0):
    t = np.arange(n) / SR
    body = (np.sin(2 * np.pi * f * t) + .28 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
            + .12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 5))
    tine = .22 * np.sin(2 * np.pi * 7.02 * f * t) * np.exp(-t * 28)
    trem = 1 + .06 * np.sin(2 * np.pi * 4.6 * t)
    return (body * np.exp(-t * 1.1) + tine) * trem * vel

keys = zeros()
for k in range(-2, 18):
    t0 = bar_t(k)
    notes, _ = harm(t0 + 1e-3) if k >= 0 else (CHORDS[k % 4], 0)
    # rhythm: intro/brand = sustained whole notes; groove = syncopated pop comping
    if k < 2: hits = [(0, 4.0, .9)]
    elif k == BREAK or k == LIFT: hits = [(0, 2.0, .85), (2, 2.0, .7)]
    else: hits = [(0, 1.4, .85), (1.5, 1.0, .6), (2.5, 1.5, .75)]
    for off, ln, v in hits:
        n = int((ln * BEAT + .35) * SR)
        for j, m in enumerate(notes):
            s = epiano(mtof(m), n, v) * adsr(n, .004, 9, 1, .25)
            place(keys, s, t0 + off * BEAT + j * .006, .13, (j - 1) * .35)
keys *= np.interp(tt, [0, 1.0, LAST + 1.4, DUR], [0, 1, 1, 0])[:, None]

# ---------------- bass ----------------
bass = zeros()
pattern = [(0, .9), (1.5, .45), (2, .9), (3, .45), (3.5, .45)]
for k in range(2, 18):
    if k in (BREAK, LIFT): continue
    t0 = bar_t(k); _, r = harm(t0 + 1e-3)
    for off, ln in pattern:
        n = int(ln * BEAT * SR); f = mtof(r)
        tm = np.arange(n) / SR
        s = np.sin(2 * np.pi * f * tm) + .35 * np.sin(2 * np.pi * 2 * f * tm) + .12 * np.sin(2 * np.pi * 3 * f * tm)
        place(bass, np.tanh(1.4 * s) * adsr(n, .006, .25, .6, .03), t0 + off * BEAT, .16)
n = int(2.2 * SR); place(bass, np.sin(2 * np.pi * mtof(50) * np.arange(n) / SR) * adsr(n, .01, .9, 0, .4), LAST, .2)

# ---------------- drums (soft, warm) ----------------
def kick():
    n = int(.32 * SR); t = np.arange(n) / SR
    f = 52 + 70 * np.exp(-t / .03)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .14)
def snap():
    n = int(.22 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 1400, 5200) * (np.exp(-t / .012) * .9 + np.exp(-t / .07) * .25)
def shaker(acc):
    n = int(.06 * SR); t = np.arange(n) / SR
    e = np.minimum(t / .008, 1) * np.exp(-t / .02)
    return bp(rng.standard_normal(n), 5000, 11000) * e * acc

drums = zeros(); kicks = []
K, S = kick(), snap()
for k in range(0, 18):
    t0 = bar_t(k)
    for b in range(4):
        t = t0 + b * BEAT
        if k < 2:              # brand bars: just a gentle pulse
            for sh in range(2): place(drums, shaker(.3 + .3 * sh), t + sh * BEAT / 2, .1, .3)
            continue
        if k in (BREAK, LIFT):  # keep a light shaker so time keeps moving
            for s in range(2): place(drums, shaker(.35), t + s * BEAT / 2, .14, .3)
            continue
        place(drums, K, t, .42); kicks.append(t)
        if b in (1, 3): place(drums, S, t, .2, -.1)
        for s in range(4): place(drums, shaker(1 if s == 2 else .45), t + s * BEAT / 4, .12, .35)
    if k == LIFT:  # snaps on 2 and 4 + a short fill so the offer lands
        for b in (1, 3): place(drums, S, t0 + b * BEAT, .18, -.1)
        for s in range(4): place(drums, S, t0 + 3 * BEAT + s * BEAT / 4, .1 + .04 * s, .15 * (s - 1.5))

sc = np.ones(N)
for k in kicks:
    i = int(k * SR); j = min(N, i + int(.3 * SR)); seg = tt[i:j] - k
    sc[i:j] = np.minimum(sc[i:j], 1 - .32 * np.exp(-seg / .1))

# ---------------- pad (soft bed) ----------------
pad = zeros()
for k in range(-2, 18):
    t0 = bar_t(k); notes, _ = harm(t0 + 1e-3) if k >= 0 else (CHORDS[k % 4], 0)
    n = int((BAR + .5) * SR); tm = np.arange(n) / SR
    v = np.zeros((n, 2))
    for m in notes:
        for det, pn in ((-.07, -.6), (.07, .6)):
            s = np.sin(2 * np.pi * mtof(m - 12 + det) * tm) + .3 * np.sin(2 * np.pi * mtof(m + det) * tm)
            v[:, 0] += s * (1 - pn) * .5; v[:, 1] += s * (1 + pn) * .5
    v *= adsr(n, .5, 9, 1, .5)[:, None]
    place(pad, v, t0, .045)
pad = lp(pad, 1800)

# ---------------- lead hook (mallet-like) ----------------
MEL = [  # (beat, midi, beats) per 4-bar loop
    [(0, 74, 1), (1, 73, .5), (1.5, 74, .5), (2, 76, 1), (3, 74, 1)],
    [(0, 73, 1.5), (1.5, 69, .5), (2, 71, 1), (3, 73, 1)],
    [(0, 74, 1), (1, 71, .5), (1.5, 74, .5), (2, 78, 1.5), (3.5, 76, .5)],
    [(0, 74, 1), (1, 71, 1), (2, 74, .5), (2.5, 73, .5), (3, 69, 1)],
]
def mallet(f, n):
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 4) + .35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 16)
            + .12 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 8))
lead = zeros()
for k in range(4, 18):
    if k in (BREAK, LIFT, 13): continue
    t0 = bar_t(k)
    for off, m, ln in MEL[k % 4]:
        n = int((ln * BEAT + .5) * SR)
        place(lead, mallet(mtof(m), n), t0 + off * BEAT, .16, .15)
        if k >= 15: place(lead, mallet(mtof(m + 12), n), t0 + off * BEAT, .045, -.25)
lead = delay(lead, BEAT * .75, .28)

# ---------------- soft UI sounds (phone style) ----------------
ui = zeros()
def key_tick():
    n = int(.018 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 1800, 4500) * np.exp(-t / .0025)
def tap():
    n = int(.03 * SR); t = np.arange(n) / SR
    return (bp(rng.standard_normal(n), 900, 3000) * np.exp(-t / .003) + np.sin(2 * np.pi * 420 * t) * np.exp(-t / .008) * .5)
def swipe(d=.26):
    n = int(d * SR); x = np.linspace(0, 1, n)
    s = bp(rng.standard_normal(n), 1200, 7000) * np.sin(np.pi * x) ** 3
    return np.stack([s * (1 - .6 * x), s * (.4 + .6 * x)], 1)
def sent():
    n = int(.32 * SR); x = np.linspace(0, 1, n); t = np.arange(n) / SR
    air = bp(rng.standard_normal(n), 2000, 9000) * np.sin(np.pi * x) ** 2 * .6
    tone = np.sin(2 * np.pi * np.cumsum(500 + 900 * x ** 1.5) / SR) * np.sin(np.pi * x) ** 2 * .35
    return air + tone
def chime(freqs, gap=.11, dec=5.5, length=1.0):
    n = int((length + gap * len(freqs)) * SR); out = np.zeros(n)
    for i, f in enumerate(freqs):
        m = int(length * SR); t = np.arange(m) / SR
        s = (np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6)) * np.exp(-t * dec)
        s[:int(.002 * SR)] *= np.linspace(0, 1, int(.002 * SR))
        j = int(i * gap * SR); out[j:j + m] += s
    return out

place(ui, chime([1175, 1568]), 1.0, .11, .2)          # notification on screen
place(ui, chime([1175, 1568]), 1.5, .09, -.2)
for t in (6.45, 7.2, 7.8, 8.25, 9.15, 14.4, 21.75, 22.6): place(ui, tap(), t, .2)
for a, b in ((6.55, 7.1), (7.3, 7.7), (7.9, 8.15), (8.35, 9.05), (9.25, 9.6)):
    t = a
    while t < b: place(ui, key_tick(), t, .09, rng.uniform(-.15, .15)); t += rng.uniform(.06, .09)
for t in (14.95, 18.85, 26.95): place(ui, swipe(), t, .09)
place(ui, chime([1319], length=.9, dec=6), 12.95, .07)  # price ready
place(ui, sent(), 15.35, .16)                           # message sent
place(ui, chime([1568, 2093], gap=.1), 17.1, .1, -.15)  # reply received
place(ui, chime([1319, 1661, 1976], gap=.09), 23.45, .1)  # PDF saved
place(ui, chime([1760, 1319], gap=.13), 25.6, .1, .2)   # email
place(ui, chime([1976], length=.6, dec=8), 28.0, .07)   # status signed

# ---------------- mix ----------------
music = keys * (0.75 + .25 * sc)[:, None] + bass * sc[:, None] + drums + pad * sc[:, None] + lead
music = reverb(music, .22)
mix = music + reverb(ui, .1)
mix = hp(mix, 35)
mix *= np.interp(tt, [0, .02, DUR - 1.0, DUR], [0, 1, 1, 0])[:, None]
# gentle glue: soft knee only on peaks
pk = np.abs(mix).max(); mix /= pk
mix = np.where(np.abs(mix) > .7, np.sign(mix) * (.7 + .3 * np.tanh((np.abs(mix) - .7) / .3)), mix)
mix *= .89 / np.abs(mix).max()

out = sys.argv[1] if len(sys.argv) > 1 else 'music2.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out)

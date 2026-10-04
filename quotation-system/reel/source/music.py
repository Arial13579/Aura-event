"""Original soundtrack + SFX for the reel, synthesized from scratch (no samples).
Beat grid is locked so bar downbeats land on the brand reveal (3.3s) and the offer (34.0s)."""
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
import wave, sys

SR = 48000
DUR = 41.5
N = int(SR * DUR)
rng = np.random.default_rng(7)
T0 = 3.3
BEAT = 30.7 / 60          # ~117.3 BPM; 15 bars between 3.3s and 34.0s
BAR = 4 * BEAT

def bar_t(k): return T0 + k * BAR
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def zeros(): return np.zeros((N, 2))
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)

def place(buf, sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i + len(sig) <= 0: return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
    s0 = max(0, -i); i0 = max(0, i)
    n = min(len(sig) - s0, N - i0)
    buf[i0:i0 + n] += sig[s0:s0 + n] * gain

def env(n, a, d, sustain=0.0, curve=6.0):
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    dec = sustain + (1 - sustain) * np.exp(-curve * np.clip(t - a, 0, None) / max(d, 1e-4))
    return att * dec

def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    # band-limited-ish saw: sum of harmonics up to 12k
    out = np.zeros(n)
    kmax = int(min(40, 12000 / max(f, 1)))
    for k in range(1, kmax + 1):
        out += np.sin(2 * np.pi * k * f * t + phase * k) / k
    return out * (2 / np.pi)

def reverb_ir(seconds=2.4, damp=3000):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-4.2 * t / seconds)[:, None]
    ir = lp(ir, damp)
    ir[:int(0.012 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(0, keepdims=True))

IR = reverb_ir()
def reverb(x, mix=0.25):
    wet = np.stack([fftconvolve(x[:, c], IR[:, c])[:N] for c in range(2)], 1)
    return x * (1 - mix) + wet * mix

def delay(x, t=BEAT * 0.75, fb=0.38, taps=5, pingpong=True):
    out = x.copy(); d = int(t * SR); g = 1.0; cur = x
    for k in range(1, taps + 1):
        g *= fb
        sh = np.zeros_like(x); sh[d * k:] = x[:N - d * k] if d * k < N else 0
        if pingpong and k % 2: sh = sh[:, ::-1]
        out += sh * g
    return out

# ---------------- arrangement map ----------------
INTRO_END = T0
DROP2 = bar_t(15)            # 34.0
BREAK_BAR = 8               # half-time bar around the signature moment
BUILD_START = bar_t(13)      # 29.9
END_HIT = bar_t(18)          # ~40.14

chords = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]]   # Am  F  C/G  G
roots  = [45, 41, 48, 43]

def chord_at(t):
    k = int(np.floor((t - T0) / BAR)) % 4
    return chords[k], roots[k]

# ---------------- drums ----------------
def kick():
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.18)
    s[:int(.003 * SR)] += rng.standard_normal(int(.003 * SR)) * .4
    return np.tanh(s * 1.6)

def clap():
    n = int(0.35 * SR); noise = rng.standard_normal(n)
    e = np.zeros(n); t = np.arange(n) / SR
    for off in (0, .011, .022):
        e += np.exp(-np.clip(t - off, 0, None) / .008) * (t >= off)
    e += 0.6 * np.exp(-np.clip(t - .03, 0, None) / .09) * (t >= .03)
    return bp(noise * e, 900, 4200) * 1.3

def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    s = hp(rng.standard_normal(n), 7500, 4)
    return s * env(n, .0005, .16 if open_ else .025, curve=5)

drums = zeros(); kicks = []
KICK, CLAP, HATC, HATO = kick(), clap(), hat(), hat(True)
nbeats = int((DUR - T0) / BEAT) + 1
for b in range(nbeats):
    t = T0 + b * BEAT
    bar = b // 4; beat = b % 4
    if t >= END_HIT: break
    half = bar == BREAK_BAR
    if bar >= 2 or beat == 0:  # brand bars: kick only on downbeats
        if not half or beat == 0:
            place(drums, KICK, t, .95); kicks.append(t)
    if bar >= 2 and beat in (1, 3) and not half and not (13 <= bar < 15):
        place(drums, CLAP, t, .42, .08)
    if bar >= 2 and not half:
        place(drums, HATC, t + BEAT / 2, .18, -.25)
        if bar >= 15 or bar >= 4:
            place(drums, HATC, t + BEAT / 4, .07, .3); place(drums, HATC, t + 3 * BEAT / 4, .07, .3)
        if beat == 3: place(drums, HATO, t + BEAT / 2, .12, -.2)
# build: snare roll accelerating into 34.0
t = BUILD_START + BAR  # start roll at bar 14
steps = []
while t < DROP2 - 1e-3:
    p = (t - (BUILD_START + BAR)) / BAR
    steps.append((t, p)); t += BEAT / (2 if p < .5 else 4 if p < .85 else 8)
for t, p in steps: place(drums, CLAP, t, .18 + .3 * p, rng.uniform(-.2, .2))
for b in range(4):  # bar 13: kick on every beat, filtered feel
    place(drums, KICK, BUILD_START + b * BEAT, .75); kicks.append(BUILD_START + b * BEAT)

# sidechain gain curve
sc = np.ones(N)
tt = np.arange(N) / SR
for k in sorted(kicks):
    i = int(k * SR); j = min(N, i + int(.35 * SR))
    seg = tt[i:j] - k
    sc[i:j] = np.minimum(sc[i:j], 1 - .62 * np.exp(-seg / .11))

# ---------------- bass ----------------
bass = zeros()
for b in range(int((END_HIT - T0) / (BEAT / 2))):
    t = T0 + b * BEAT / 2
    bar = int((t - T0) // BAR)
    if bar < 2 and (b % 2): continue
    if bar == BREAK_BAR and b % 4: continue
    _, r = chord_at(t + 1e-4)
    n = int(BEAT / 2 * .92 * SR)
    f = mtof(r - 12 if b % 2 == 0 else r)
    s = saw(f, n) + .6 * saw(f * 1.004, n) + .5 * np.sin(2 * np.pi * f / 2 * np.arange(n) / SR)
    s *= env(n, .004, .9, sustain=.55)
    place(bass, s, t, .22)
bass = lp(bass, 520, 3) * sc[:, None]
place(bass, np.sin(2 * np.pi * 55 * np.arange(int(2.2 * SR)) / SR) * env(int(2.2 * SR), .005, 1.6), END_HIT, .55)

# ---------------- pad ----------------
pad = zeros()
for k in range(-2, 19):
    t = bar_t(k)
    if t > END_HIT + .01: break
    notes, _ = chord_at(max(t, 0) + 1e-3) if t >= T0 else (chords[(k) % 4], 0)
    n = int(BAR * SR) + int(.4 * SR)
    v = np.zeros((n, 2))
    for m in notes + [notes[0] + 12]:
        for d, pan in ((-.11, -.7), (0, 0), (.11, .7)):
            f = mtof(m + d)
            s = saw(f, n, rng.uniform(0, 6.28))
            l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
            v[:, 0] += s * l; v[:, 1] += s * r
    v *= env(n, .35, 2.5, sustain=.8)[:, None]
    v[-int(.4 * SR):] *= np.linspace(1, 0, int(.4 * SR))[:, None]
    place(pad, v, t, .045)
pad_lo = lp(pad, 380, 2); pad_hi = lp(pad, 2600, 2)
openness = np.interp(tt, [0, T0 - .2, T0, BUILD_START, DROP2 - .3, DROP2, DUR], [0, .25, .75, .75, .15, 1, 1])
pad = (pad_lo * (1 - openness[:, None]) + pad_hi * openness[:, None])
pad *= (0.55 + 0.45 * sc)[:, None]
pad *= np.interp(tt, [0, 1.2, END_HIT, DUR], [.3, 1, 1, 0])[:, None]

# ---------------- pluck arp ----------------
arp = zeros()
pattern = [0, 1, 2, 3, 2, 1, 2, 3]
for b in range(int((END_HIT - bar_t(2)) / (BEAT / 2))):
    t = bar_t(2) + b * BEAT / 2
    bar = int((t - T0) // BAR)
    if bar == BREAK_BAR or bar == 13: continue
    notes, _ = chord_at(t + 1e-4)
    seq = notes + [notes[0] + 12]
    m = seq[pattern[b % 8]] + 12
    n = int(.42 * SR)
    f = mtof(m)
    s = (saw(f, n) * .6 + np.sign(np.sin(2 * np.pi * f * np.arange(n) / SR)) * .25) * env(n, .002, .28, curve=7)
    place(arp, s, t, .06 + (.03 if bar >= 15 else 0), .25 if b % 2 else -.25)
arp = delay(lp(arp, 3200), fb=.32)

# ---------------- risers / impacts ----------------
fx = zeros()
def riser(t0, t1, gain=.25):
    n = int((t1 - t0) * SR); x = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    out = np.zeros(n); blk = 2048
    for i in range(0, n, blk):
        c = 400 + 7000 * x[i] ** 2
        out[i:i + blk] = bp(noise[i:i + blk], c, min(c * 1.8, 20000))
    tone = np.sin(2 * np.pi * np.cumsum(220 + 660 * x ** 2) / SR) * .25
    place(fx, (out + tone) * x ** 2.2, t0, gain)
def impact(t, gain=.55):
    n = int(2.4 * SR); tm = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(40 + 60 * np.exp(-tm / .08)) / SR) * np.exp(-tm / .7)
    crash = hp(rng.standard_normal(n), 3000) * np.exp(-tm / .9) * .35
    place(fx, np.tanh(boom * 1.5) + crash, t, gain)
riser(0.2, T0, .22); impact(T0, .6)
riser(BUILD_START + BAR * .5, DROP2, .3); impact(DROP2, .65)
impact(END_HIT, .45)

# ---------------- SFX synced to on-screen action ----------------
sfx = zeros()
def click():
    n = int(.03 * SR); tm = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1800 * tm) * np.exp(-tm / .006) + hp(rng.standard_normal(n), 4000) * np.exp(-tm / .002) * .5)
def tick(f=4200):
    n = int(.012 * SR); return bp(rng.standard_normal(n), f * .7, f * 1.3) * env(n, .0003, .006)
def whoosh(dur=.5):
    n = int(dur * SR); x = np.linspace(0, 1, n); noise = rng.standard_normal(n); out = np.zeros(n)
    for i in range(0, n, 1024):
        c = 300 + 3500 * np.sin(np.pi * x[i]) ** 1.5
        out[i:i + 1024] = bp(noise[i:i + 1024], c, c * 2.2)
    e = np.sin(np.pi * x) ** 2
    return np.stack([out * e * (1 - x), out * e * x], 1) * 1.2
def pop(f0=900, f1=380):
    n = int(.09 * SR); tm = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-tm / .02)) / SR) * env(n, .002, .05)
def bell(f, dur=1.0):
    n = int(dur * SR); tm = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * h * tm) * np.exp(-tm * dk) for h, a, dk in ((1, 1, 4), (2.76, .35, 7), (5.4, .15, 11)))
def blip(f, dur=.08):
    n = int(dur * SR); tm = np.arange(n) / SR
    return np.sin(2 * np.pi * f * tm) * env(n, .002, dur * .6)

# hook
for st in (.25, .45, .65): place(sfx, pop(700, 300), st, .35, rng.uniform(-.4, .4))
for st in (1.0, 1.5): place(sfx, bell(1318, .5) * .5 + bell(1760, .5) * .3, st, .22, .2)
n = int(.35 * SR); place(sfx, whoosh(.35)[:, ::-1] * 1.4, 2.4, .5)
# taps
for t in (6.45, 7.2, 7.8, 8.25, 9.15, 14.4, 21.75, 22.6): place(sfx, click(), t, .45, -.1)
# typing ticks
for a, b in ((6.55, 7.1), (7.3, 7.7), (7.9, 8.15), (8.35, 9.05), (9.25, 9.6)):
    t = a
    while t < b:
        place(sfx, tick(rng.uniform(3000, 5200)), t, .22, rng.uniform(-.2, .2)); t += rng.uniform(.045, .075)
# whooshes on screen moves
for t, d in ((5.85, .6), (14.85, .5), (18.75, .5), (26.85, .5), (30.1, .55), (33.8, .45)): place(sfx, whoosh(d), t, .32)
# distance + calc lines
place(sfx, blip(1500), 10.2, .25)
for k, t in enumerate((10.3, 10.75, 11.2)): place(sfx, blip(880 * 2 ** (k * 4 / 12)), t, .22, .2)
# price counter ticks accelerating, then sparkle
t = 11.7
while t < 12.9:
    p = (t - 11.7) / 1.2
    place(sfx, tick(2500 + 3000 * p), t, .25); t += .09 - .06 * p
for k in range(6): place(sfx, bell(2093 * 2 ** (rng.integers(0, 8) / 12), .7), 12.9 + k * .045, .1, rng.uniform(-.6, .6))
place(sfx, bell(1046, 1.2), 12.9, .18)
# whatsapp bubbles
place(sfx, pop(1000, 500), 15.35, .4, .2); place(sfx, blip(1760, .05), 16.5, .12)
place(sfx, pop(800, 420), 17.1, .38, -.2)
# pen on screen
n = int(1.6 * SR); tm = np.arange(n) / SR
pen = bp(rng.standard_normal(n), 2200, 6000) * (.35 + .65 * np.abs(np.sin(2 * np.pi * 3.2 * tm))) * env(n, .05, 9, sustain=1)
pen[-int(.1 * SR):] *= np.linspace(1, 0, int(.1 * SR))
place(sfx, pen, 19.7, .1)
# success chimes
for k, f in enumerate((1318, 1661, 1976)): place(sfx, bell(f, 1.2), 23.45 + k * .07, .18, (k - 1) * .3)
place(sfx, bell(1568, 1) * .7 + bell(2093, 1) * .5, 25.6, .2)       # email ding
for k, f in enumerate((1046, 1568)): place(sfx, bell(f, .9), 28.0 + k * .08, .16)
# role chips
for k in range(11): place(sfx, pop(700 + 40 * k, 350 + 25 * k), 31.0 + k * .12, .2, ((k % 3) - 1) * .4)
# offer
place(sfx, whoosh(.35)[:, ::-1], 34.85, .4)
for k, f in enumerate((1046, 1318, 1568, 2093)): place(sfx, bell(f, 1.6), 35.3 + k * .03, .14, (k - 1.5) * .3)
for k in range(5): place(sfx, blip(784 * 2 ** ([0, 2, 4, 7, 12][k] / 12), .1), 36.0 + k * .12, .24)
place(sfx, whoosh(.5), 37.3, .3)

# ---------------- mix & master ----------------
music = drums * .9 + bass + pad + arp + fx * .8
if len(sys.argv) > 2 and sys.argv[2] == 'sfx': music = fx * .55
music = reverb(music, .16)
mix = music + reverb(sfx, .12) * .9
mix = hp(mix, 28)
fade = np.interp(tt, [0, .03, DUR - 1.1, DUR], [0, 1, 1, 0])[:, None]
mix *= fade
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= np.abs(mix).max() / .89

out = sys.argv[1] if len(sys.argv) > 1 else 'music.wav'
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out, 'beat', round(BEAT, 4), 'bpm', round(60 / BEAT, 2))

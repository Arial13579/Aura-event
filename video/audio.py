import numpy as np, wave
SR = 44100
DUR = 26.5
N = int(SR * DUR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N: return
    s = sig[: N - i] * gain
    L[i:i + len(s)] += s * (1 - max(pan, 0))
    R[i:i + len(s)] += s * (1 + min(pan, 0))

def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

def tone(f, dur, a=.005, d=.3, harm=(1,)):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * h * t) / (k + 1) ** 1.3 for k, h in enumerate(harm))
    return s * env(n, a, d)

def kick(g=1.0):
    n = int(.45 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * g

def noise(dur, d, hp=True):
    n = int(dur * SR); x = rng.standard_normal(n)
    if hp: x = np.diff(x, prepend=0)
    return x * env(n, .001, d)

def lowpass(x, a):
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc); y[i] = acc
    return y

def whoosh(dur, rise=True):
    n = int(dur * SR); t = np.linspace(0, 1, n)
    x = lowpass(rng.standard_normal(n), .08)
    e = (t ** 2.5 if rise else (1 - t) ** 2) * np.sin(np.pi * np.minimum(t * 1.02, 1)) ** .2
    return x * e

def pad(freqs, dur, a=.6, rel=.8):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.6, 0.6):
            s += sum(np.sin(2 * np.pi * (f + det) * h * t) / h ** 1.6 for h in (1, 2, 3, 4))
    e = np.minimum(1, t / a) * np.minimum(1, (dur - t) / rel)
    return s * e / len(freqs) / 2

mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---- S1: tension 0 - 4.3
add(pad([mtof(33), mtof(40)], 4.4, a=.3, rel=.4), 0, .35)
for k in range(17):
    add(tone(1760, .08, d=.03), .15 + k * .25, .07 if k % 2 else .11, pan=.3 if k % 2 else -.3)
for k in range(10):
    tk = .6 + k * .09
    add(noise(.06, .02), tk, .09, pan=(rng.random() - .5))
add(kick(1.0), .55); add(noise(.4, .12, False), .55, .12)
add(kick(1.2), 2.62); add(noise(.6, .15, False), 2.62, .2)
add(tone(mtof(57), 1.4, d=.6, harm=(1, 2, 3)), 1.85, .18)
add(whoosh(.7), 3.75, .35)

# ---- S2: pain 4.3 - 8.6 (clock ticks, thuds)
add(pad([mtof(45), mtof(48), mtof(52)], 3.4, a=.4, rel=.3), 4.3, .22)
for k in range(13):
    add(noise(.03, .008), 4.4 + k * .25, .12 if k % 2 == 0 else .07)
for tt in (4.45, 5.6, 6.6):
    add(kick(.7), tt); add(tone(mtof(33), .6, d=.25), tt, .2)
for tt in (5.0, 6.15, 7.15):
    add(noise(.25, .07), tt, .1)  # strike
add(kick(1.4), 7.68); add(noise(.8, .25, False), 7.68, .25); add(tone(mtof(28), 1.0, d=.5), 7.68, .4)
add(whoosh(.75), 7.9, .5)

# ---- S3..S5: upbeat 8.6 - 23.2 (120bpm)
prog = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]]  # C G Am F
bass = [36, 43, 45, 41]
t = 8.6; bar = 0
while t < 23.1:
    ch = prog[bar % 4]
    d = min(2.0, 23.2 - t)
    add(pad([mtof(m) for m in ch], d + .3, a=.08, rel=.3), t, .28)
    for b in range(4):
        tb = t + b * .5
        if tb >= 23.1: break
        add(kick(.85), tb)
        add(tone(mtof(bass[bar % 4]), .45, a=.005, d=.18, harm=(1, 2)), tb, .35)
        add(noise(.05, .015), tb + .25, .06, pan=.2)
        if b in (1, 3): add(noise(.18, .05), tb, .08, pan=-.2)
        add(tone(mtof(ch[(b * 2) % 4] + 12), .25, d=.12, harm=(1, 2)), tb + .25, .05, pan=.4)
    t += 2.0; bar += 1
add(kick(1.5), 8.6); add(noise(1.0, .3, False), 8.6, .2)
for i, m in enumerate([72, 76, 79, 84]):
    add(tone(mtof(m), .8, d=.3, harm=(1, 2, 3)), 9.45 + i * .07, .12)
for w in (11.0, 19.4):
    add(whoosh(.6), w, .3)
for k in range(14):  # typing
    add(noise(.025, .006), 11.8 + k * .064 + rng.random() * .02, .14, pan=(rng.random() - .5) * .6)
for tt in (12.8, 13.1, 13.4):
    add(tone(mtof(84), .2, d=.07, harm=(1, 2)), tt, .14)
add(noise(.04, .01), 14.27, .25); add(tone(mtof(91), .25, d=.08), 14.3, .12)
for tt in (14.75, 15.65):
    add(tone(mtof(88), .4, d=.15, harm=(1, 3)), tt, .14); add(tone(mtof(93), .5, d=.2, harm=(1, 3)), tt + .09, .14)
add(noise(1.0, .5, False) * 0 + lowpass(rng.standard_normal(int(SR * 1.0)), .02) * env(int(SR * 1.0), .2, .5), 16.9, .25)
for i, m in enumerate([72, 76, 79, 84, 88]):
    add(tone(mtof(m), 1.2, d=.5, harm=(1, 2, 3)), 17.97 + i * .06, .15)
add(noise(.6, .25), 18.0, .12)
for i in range(4):
    add(tone(mtof(79 + i * 2), .3, d=.1, harm=(1, 2)), 20.3 + i * .38, .1)

# ---- S6: drop & resolve 23.2 - 26.5
add(whoosh(.5, False), 23.15, .3)
add(pad([mtof(45), mtof(52), mtof(57)], 1.0, a=.2, rel=.4), 23.2, .2)
add(kick(1.6), 23.72); add(noise(1.0, .35, False), 23.72, .25); add(tone(mtof(29), 1.2, d=.6), 23.72, .45)
add(whoosh(.5), 24.5, .3)
add(pad([mtof(m) for m in (48, 60, 64, 67, 72)], 1.6, a=.02, rel=.4), 24.95, .35)
add(kick(1.4), 24.95)
for i, m in enumerate([72, 76, 79, 84, 88, 91]):
    add(tone(mtof(m), 1.4, d=.6, harm=(1, 2, 3)), 25.1 + i * .06, .1)
add(pad([mtof(m) for m in (48, 55, 64, 67, 71, 74)], 1.0, a=.05, rel=.9), 25.5, .3)

mix = np.stack([L, R], 1)
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.6) / np.tanh(1.6) * .9
fade = np.ones(N); nf = int(.35 * SR); fade[-nf:] = np.linspace(1, 0, nf)
mix *= fade[:, None]
with wave.open('music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok')

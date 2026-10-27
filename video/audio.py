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

# ---- S1 WARNING 0 - 3.9 (red, alarm)
add(pad([mtof(33), mtof(40)], 4.0, a=.2, rel=.3), 0, .4)
add(whoosh(.4), -0.0 if False else 0.0, .3)
for k in range(7):  # alarm beeps
    add(tone(mtof(81) if k % 2 == 0 else mtof(76), .2, a=.005, d=.15, harm=(1, 3, 5)), 1.0 + k * .4, .09)
for i in range(5):  # letter slams
    add(kick(.8), .3 + i * .07); add(noise(.12, .04), .3 + i * .07, .12)
add(kick(1.4), .78); add(noise(.7, .2, False), .78, .3); add(tone(mtof(26), 1.2, d=.6), .78, .45)
add(noise(.2, .05), 1.15, .1)
add(kick(.9), 1.55); add(noise(.3, .08), 1.55, .12)
add(whoosh(.5), 3.35, .45)
# ---- S2 PAIN 3.9 - 7.8
add(pad([mtof(45), mtof(48), mtof(52)], 3.3, a=.3, rel=.3), 3.9, .2)
for tt in (4.0, 4.6, 5.2):
    add(kick(1.1), tt); add(noise(.35, .1, False), tt, .2)
for tt in (4.25, 4.85, 5.45):
    add(noise(.2, .05), tt, .16, pan=.3)
for k in range(4):
    add(noise(.03, .008), 5.95 + k * .15, .14)
add(kick(.8), 6.6); add(tone(mtof(33), .6, d=.3), 6.6, .25)
add(whoosh(.45, False), 6.95, .3)
add(whoosh(.5), 6.85, .45)
add(kick(1.7), 7.32); add(noise(1.0, .3, False), 7.32, .32); add(tone(mtof(24), 1.4, d=.7), 7.32, .55)
# ---- groove 7.8 - 22.8
prog = [[60, 64, 67, 72], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]]
bass = [36, 43, 45, 41]
t = 7.8; bar = 0
while t < 22.75:
    ch = prog[bar % 4]
    d = min(2.0, 22.8 - t)
    add(pad([mtof(m) for m in ch], d + .25, a=.06, rel=.25), t, .26)
    for b in range(4):
        tb = t + b * .5
        if tb >= 22.75: break
        add(kick(.85), tb)
        add(tone(mtof(bass[bar % 4]), .45, a=.005, d=.18, harm=(1, 2)), tb, .35)
        add(noise(.05, .015), tb + .25, .07, pan=.2)
        add(noise(.04, .01), tb + .125, .03, pan=-.3); add(noise(.04, .01), tb + .375, .03, pan=-.3)
        if b in (1, 3): add(noise(.18, .05), tb, .1, pan=-.2)
        add(tone(mtof(ch[(b * 2) % 4] + 12), .25, d=.12, harm=(1, 2)), tb + .25, .05, pan=.4)
    t += 2.0; bar += 1
for i in range(4):
    add(noise(.05, .012), 7.85 + i * .05, .2)
add(kick(1.2), 8.25); add(tone(mtof(84), .3, d=.1, harm=(1, 2, 3)), 8.25, .15)
add(whoosh(.3), 8.05, .35); add(whoosh(.3), 8.13, .3)
for i, m in enumerate([72, 76, 79, 84]):
    add(tone(mtof(m), .8, d=.3, harm=(1, 2, 3)), 8.4 + i * .07, .1)
add(whoosh(.7), 9.7, .35); add(whoosh(.6), 9.95, .3)
for k in range(12):
    add(noise(.025, .006), 10.8 + k * .062 + rng.random() * .02, .14, pan=(rng.random() - .5) * .6)
for tt in (11.65, 11.9, 12.15):
    add(tone(mtof(84), .2, d=.07, harm=(1, 2)), tt, .14)
add(tone(mtof(91), .3, d=.1), 12.5, .1)
add(noise(.04, .01), 13.4, .3); add(tone(mtof(91), .25, d=.08), 13.42, .12)
for tt in (13.7, 14.35):
    add(tone(mtof(88), .4, d=.15, harm=(1, 3)), tt, .14); add(tone(mtof(93), .5, d=.2, harm=(1, 3)), tt + .09, .14)
add(whoosh(.6), 14.75, .4)
add(lowpass(rng.standard_normal(int(SR * 1.0)), .03) * env(int(SR * 1.0), .2, .6), 15.55, .3)
add(kick(1.4), 16.85); add(noise(.6, .25), 16.85, .15)
for i, m in enumerate([72, 76, 79, 84, 88]):
    add(tone(mtof(m), 1.2, d=.5, harm=(1, 2, 3)), 16.87 + i * .06, .14)
add(whoosh(.6), 18.45, .45)
for tt in (19.0, 19.95, 20.9, 21.85):
    add(kick(1.3), tt); add(noise(.5, .15, False), tt, .22); add(whoosh(.3), tt - .3, .25)
# ---- S6 23
add(whoosh(.35), 22.75, .3)
add(pad([mtof(45), mtof(52), mtof(57)], 1.6, a=.2, rel=.4), 22.8, .2)
add(kick(1.5), 23.32); add(noise(.8, .25, False), 23.32, .25)
add(kick(1.8), 23.66); add(noise(1.0, .35, False), 23.66, .3); add(tone(mtof(24), 1.3, d=.7), 23.66, .55)
add(whoosh(.45), 24.3, .35)
for i in range(4):
    add(noise(.05, .012), 24.65 + i * .05, .2)
add(tone(mtof(84), .3, d=.1, harm=(1, 2, 3)), 25.0, .15)
add(pad([mtof(m) for m in (48, 60, 64, 67, 72)], 1.6, a=.02, rel=.4), 25.0, .35)
add(kick(1.4), 25.0)
for i, m in enumerate([72, 76, 79, 84, 88, 91]):
    add(tone(mtof(m), 1.4, d=.6, harm=(1, 2, 3)), 25.45 + i * .06, .1)
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

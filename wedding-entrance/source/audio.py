"""Cinematic score + AI voice for the wedding entrance (36.5s). Synthesized; voice from Kokoro TTS parts v1..v7.wav."""
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly
import wave, sys

SR = 48000; DUR = 36.5; N = int(SR*DUR); tt = np.arange(N)/SR
rng = np.random.default_rng(3)
T_MERGE, T_CUT, T_WAKE, T_DROP, BEAT, T_END = 17.0, 22.0, 26.0, 28.95, 60/128, 34.575

def mtof(m): return 440*2**((m-69)/12)
def Z(): return np.zeros((N,2))
def lp(x,f,o=2): return sosfilt(butter(o,f,'low',fs=SR,output='sos'),x,axis=0)
def hp(x,f,o=2): return sosfilt(butter(o,f,'high',fs=SR,output='sos'),x,axis=0)
def bp(x,a,b,o=2): return sosfilt(butter(o,[a,b],'band',fs=SR,output='sos'),x,axis=0)
def place(buf,sig,t,gain=1.0,pan=0.0):
    i=int(round(t*SR))
    if sig.ndim==1:
        l,r=np.cos((pan+1)*np.pi/4),np.sin((pan+1)*np.pi/4); sig=np.stack([sig*l,sig*r],1)*1.414
    s0=max(0,-i); i0=max(0,i); n=min(len(sig)-s0,N-i0)
    if n>0: buf[i0:i0+n]+=sig[s0:s0+n]*gain
def saw(f,n,ph=0.0):
    t=np.arange(n)/SR; out=np.zeros(n)
    for k in range(1,int(min(30,11000/max(f,1)))+1): out+=np.sin(2*np.pi*k*f*t+ph*k)/k
    return out*.63
def env(n,a,rel):
    e=np.ones(n); ai=max(1,int(a*SR)); ri=max(1,int(rel*SR))
    e[:ai]=np.linspace(0,1,ai); e[-ri:]*=np.linspace(1,0,ri); return e
def ir(sec,damp):
    n=int(sec*SR); t=np.arange(n)/SR
    x=lp(rng.standard_normal((n,2))*np.exp(-4*t/sec)[:,None],damp); x[:int(.02*SR)]=0
    return x/np.sqrt((x**2).sum(0,keepdims=True))
HALL=ir(4.5,4500); ROOM=ir(1.8,6000)
def verb(x,mix,I=HALL): return x+np.stack([fftconvolve(x[:,c],I[:,c])[:N] for c in range(2)],1)*mix

# ---------------- 1. opening drone 0–10, tension 10–17 ----------------
mus=Z()
def pad(notes,t0,t1,gain,cut,att=1.5,rel=1.0,det=.12):
    n=int((t1-t0)*SR); v=np.zeros((n,2))
    for m in notes:
        for d,pn in ((-det,-.8),(0,0),(det,.8)):
            s=saw(mtof(m+d),n,rng.uniform(0,6.28)); v[:,0]+=s*(1-pn)*.5; v[:,1]+=s*(1+pn)*.5
    v=lp(v,cut)*env(n,att,rel)[:,None]; place(mus,v,t0,gain)
# low drone D
n=int(17.2*SR); t=np.arange(n)/SR
drone=(np.sin(2*np.pi*36.7*t)+.6*np.sin(2*np.pi*73.4*t)+.25*saw(73.4,n))*np.minimum(t/4,1)
drone*=1+.15*np.sin(2*np.pi*.25*t)
place(mus,lp(drone,300),0,.18)
pad([50,57,62],0.3,10.5,.05,900,att=4)          # D5 dark
pad([50,57,62,65],10.0,17.0,.06,1600,att=2)      # Dm tension
pad([46,53,58,62],13.5,17.0,.05,2400,att=1.5)    # Bb rising
# shimmer
n=int(10*SR); t=np.arange(n)/SR; sh=np.zeros(n)
for f in (1174.7,1760,2349,2637): sh+=np.sin(2*np.pi*f*t+rng.uniform(0,6))*(.5+.5*np.sin(2*np.pi*(.3+rng.uniform(0,.4))*t))
place(mus,sh*np.minimum(t/5,1)*np.exp(-np.maximum(t-8,0)),1.0,.012,.3)
# "frequencies activated": rising arp 5.2–9.5
for i in range(34):
    tn=5.2+i*.125; m=[62,69,74,77,81][i%5]+(12 if i>20 else 0); k=int(.25*SR); tm=np.arange(k)/SR
    s=(np.sin(2*np.pi*mtof(m)*tm)+.3*np.sign(np.sin(2*np.pi*mtof(m)*tm)))*np.exp(-tm*14)
    place(mus,s,tn,.03*(.5+i/34),(-.6 if i%2 else .6))
# soft hit on "Attention"
k=int(1.6*SR); tm=np.arange(k)/SR
place(mus,np.sin(2*np.pi*np.cumsum(45+50*np.exp(-tm/.06))/SR)*np.exp(-tm/.5),3.45,.35)
# heartbeat 9.5–17 accelerating, then synced to the united heart (every .9s)
def lub(g=1.0):
    k=int(.35*SR); tm=np.arange(k)/SR
    return np.sin(2*np.pi*np.cumsum(42+38*np.exp(-tm/.03))/SR)*np.exp(-tm/.09)*g
hb=Z(); tb=9.5
while tb<T_MERGE-.15:
    p=(tb-9.5)/(T_MERGE-9.5); iv=lerp=.95-.5*p
    place(hb,lub(.6+.4*p),tb); place(hb,lub(.45+.3*p),tb+.16*iv/.9*.9*.9); tb+=iv
kb=T_MERGE
while kb<T_CUT-.05:
    place(hb,lub(.9),kb); place(hb,lub(.6),kb+.162); kb+=.9
mus+=lp(hb,180)*.9
# riser into merge
k=int(3.6*SR); x=np.linspace(0,1,k); nz=rng.standard_normal(k); rs=np.zeros(k)
for i in range(0,k,2048):
    c=300+6000*x[i]**2; rs[i:i+2048]=bp(nz[i:i+2048],c,min(c*2,20000))
place(mus,(rs+.3*np.sin(2*np.pi*np.cumsum(150+700*x**2)/SR))*x**2.5,T_MERGE-3.6,.22)

# ---------------- 2. merge impact + bloom 17–22 ----------------
k=int(4*SR); tm=np.arange(k)/SR
boom=np.tanh(1.8*np.sin(2*np.pi*np.cumsum(32+90*np.exp(-tm/.07))/SR)*np.exp(-tm/1.1))
crash=hp(rng.standard_normal(k),2500)*np.exp(-tm/1.3)*.4
place(mus,boom+crash,T_MERGE,.75)
pad([50,57,62,66,69,76],T_MERGE,19.6,.05,3500,att=.05,rel=.6,det=.15)   # D add9
pad([47,54,59,62,66,74],19.5,T_CUT,.05,3500,att=.4,rel=.05,det=.15)      # Bm
pad([43,50,55,59,62],20.8,T_CUT,.035,3000,att=.6,rel=.05)                 # G under
# bells on the names
for i,m in enumerate([74,78,81,86]):
    k=int(2.5*SR); tm=np.arange(k)/SR; f=mtof(m)
    place(mus,(np.sin(2*np.pi*f*tm)+.3*np.sin(2*np.pi*2.76*f*tm)*np.exp(-tm*4))*np.exp(-tm*1.6),18.0+i*.22,.05,(i-1.5)*.4)
mus=verb(mus,.35)
# HARD CUT to silence at 22.0
cut=int(T_CUT*SR); mus[cut:]=0; f=int(.02*SR); mus[cut-f:cut]*=np.linspace(1,0,f)[:,None]

# ---------------- 4. wake + drop ----------------
party=Z()
k=int((T_DROP-26.4)*SR); x=np.linspace(0,1,k); nz=rng.standard_normal(k); rs=np.zeros(k)
for i in range(0,k,2048):
    c=400+8000*x[i]**2; rs[i:i+2048]=bp(nz[i:i+2048],c,min(c*1.8,20000))
place(party,rs*x**2*1.0,26.4,.25)
def kick():
    k=int(.4*SR); tm=np.arange(k)/SR
    return np.tanh(1.6*np.sin(2*np.pi*np.cumsum(48+140*np.exp(-tm/.03))/SR)*np.exp(-tm/.16))
def clap():
    k=int(.3*SR); tm=np.arange(k)/SR; e=sum(np.exp(-np.clip(tm-o,0,None)/.008)*(tm>=o) for o in (0,.01,.02))+.5*np.exp(-np.clip(tm-.03,0,None)/.1)*(tm>=.03)
    return bp(rng.standard_normal(k)*e,900,5000)
def hat():
    k=int(.12*SR); tm=np.arange(k)/SR; return hp(rng.standard_normal(k),8000,4)*np.exp(-tm/.04)
K,C,Hh=kick(),clap(),hat()
# snare roll build 27.0 → drop
tr=27.0
while tr<T_DROP-.02:
    p=(tr-27)/(T_DROP-27); place(party,C,tr,.12+.35*p,rng.uniform(-.3,.3)); tr+=BEAT/(2 if p<.4 else 4 if p<.75 else 8)
sc=np.ones(N); kicks=[]
nb=int((T_END-T_DROP)/BEAT+.5)
for b in range(nb):
    t0=T_DROP+b*BEAT; place(party,K,t0,.9); kicks.append(t0)
    if b%2==1: place(party,C,t0,.4)
    place(party,Hh,t0+BEAT/2,.22,.2)
for kk in kicks:
    i=int(kk*SR); j=min(N,i+int(.3*SR)); seg=tt[i:j]-kk; sc[i:j]=np.minimum(sc[i:j],1-.7*np.exp(-seg/.1))
prog=[[59,62,66,71],[55,59,62,67],[62,66,69,74],[57,61,64,69]]   # Bm G D A
roots=[35,31,38,33]
syn=Z(); bass=Z()
for b in range(nb):
    t0=T_DROP+b*BEAT; ch=prog[(b//2)%4]; r=roots[(b//2)%4]
    n=int(BEAT*SR); v=np.zeros((n,2))
    for m in ch+[ch[0]+12]:
        for d,pn in ((-.12,-.9),(0,0),(.12,.9)):
            s=saw(mtof(m+d),n,rng.uniform(0,6)); v[:,0]+=s*(1-pn)*.5; v[:,1]+=s*(1+pn)*.5
    v*=env(n,.005,.05)[:,None]; place(syn,v,t0,.032)
    for off in (.5,):
        k=int(BEAT*.45*SR); s=saw(mtof(r+12),k)+.5*np.sin(2*np.pi*mtof(r)*np.arange(k)/SR)
        place(bass,s*env(k,.004,.03),t0+off*BEAT,.22)
syn=lp(syn,6500)*sc[:,None]; bass=lp(bass,700)*sc[:,None]
party+=syn+bass
# final hit
k=int(2.2*SR); tm=np.arange(k)/SR
place(party,np.tanh(1.6*np.sin(2*np.pi*np.cumsum(34+90*np.exp(-tm/.06))/SR)*np.exp(-tm/.8))+hp(rng.standard_normal(k),3000)*np.exp(-tm/1)*.35,T_END,.7)
n=int(2*SR); v=np.zeros((n,2))
for m in [50,57,62,66,69]:
    s=saw(mtof(m),n); v[:,0]+=s; v[:,1]+=s
place(party,lp(v,3000)*np.exp(-np.arange(n)/SR*1.6)[:,None],T_END,.03)
party=verb(party,.12,ROOM)
party[:int(26.3*SR)]=0
party*=np.interp(tt,[0,DUR-1.4,DUR],[1,1,0])[:,None]

# ---------------- voice ----------------
def load(name):
    x,sr=sf.read(name); x=resample_poly(x,SR,sr) if sr!=SR else x
    a=np.where(np.abs(x)>.01)[0]; x=x[max(0,a[0]-200):a[-1]+2400]
    return x/np.abs(x).max()
VO={'v1':1.6,'v2':3.5,'v3':5.25,'v4':13.3,'v5':15.75,'v6':26.05,'v7':27.98}
vo=Z()
for k,t0 in VO.items(): place(vo,load(f'{k}.wav'),t0,.5)
vo=hp(vo,90)
# subtle "AI" presence: short doubled slap + wide hall
dbl=np.zeros_like(vo); d=int(.012*SR); dbl[d:]=vo[:-d]; vo=vo+dbl[:,::-1]*.25
vo=verb(vo,.22)
lens={k:len(load(f'{k}.wav'))/SR for k in VO}
print({k:(t0,round(t0+lens[k],2)) for k,t0 in VO.items()})

# ducking music under the voice (opening/hearts only)
duck=np.ones(N)
for k,t0 in VO.items():
    a=int((t0-.1)*SR); b=int((t0+lens[k]+.2)*SR); duck[a:b]=np.minimum(duck[a:b],.6)
duck=np.convolve(duck,np.ones(2400)/2400,'same')
mix=mus*duck[:,None]+party*.62*np.maximum(duck,.8)[:,None]+vo
mix=hp(mix,25)
# ensure true silence in 22.0–26.0 (except nothing)
mix[int(T_CUT*SR):int(T_WAKE*SR)]=0
pk=np.abs(mix).max(); mix/=pk
mix=np.where(np.abs(mix)>.75,np.sign(mix)*(.75+.25*np.tanh((np.abs(mix)-.75)/.25)),mix)
mix*=.9/np.abs(mix).max()
with wave.open(sys.argv[1] if len(sys.argv)>1 else 'audio.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('ok')

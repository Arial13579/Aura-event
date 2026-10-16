# Output template

Fill this in for Stage 4. Replace everything in <angle brackets>.

````markdown
# <Product> — AI Video Ad Prompts

| Tool | Ratio | Length | Language | Visual style | Mood | Clips |
|------|-------|--------|----------|--------------|------|-------|
| <Veo> | <9:16> | <30s> | <Hinglish> | <Ultra-realistic> | <emotional> | <4> |

**Story in one line:** <...>

---

## 🔒 Consistency Lock
Paste these blocks exactly as written. Do not edit words between clips.

**CHARACTER — <Name>:**
<24-year-old Indian woman, wheatish skin, shoulder-length wavy black hair,
small gold nose stud, mustard-yellow cotton kurta with white chikan embroidery,
blue jeans, silver bangles on left wrist>

**PRODUCT — <Name>:**
<250 ml matte white glass bottle, rounded shoulders, green leaf-shaped cap,
front label "FreshLeaf" in dark green serif font, small leaf logo above text>

**STYLE:**
<Style Block starter from visual-styles.md, e.g. Photorealistic live-action
commercial footage, natural skin texture, subtle film grain…> + <Shot on 35mm, soft natural morning light from window, warm colour grade,
shallow depth of field, modern Indian apartment kitchen with light wood and
white tiles, photoreal, <9:16> vertical>

**NEGATIVE (if supported):**
distorted face, extra fingers, outfit change, different label text, blurry
product, flicker, text artifacts, watermark

---

## Step 0 — Reference images (do this first)
1. **Character sheet:** generate one image with this prompt, then save it.
   ```
   Character reference sheet, front view and 3/4 view, neutral background.
   <CHARACTER block>. <STYLE block>.
   ```
2. **Product shot:** upload your real product photo (best), or generate:
   ```
   Product photo, centered, clean background. <PRODUCT block>. <STYLE block>.
   ```
3. Use these images as the reference / start frame for every clip below.

---

## Step 1 — Clip 1 · 0–8s · Hook
**Reference:** character sheet · **Start frame:** new
```
<Close-up, handheld slight push-in.> <CHARACTER block>. <She yawns and looks
tired at a messy counter.> <STYLE block>.
Audio: <Riya says in Hinglish, frustrated: "Roz subah wahi thakaan…">
<soft ambient kitchen sounds.>
```
**Dialogue:** Riya — "Roz subah wahi thakaan…"
**Tip:** <save the last frame for Clip 2.>

## Step 2 — Clip 2 · 8–16s · Product reveal
**Reference:** character sheet + product shot · **Start frame:** last frame of Clip 1
```
...
```

<!-- repeat for each clip -->

---

## 🎙️ Voiceover / audio script
| Time | Speaker | Line (<language>) | Tone |
|------|---------|-------------------|------|

**Music:** <upbeat acoustic, 100 BPM, no vocals>

---

## ✂️ Editing guide
1. Import clips 1 → N in order.
2. Transitions: <hard cuts on the beat; match-cut on product>.
3. Text overlays: <"FreshLeaf" logo at 0:22, "Flat 20% off" at 0:26>.
4. End card (last 3s): logo, offer, CTA "<Order now — freshleaf.in>".
5. Captions on (most people watch muted).
6. Export: <1080×1920, 30fps, MP4 H.264>.

---

## 🛠️ If something looks off
- **Face changed:** regenerate with the character sheet as reference and a
  shorter action; keep the CHARACTER block word-for-word.
- **Product label wrong:** use your real product photo as start frame; add
  the logo in editing instead.
- **Colour/light jumps:** use the previous clip's last frame as start frame;
  colour-match clips in the editor.
- **Lip-sync off:** use voiceover instead, or a lip-sync tool on that clip.
````

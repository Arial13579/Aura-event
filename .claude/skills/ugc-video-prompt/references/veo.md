# Veo 3 / 3.1 — UGC prompt reference

Veo is the strongest default for UGC because it generates **native synchronized
audio and spoken dialogue** from the prompt — perfect for the spoken hooks UGC
relies on.

## Dialogue syntax (the important part)

Use the **colon form**, no quotes:

```
She says: Okay, I'm getting ready and I don't know if this outfit is crazy or—
```

**The quotes→captions trap:** writing `She says: "..."` with quotation marks tends
to make Veo burn **on-screen subtitles** into the video. UGC almost never wants
visible captions, so:

- Write dialogue **without quotes**, AND
- Add to the prompt (or negative prompt): **`no subtitles, no text, no captions`**

This is also why real UGC samples say "no text, no logos, no filters" — it
suppresses the caption artifact.

- Keep each spoken line short (≤ ~8s, under ~20 words) for clean lip-sync.
- SFX and ambience: describe explicitly — `faint water drip`, `soft tile echo`,
  `distant traffic hum`.
- Music control: `no music` / `Audio: only her voice + natural room tone, no music`.

## Audio mode caveat

Native audio is reliable in **text-to-video**. In image-to-video Veo generally
does **not** produce audio. So if you need both a reference image AND spoken
dialogue, prefer Veo 3.1 "Ingredients" (reference images while still T2V-style) or
plan accordingly.

## Asset reference

- **First frame**: pass an image as `image`.
- **First + last frame**: `image` + `lastFrame` (interpolates between).
- **Ingredients / reference images**: up to **3** images of a person/product to
  preserve appearance. These are **separate image inputs**, not in-prompt tokens.

In the prompt, keep `@avatar` / `@product` as semantic placeholders where the
person/product appears; the user uploads those into the image/ingredient slots.

## Prompt framework

Subject → Action → Style → Camera positioning → Composition → Focus/lens →
Ambiance. Camera motion goes inline as prose ("handheld", "POV", "tracking shot",
"selfie perspective"). For UGC selfie framing prefer a slight low angle (phone just
below the chin looking up) over a level "eye-level" shot — too-perfect eye level reads
staged. Add "portrait" to sharpen facial detail.

## Params

- Aspect ratio: **9:16** (native portrait supported).
- Duration: **4, 6, or 8s** (8s needed for 1080p/4k and reference-image jobs).
- Resolution: 720p / 1080p / 4k (4k = 3.1 only).
- Max prompt: ~1,024 tokens.
- Negative prompt: supported — use it for `no subtitles, no text, no captions` and
  unwanted objects.

## Mini template (script form)

```
Style: UGC, get ready with me, iPhone front camera, playful energy.

A stylish young creator (@avatar) films herself in her own slightly messy bedroom —
mirror, clothes thrown over a chair, a charging cable on the nightstand, soft natural
daylight from a window. Shot on iPhone front camera, vertical 9:16, handheld micro-shake,
real skin tones, natural skin texture (visible pores, no beauty smoothing), no color
grading, no ring light.

She walks into frame adjusting her top, looks into camera.
She says: Okay, I'm getting ready and I don't know if this outfit is crazy or—
A friend wanders in from the side; she reacts and pushes him out of frame.
She says: Hey— no, get out!
She turns back, laughing.
She says: Anyway… I kinda love it.
She steps back to show the full outfit and strikes a small confident pose.
She says: I'm wearing this.

Audio: only her voice + natural room tone, no music. no subtitles, no text, no captions.
Natural messy UGC vibe, confident energy, light humor.
```

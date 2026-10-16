# Hailuo (海螺 / MiniMax) — UGC prompt reference

## Big caveat: no native audio

Hailuo 01/02/2.3 generate **no synchronized audio and no spoken dialogue/lip-sync**.
Write the spoken lines in the prompt as **intent/acting direction** (so the mouth
moves and the performance reads right), but tell the user the dialogue must be
**dubbed separately** (e.g. MiniMax Audio/Speech or any TTS + lip-sync tool) and
synced in post. Don't promise spoken output.

## Prompt structure

Be specific about camera shot, action, environment. The **Director model
(T2V-01-Director)** takes **explicit camera commands in square brackets**:

`[Pan left]` `[Zoom in]` `[Push in]` `[Pull out]` `[Truck left/right]`
`[Pedestal up/down]` `[Tilt up/down]` `[Shake]` `[Tracking shot]` `[Static shot]`

- Up to **3 movements** per prompt; can be embedded mid-sentence
  (`An ancient artifact [Zoom out] starts to glow`) or chained (`[Shake], [Push in]`).
- `prompt_optimizer` (default true) rewrites/expands the prompt — keep yours clean
  and let it expand, or disable for tight control.

## Asset reference

- **Image-to-video (first frame)**: `image_url` (URL string).
- **Subject reference (S2V-01)**: character consistency from **a single clear
  reference image** (no multiple angles needed); text then controls posture,
  expression, lighting, camera. **Single subject only** currently.
- No in-prompt `@` token; brackets are for camera moves only. Keep `@avatar`/
  `@product` as placeholders mapping to the first-frame / S2V image.

## Params

- 9:16 supported.
- Duration short: e.g. Hailuo 2.3 i2v = **6 or 10s**, 768p. Longer needs stitching.

## Mini template (image-to-video, handheld UGC)

```
Handheld vertical selfie shot in her own lived-in bedroom, soft natural daylight from a
window, real skin tones, natural smartphone-lens look, subtle micro-shake, no
filters, no color grading. A young creator (@avatar) holds the product (@product)
up close to the camera and [Push in], turning it in her hand so its details catch the
light, then [Pull out] to show herself reacting with a delighted, slightly
surprised expression. A charging cable and a hoodie over a chair in the soft-focus background.
```
Note: she appears to speak ("I can't believe how good this is") but Hailuo outputs
no audio — dub and lip-sync the line in post. Feed a 9:16 first frame; `duration 6`.

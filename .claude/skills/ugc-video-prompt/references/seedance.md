# Seedance (即梦 / Doubao / Volcengine) — UGC prompt reference

**Version matters a lot.** Confirm which the user is on; if unknown, assume 2.0
(it does audio + multi-reference, which UGC wants).

| | Seedance 1.0 / 1.5 Pro | Seedance 2.0 |
|---|---|---|
| Audio/dialogue | **None** (video only) | **Native** audio + lip-synced dialogue |
| Asset reference | first/last frame image only | `@Image1`…`@Image9` numbered refs |
| Params | `--` suffix flags | structured fields |

## Prompt structure (both versions)

Natural-language, single direction to a cinematographer — **not** tags, **not**
timecodes (stacking shots causes shaky output; use one primary camera move).

- 2.0 formula: **Subject → Action → Environment → Camera → Style → Constraints**
- 1.0 formula: **[Subject + Action] + [Scene] + [Camera language] + [Style/Atmosphere]**
- Length: **60–100 words**. Lighting description has the biggest quality impact.
  The word "fast" most degrades quality — avoid it.
- No negative prompts in 1.0 — use a prose "avoid [X]" clause instead.

8 camera moves: push-in/dolly in, pull-out/dolly out, pan/lateral, tracking,
orbit/arc, aerial, handheld, fixed.

## Asset reference

**1.0 / 1.5** — no in-prompt tokens. Product/person goes in as the **first frame**
(`image_url`), optional **last frame** (`end_image_url`). The prompt is pure
description. Keep `@avatar`/`@product` as placeholders but tell the user they map
to the first-frame image, not a token.

**2.0** — real multi-reference. Pass images as `image_urls` (up to 9) and point at
them positionally in the prompt:
- English: `@Image1` … `@Image9`
- Chinese (native): `图片1` … `图片9` (identical effect)
- Also `@Video1`…`@Video3`, `@Audio1`…`@Audio3` for video/audio refs.
- Example: *"Reference @Image1 (the woman) holding @Image2 (the bottle), put it on
  a white desk."*

So for 2.0, replace `@product` → `@Image2` etc. once you know the upload order, or
leave semantic placeholders and note the mapping.

## Audio (2.0 only)

`generate_audio` (default true) produces music, SFX, ambience, AND lip-synced
dialogue in one pass. Dialogue is driven from the prompt text; lip-sync is
automatic for a described/referenced speaking subject. Feed reference voices via
`audio_urls` (≤3 clips, ≤15s) referenced as `@Audio1`.

## Params

**1.0/1.5** — `--` suffixes appended to the prompt string:
`--resolution 480p|720p|1080p`, `--ratio 9:16` (also 21:9/16:9/4:3/1:1/3:4/auto),
`--duration <2–12>` (default 5), `--camerafixed true|false`, `--seed <int>`.
Example tail: `... --resolution 1080p --ratio 9:16 --duration 5 --camerafixed false`

**2.0** — structured fields: `resolution` (480p/720p, default 720p), `duration`
(auto or 4–15, default auto), `aspect_ratio` (incl. 9:16), `seed`, `generate_audio`.
Camera control is prose, not a boolean.

## Mini template (2.0, product, with audio)

```
A young creator (@Image1) sits in her own lived-in bedroom with soft natural daylight
from a window, a charging cable and a mug on the desk. She picks up the sneaker
(@Image2) and holds it up to the phone, turning it in her hand and pausing when the
light catches the clear sole and the tiny charms inside. Handheld selfie framing,
slight low angle, vertical 9:16, real skin tones, natural smartphone look, no color
grading. She glances up to the lens, offhand: "There are toys in the sole. Actual tiny
toys." Avoid: cinematic grading, ring light, gift box, on-screen text.
```
Params: `aspect_ratio 9:16`, `duration 8`, `generate_audio true`.

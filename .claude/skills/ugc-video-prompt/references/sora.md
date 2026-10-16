# Sora 2 — UGC prompt reference

Sora 2 has **native synchronized audio + dialogue** and handles **multi-beat
sequences** well. It prefers a **labeled, sectioned** prompt rather than one prose
blob.

## Prompt template (official cookbook shape)

```
[Prose scene description — the UGC setting, subject, real-feel anchors.]

Cinematography:
Camera shot: [framing and angle — handheld selfie, vertical 9:16]
Mood: [playful / deadpan-cool / genuine]

Actions:
- [beat 1: one specific action]
- [beat 2: distinct action]
- [beat 3: closing pose / clip cuts]

Dialogue:
- @avatar: "Short natural line."
- @avatar: "Next line."

Background Sound:
[ambient — soft room tone, faint water, no music]
```

Guidance: each shot should have **one clear camera move and one clear subject
action**. Sparse prompts = more creative; dense = more consistent. Quotes in the
`Dialogue:` block are normal here (unlike Veo) — Sora maps labeled lines to the
right speaker/gestures.

## Asset reference

- **First frame**: `input_reference` image (must match the output `size`). It
  anchors frame one; the prompt defines what happens after.
- **Characters**: up to **2** via the Characters API (consent-gated cameos). The
  app uses an `@`-style cameo picker; the API uses character IDs.

Keep `@avatar` / `@product` as placeholders; the user wires them via
`input_reference` or character IDs.

## Params

- Aspect/size: 9:16 supported — `720x1280` (sora-2) or `1080x1920` (sora-2-pro).
  `size` is `{width}x{height}`.
- Duration `seconds`: "4", "8", "12", "16", "20"; extend up to 120s total.

## Mini template (try-on, multi-beat)

```
A 15-second vertical UGC try-on video filmed selfie-style on a smartphone in her own
real bedroom — a bit cluttered, clothes over a chair, natural daylight from a window,
slightly warm tones, handheld micro-shake, no ring light, no filters.

Cinematography:
Camera shot: handheld selfie, vertical 9:16, slight low angle (phone below the chin),
occasional quick jump cuts
Mood: effortlessly cool, confident

Actions:
- @avatar holds the outfit pieces (@product) on hangers up to camera, raises an eyebrow
- jump cut: she's wearing the top, adjusts the hem, turns side to side in the mirror
- jump cut: full look complete, she does a confident slow turn, hand on hip
- final: she faces camera, deadpan editorial pose, then a small satisfied smile, clip cuts

Dialogue:
- @avatar: "Okay, watch this."
- @avatar: "It's a little chaotic… but it works."

Background Sound:
Soft room tone, faint fabric rustle. No music.
```

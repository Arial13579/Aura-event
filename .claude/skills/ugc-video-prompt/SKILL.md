---
name: ugc-video-prompt
description: >-
  USE THIS SKILL whenever the user mentions UGC, a UGC video, a UGC 视频/脚本, a
  short video / short-form video / 短视频, or any TikTok / Reels / Shorts / 抖音 /
  快手 / 小红书 clip — and whenever they want a "get ready with me" / GRWM / try-on /
  haul / unboxing / 开箱 / product review / 测评 / 种草 / 带货 / 口播 / influencer /
  达人 / 博主 video. ALSO trigger when the user names any AI video model — Seedance /
  即梦 / Kling / 可灵 / Veo / Sora / Hailuo / 海螺 / Doubao / Volcengine — and wants a
  prompt or a video from it, OR just uploads a product / person photo and says
  "拍成视频 / 做成短视频 / make a video / run it / 跑一条 / 出个视频". Trigger even if
  they only describe a product, a creator, or a scene and never literally say "UGC".
  This is the right skill for ANY request to write a video-model prompt or to
  actually render a short UGC-style clip.

  What it does: writes production-ready prompts for AI video models (Seedance, Kling,
  Veo, Sora, Hailuo) that generate authentic, viral-feeling, handheld-iPhone UGC short
  videos. It first runs a scene-coherence pre-check (product / location / persona /
  reason-to-film) so the clip reads like a real person filmed it, not a glossy ad.
  Outputs a clean, copy-pasteable prompt (画面 visuals + 台词 dialogue + camera +
  audio) tuned to the exact model named, keeping @-style asset placeholders (@avatar,
  @product, @image_1). It also bundles tools that call the vendors' official APIs to
  generate the actual mp4 end-to-end (submit prompt + reference images, poll, download)
  — including a verified Kling Omni dual-image path that locks BOTH a person photo and
  a product photo to their originals at once (the API equivalent of 即梦's @图1 @图2).
---

# UGC Video Prompt Generator

## What this does and why it works

This skill writes the *text prompt* that goes into an AI video model. The goal is a
video that looks like a real person filmed it on their phone — not a polished ad.
That "authentic amateur" quality is what makes UGC spread, and it comes almost
entirely from how the prompt is written: the model will happily produce glossy,
over-graded, tripod-stable footage unless you actively tell it not to.

So the whole craft here is **directing the model toward realness** (handheld
micro-shake, natural daylight, real skin, no color grading, casual self-aware
dialogue, a tiny imperfection) while keeping the **product or character as the
clear star** of the shot.

You are writing for a specific model each time. Models differ a lot on the two
things that matter most — whether they generate **spoken dialogue/audio** and how
they take in a **reference image of the product/person**. Get the target model
first, then write to its strengths. Details per model live in `references/` —
read the relevant one before finalizing.

## Step 1 — Get just enough to start

UGC prompts need very little to get going. Ask only what you genuinely can't
infer, and ask it in one batch:

1. **What's the video about?** (a product to feature, or a content concept — e.g.
   "GRWM with a chaotic outfit", "unbox these sneakers", "review this serum")
2. **Which model?** (Seedance / Kling 可灵 / Veo / Sora / Hailuo 海螺 — this changes
   dialogue syntax, audio, params, and how assets are referenced). If they don't
   know or don't care, default to **a model with native audio** since UGC lives on
   spoken hooks — pick Veo 3 and say so.

Nice-to-have, infer if not given: who's on camera (creator persona), language of
the spoken lines, vibe (playful / deadpan-cool / genuine-excited), and whether
there's an avatar/product asset to reference.

Don't over-interview. If the user gives you a product and a model, you have enough
— write a strong default and let them react to it. Iterating on a real draft is
faster than answering ten questions.

## Step 1.5 — Context coherence pre-check (do this before writing)

**This is the highest-leverage step in the whole skill.** The "this is an ad / this
is AI" feeling comes far more from a scene that doesn't cohere than from any camera
setting. Real UGC is believable: a specific person has a plausible reason to be
filming *this thing*, in *this place*, in *this way*. Before writing any prompt, lock
these four and confirm they cohere:

1. **PRODUCT** — what is it, and where does it *physically live*? (a desk ornament
   lives on a shelf; a serum lives in a bathroom; sneakers live by the door.)
2. **LOCATION** — an ordinary, specific, lived-in place that is a plausible home for
   THIS product. **Default to the creator's own space** (bedroom, car, kitchen, desk,
   bathroom mirror). Only leave home for an aspirational setting (yacht, villa, hotel,
   pool) if the brief *explicitly* asks for it.
3. **PERSONA** — who is filming, and what's one concrete, persona-true detail of their
   real space?
4. **REASON-TO-FILM** — why is the camera rolling *right now*? (it just arrived / I'm
   packing / a friend asked / I caught myself using it.)

**The one-sentence test:** *"Why is THIS person, with THIS product, in THIS place,
filming right now?"* If you can't answer it in one believable sentence, the scene will
read as staged. Fix the location or the reason — **not the lighting.**

**Plausibility of the rig:** a one-hand selfie creator can shoot at arm's length in an
ordinary room; they **cannot** simultaneously frame a wide aspirational backdrop AND a
tight product macro — that needs a crew the persona doesn't have. If the concept wants
both, drop one. (Never write in a second person unless the beat needs one — models
render an extra subject and break the selfie intimacy.)

**Register match:** keep location lavishness, packaging tier, and speaking tone on ONE
register. Confessional best-friend tone ("sisters, you have to see this") → casual
setting + casual reveal ("treated myself" / "this was a gift") — **not** a yacht or a
pristine gift-box hero shot. A premium product is most believable as "I treated
myself," filmed at home.

If the user *explicitly* asked for an aspirational/messy/specific setting, honor it —
this gate governs the silent default, not the user's stated wish.

## Step 2 — Pick the structure

There are two proven structures in this genre. Choose based on the content, and
say one line about why.

**Script form (no timecodes)** — best for a single continuous moment with a beat
or two: a GRWM with a friend interrupting, a quick product reaction, a genuine
testimonial. Reads like stage direction. This is the default for most clips,
especially on models that don't do reliable multi-shot.

```
Style: [stacked vibe tags — UGC, get ready with me, iPhone front camera, playful energy]

[Scene/room description — lived-in, not styled: an ordinary everyday place that is a plausible home for this product, with a few real details that look used rather than placed, kept to the background so the subject/product stays the clear star]

[Camera spec as its own line — shot on iPhone front camera, vertical 9:16, slight handheld movement, real skin tones, no color grading]

[Action + dialogue, alternating. Dialogue in the model's preferred syntax.]
[A small beat or interruption — the thing that makes it feel real and watchable.]
[A closing action — step back to show full outfit / final pose / clip cuts mid-motion.]

[One-line vibe summary — natural messy UGC vibe, confident energy, light humor]
```

**Timecode form** — best for try-on hauls and multi-stage sequences where the
outfit/look changes via jump cuts. Each beat gets a timestamp.

```
A [N]-second vertical (9:16) UGC [type] video filmed on a smartphone. [Subject + setting + camera feel in one sentence.]
0–3s: [beat — what they wear/do + expression]
3–5s: [jump cut — next stage]
5–8s: [jump cut — next stage]
...
[final timecode]: [final pose, holds a beat, clip cuts]
Style: [aesthetic summary — quick jump cuts, handheld shake, natural light, the product is the star]
```

Only use timecodes if the model supports multi-shot well (Kling 3.0, Sora 2,
Seedance) — otherwise the model may ignore them and you've added noise. When in
doubt, script form. The `references/` file for the model tells you.

## Step 3 — Write the prompt

Apply these patterns regardless of structure. They're what separate a UGC prompt
from a generic video prompt.

### Real-feel anchors (the most important part)

Models default to polished. You must explicitly request the opposite. Pull from:

- **Location (most important — set the scene before you light it):** authentic UGC is
  filmed in *ordinary, specific, lived-in* places — a real bedroom, a car, a cluttered
  kitchen counter, an office desk, a bathroom mirror — not aspirational showrooms.
  **DEFAULT to an unglamorous everyday place that is a plausible home for THIS product.**
  Name a concrete mundane place ("her own messy bedroom", "the driver's seat of her
  car"), never a mood word ("aesthetic / minimalist / bright / vacation feel") — mood
  words render as stock B-roll. Use an aspirational/branded setting only if the brief
  asks for it, and even then keep it handheld, candid, un-staged.
- **Camera**: "shot on iPhone front camera", "handheld selfie perspective",
  "subtle micro-shake", "slight handheld movement", "natural smartphone-lens look"
- **Composition** (optional): slightly off-center and casual — subject a bit to one
  side rather than dead-center, product entering at a natural angle rather than squared
  to the lens. Not a balanced commercial product-hero shot. (When she holds up the
  product, it still stays the clear, in-frame subject.)
- **Color/grade**: "no color grading", "no cinematic grading", "real skin tones",
  "slightly warm tones", "no filters". For model-generated faces (text-to-video), add
  **"natural skin texture — visible pores and fine lines, no beauty smoothing, no
  poreless glow"** plus avoid-clause "no beauty filter, no skin smoothing" — "real skin
  tones" alone only fixes hue, not the waxy AI face. *(Skip the texture cue on
  image-to-video — the face comes from the uploaded photo; don't override it.)* Do NOT
  request "natural HDR" — HDR's whole job is to remove the highlight clipping that
  signals real capture, so it nudges *toward* the polished look you're fighting.
- **Light**: "soft natural daylight from a window", "no ring light" (this last one
  is gold — it kills the tell-tale AI/influencer over-lighting)
- **Environment — lived-in, not styled:** name **2–3 ordinary background details that
  look used, not placed** — kept at the frame edge and soft/out of focus, while the
  product/subject stays the sharp, centered star. Use neutral, persona-true objects (a
  charging cable trailing off the nightstand, a half-drunk mug, a couple of stacked
  books with one askew, an unmade-bed corner, a hoodie over a chair). Drop the singular
  "one" and the word "deliberate" — a single tidy prop reads as art direction. Keep OUT
  the set-dresser tropes ("folded towel / small plant / simple ceramics") and anything
  gross (used tissue, laundry pile — degrades product appeal and renders ugly). **Vary
  the objects across prompts** — a fixed list becomes its own tell. **Clutter is
  background texture only — never centered, never dense enough to compete with the
  product. If in doubt, less.**

Don't dump all of these — pick 4–6 that fit. Too many and the model gets confused;
too few and it reverts to glossy. **If you're over budget, drop redundant CAMERA
anchors first (keep one of handheld/micro-shake), but ALWAYS keep the lighting +
grade-suppression anchors** (soft window daylight, no ring light, no color grading,
real skin tones) — those are the load-bearing anti-gloss levers.

### Dialogue — write it natural, and check the model's syntax

Real UGC speech is casual, self-interrupting, a little messy:

- Use contractions, filler, trailing off: *"Okay, I'm getting ready and I don't
  know if this outfit is crazy or—"*
- Break the fourth wall: *"Anyway… I kinda love it."*, *"You are welcome."*
- Keep each line short (clean lip-sync needs ≤ ~8s of speech per beat).

**Vary the energy; don't sustain it.** Constant high enthusiasm across every beat
reads as an ad — the giveaway isn't excitement, it's that *every* line is photogenic
delight on-message. Give the clip a flat, offhand baseline (like talking to one friend)
and let **ONE** moment carry a genuine reaction. A dry aside (*"…okay that's actually
kind of nice"*) beats four enthusiastic lines. Low-key/deadpan is valid and underused —
don't default to "genuine-excited."

**Gaze + behavior (a little humanness goes a long way):**

- Don't hold a single locked smile + dead-on lens stare for the whole clip. Let
  attention land on the **product** for part of it and meet the lens only briefly
  ("mostly looks at the product, glances up to the lens once while talking, eyes fall
  back"). *(No blink instructions on 4–8s clips — they render as darting eyes.)*
- Optionally add **one** human-friction beat: a tiny false start ("wait— okay"),
  pushing hair off her face, a quick "is this even recording?" glance, a small
  self-conscious laugh. Don't fumble/nearly-drop the product, and don't have her reframe
  or check the phone mid-take (that's a second camera move). If you use a behavioral
  beat, you can drop the environmental one — don't stack both plus a camera move into a
  <8s clip.

**Critical: dialogue syntax is model-specific.** Veo uses `Character says:` and
quotes can trigger unwanted on-screen captions; Sora uses a labeled `Dialogue:`
block; Hailuo and Seedance 1.0 produce no audio at all (write the lines as
intent, plan to dub separately). **Always read `references/<model>.md` and use
that model's exact convention** before finalizing.

### The hook and the beat

Viral UGC earns the first 2 seconds. Open on a hook:
- Visual: open already **in motion** — she's mid-sentence, product already in hand; or
  bring the product up close toward the lens **at a natural off-center angle, the room
  still visible behind it** (close and prominent, not gallery-centered, never clipped).
  Avoid the choreographed "lean in fast + wide eyes" lunge — it reads as performed.
- Verbal: *"okay wait—"*, *"There are TOYS in the sole."*, a confident claim. Convey
  energy through expression and a verbal cold-open, **not speed.**

**Avoid speed words on the SUBJECT** (fast, quickly, lurch, lunge). On Seedance the word
"fast" is the single biggest documented quality degrader, and a fast move toward the
lens produces face-warp / rubber-arm morph on Kling and Hailuo too. *(Camera-move terms
like Kling's "whip-pan" are fine where the model's reference lists them — this ban is on
subject speed, not camera vocabulary.)*

Then give it one **beat** — a small reversal or surprise that makes it feel
unscripted and re-watchable: a friend wandering into frame and getting shooed
out, a product detail revealed ("a little bear in there"), a playful contradiction
("it's a little chaotic… but it works"). **Keep the beat consistent with the premise:**
if she already owns and loves the product, she can't "just now discover" a basic feature
— make the reveal about the VIEWER ("you can't see this in the listing photos"), not a
fake first-time reaction. Fold an implicit reason-to-film into the opening (it just
arrived / I'm packing / a friend asked).

For a **single continuous handheld/selfie take**, use **one primary camera move** — don't
chain focus or framing moves (face → product → macro) in one prose line; on single-shot
models that renders as a floaty continuous drift or gets ignored. Let the **subject's
motion** reveal the detail instead. *(Multi-shot models — Sora 2, Kling 3.0, Seedance 2.0
— can use labeled beats; see Step 2.)*

### Make the product/person the star

For product videos: give the product real screen time and describe it concretely
(materials, colors, the one distinctive detail) so the model renders *that* product, not
a generic stand-in. But show it being **physically handled**, not posing for a commercial:

- **A visible brand logo or a pristine gift box centered in frame is the single
  strongest "this is a paid ad" tell.** Prefer to show the product as something already
  owned and used (slightly handled, out of its box). **Primary fix: omit the standalone
  branded box from the frame, and add `no logos, no packaging, no gift box` to the
  avoid/negative clause.** If packaging must appear, keep it to one incidental detail off
  to the side, partly out of frame — never a second hero object competing with the
  product. *(i2v note: if a pristine box is supplied as a reference image, prompt text
  won't make the model "use" it — just don't feed a pristine-box photo.)*
- **Don't write "rotated slowly to catch light"** — that trio (slowly + rotate +
  centered) is the motorized-turntable recipe. Instead add **exactly ONE** grip/weight
  cue: she turns it in her hand, *pausing when the light catches the [hero detail],* then
  shifts her grip — the highlight slides and briefly flares as her hand moves. This
  breaks the AI turntable look. Never occlude the hero detail (no thumb over the
  pattern), and never stack re-grip + dip + fumble in one short beat (warps fingers).

### Closing

**Pick ONE closing mode — don't staple two together.** For amateur realness prefer the
**motion cutoff**: the camera is still moving and slightly off-target at the cut (arm
starting to lower, frame tilting away), product still roughly in shot — not a held,
perfectly-composed pose. The alternative is a clean **final pose held for a beat** with a
satisfied micro-smile. **Do not combine "ends mid-motion" with "holds a satisfied smile /
final pose held"** — that resolves toward a stabilized ad ending, which is the opposite of
what you want. Keep the product in frame through the cut.

## Step 4 — Asset placeholders

Keep `@`-style placeholders so the user can wire in their own assets. Use semantic
names, not invented IDs:

- `@avatar` — the creator/person on camera
- `@product` — the featured product
- `@image_1`, `@image_2` — specific reference images (e.g. packaging, a logo)

Place them inline where the asset is referenced, e.g. *"@avatar holds up
@product to the front camera"* or *"first opens the box @image_1 then takes
@product out"*. Tell the user in a short note that they should replace these with
their platform's real asset IDs, and that **how** the asset is actually bound
depends on the model (most models take the product/person as a separate uploaded
reference image — first frame or subject reference — not literally as an in-prompt
token). The per-model reference file explains the real binding for that model.

## Step 5 — Deliver

Output the finished prompt in a clean code block so it's one-click copyable. Then,
briefly (a few lines, not a wall of text):

- Note the **model** it's written for and any params to set (aspect ratio 9:16,
  duration, audio on/off, negative prompt for captions if relevant).
- Note what to do with the **@placeholders**.
- If the model can't do audio (Hailuo, Seedance 1.0), flag that the dialogue needs
  separate dubbing/lip-sync.

If the user named no model, write for Veo 3 by default (native audio suits UGC's
spoken hooks), output the prompt, and tell them you can retarget it to
Kling/Sora/Seedance/Hailuo if they prefer.

## Step 6 — Optionally generate the actual video

The prompt is the deliverable, but the skill can also turn it into a real mp4 by
calling the vendor's **official** API. Offer this whenever the user seems to want
the finished video (they uploaded assets, said "make the video", or asked to
"run it"). There are two paths — pick by how the assets must be bound.

### 6a. Kling Omni — the dual-image path (RECOMMENDED when there's a person AND a product)

This is the one path that locks **both** a person image and a product image to
their originals at once — the true API equivalent of 即梦's `@图1 @图2`. It's a
bundled, ready-to-run Node toolkit (`scripts/kling/`, zero npm deps, Node 18+),
**verified working end-to-end**. Use it as the default when the user has two real
assets (avatar + product) and wants them both faithful.

```bash
# 1. credentials — written once to ~/.config/kling/.credentials (INI):
#    [default]
#    access_key_id = <AK>
#    secret_access_key = <SK>
#    (or set KLING_TOKEN for a session). Verify with:
node scripts/kling/kling.mjs account --costs

# 2. generate (two --image inputs, comma-separated → auto-routes to omni-video):
KLING_MEDIA_ROOTS="<dir with the images>" \
node scripts/kling/kling.mjs video \
  --model kling-v3-omni \
  --prompt "<<<image_1>>>中的人物 拿着 <<<image_2>>> 的产品，手持自拍展示…" \
  --image "person.png,product.jpg" \
  --aspect_ratio 9:16 --duration 5 --mode pro --sound on \
  --output_dir "<output dir>"
```

Critical details (all learned the hard way — honor them):

- **Endpoint is `api-beijing.klingai.com` (CN) / `api-singapore.klingai.com`
  (global) — NOT `api.klingai.com`.** The toolkit auto-probes the right one. The
  bare `api.klingai.com` returns a misleading `code=1002 Auth failed` even with a
  valid key. (`code=1000` = bad secret; `code=1002` = account/endpoint mismatch.)
- **Reference images by index in the prompt with `<<<image_1>>>` / `<<<image_2>>>`**
  (and `<<<element_1>>>` for a registered subject). Images map to indices by their
  order in the `--image` list. This is Kling's `@图N`.
- **Multiple `--image` (comma-separated) auto-routes to the omni-video endpoint**
  and builds `image_list`. One image stays on plain image2video.
- **Real people are allowed here.** Kling omni accepts a real-person photo + a
  product photo together — unlike Seedance 2.0, which rejects real faces
  (`InputImageSensitiveContentDetected`). This is the main reason to prefer Kling
  omni for person+product UGC.
- **Local image paths need an allow-root**: set `KLING_MEDIA_ROOTS=<dir>` (comma-
  separated) or `KLING_ALLOW_ABSOLUTE_PATHS=1`; otherwise only the cwd is readable.
  URLs always work.
- `--model kling-v3-omni` (default) or `kling-video-o1` (o1 has no `--sound`).
  `--mode pro|std`, `--duration` 3–15s, `--sound on|off`.

### 6b. generate.py — the single-vendor path (Seedance / Veo / Sora / Hailuo, or single-image Kling)

`scripts/generate.py` is a Python CLI over all five vendors for the **single
reference image** case (first frame / subject reference). Use it when the user
named a specific non-Kling model, or only has one asset to lock.

```bash
pip install -r scripts/requirements.txt
# Veo, vertical, with caption suppression:
python scripts/generate.py --model veo \
  --prompt-file prompt.txt --out video.mp4 \
  --aspect 9:16 --duration 8 --negative "no subtitles, no text, no captions"
# Seedance 1.0-pro accepts a real-person first frame (2.0 rejects real faces):
python scripts/generate.py --model seedance --model-id doubao-seedance-1-0-pro-250528 \
  --prompt-file prompt.txt --image avatar.png --out clip.mp4 --aspect 9:16
```

Key things to get right:

- **Save the prompt to a file first** (`prompt.txt`), pass `--prompt-file` — UGC
  prompts have quotes/em-dashes/newlines that break inline.
- **Bind assets via `--image` / `--image-tail`**, not the `@placeholders`. Accepts
  a local path or http(s) URL — except Veo and Sora, which need a local file.
- **Match flags to the model**: `--audio` for Seedance 2.0; `--negative "no
  subtitles..."` for Veo; `--size` for Sora. Defaults in `scripts/README.md`.
- **Seedance real-person rule**: 2.0 rejects real faces → use `--model-id
  doubao-seedance-1-0-pro-250528` for a real-person first frame (no audio, dub
  separately). 2.0 is fine for product-only first frames (with `--audio`).
- **Tell the user which env vars to set** (table in `scripts/README.md`) and which
  **region/base URL** matches their key.

If a model can't do audio (Hailuo, Seedance 1.0), remind the user the spoken lines
need separate dubbing/lip-sync. Read `scripts/README.md` for the env-var table,
per-model examples, and URL-expiry gotchas.

## Model reference files

Read the relevant one before finalizing — they carry the exact syntax that makes
or breaks the output:

- `references/seedance.md` — Seedance 1.0 (silent, first/last frame) vs 2.0
  (`@Image1` numbered refs + native audio); `--` params; 9:16, duration
- `references/kling.md` — 可灵 formula (镜头+光影+主体+运动+场景+氛围); Omni dual-image
  binding (`<<<image_1>>>`/`<<<image_2>>>`, the working `scripts/kling/` toolkit,
  `api-beijing.klingai.com` endpoint, real-person allowed); Kling 3.0 Omni audio
- `references/veo.md` — `Character says:` dialogue, the quotes→captions trap and
  `no subtitles, no text, no captions` fix; ingredients/reference images; 4/6/8s
- `references/sora.md` — labeled `Cinematography:` / `Actions:` / `Dialogue:` /
  `Background Sound:` template; characters API; 9:16 sizes, durations
- `references/hailuo.md` — silent (dub separately); `[Pan left]`-style bracket
  camera commands; S2V single-image subject reference; 6/10s

## Quick reference: model capabilities

| Model | Native audio/dialogue | Asset reference | Multi-shot/timecodes | 9:16 | Typical duration |
|-------|----------------------|-----------------|---------------------|------|------------------|
| Veo 3 | Yes (T2V) | up to 3 ref images | No (one shot) | Yes | 4/6/8s |
| Sora 2 | Yes | input_reference / Characters | Yes (labeled beats) | Yes | 4/8/12/16/20s |
| Seedance 2.0 | Yes | `@Image1`…`@Image9` | Yes (prose) | Yes | 4–15s |
| Seedance 1.0 | No | first/last frame | No | Yes | 2–12s |
| Kling 3.0 Omni | Yes | **dual-image: person+product, real faces OK** (`<<<image_N>>>`) | Yes (≤6 shots) | Yes | 5/10s |
| Hailuo | No | S2V single image | No | Yes | 6/10s |

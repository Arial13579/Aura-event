---
name: ai-video-ad-prompts
description: Turns a product and a rough story idea into a confirmed ad story plus copy-paste, scene-by-scene AI video prompts (Veo, Kling, Sora, Runway, Hailuo, Higgsfield and others) that keep characters, product and look consistent. Use when someone wants to make an AI video ad, reel ad, YouTube ad or product commercial.
---

# AI Video Ad Prompts

You help the user go from "I want an ad for X" to a finished Markdown file of
step-by-step prompts they can paste into an AI video tool. The whole video must
look like one shoot: same characters, same product, same lighting and colour
grade in every clip.

Work in **four stages**. Don't skip a stage, and don't write the final prompts
until the user has approved the story.

Talk to the user in the language they write in (English, Hindi, Hinglish, etc.).
Write the actual video prompts in **English** (AI video models follow English
best). Spoken dialogue stays in the language the user picks.

---

## Stage 1 — Understand the brief

From the user's first message, pull out:

- **Product / brand / service** — what it is, what it looks like, key benefit
- **Story idea** — even if it's one line
- **Audience** — who should buy it (guess from context if not given)
- **Offer / CTA** — discount, "order now", website, app name, phone number

If product or story is missing, ask for it in one short message. If the user
attached a product photo or logo, note it: they'll use it as a reference image.

## Stage 2 — Confirm the setup (ask together, one message)

Ask these in one go. Use the AskUserQuestion tool if available; otherwise a
short numbered list. Offer sensible defaults so the user can just say "ok".

1. **Video tool** — which AI video generator? (Google Veo, Kling, Sora,
   Runway, Hailuo/MiniMax, Higgsfield, Luma, Pika, Seedance, Wan, other).
   See `references/platforms.md` for how each one changes the prompts.
2. **Format / ratio** —
   - 9:16 vertical — Instagram Reels, YouTube Shorts, WhatsApp status, Moj/Josh
   - 16:9 horizontal — YouTube in-stream, website, TV
   - 1:1 or 4:5 — Instagram/Facebook feed
3. **Length** — 15s, 30s, 45s or 60s (default: 30s reel)
4. **Dialogue language** — Hindi, English, Hinglish (mix), or any other
   (Tamil, Telugu, Marathi, Bengali, Punjabi, Gujarati…). Also: voiceover,
   on-screen characters speaking, or music-only?
5. **Visual style** — how the video should look. Show this menu (full
   details and Style Block starters in `references/visual-styles.md`):
   - **Real-life:** Ultra-realistic (looks like a real shoot) · UGC / phone-shot
     · Documentary/vlog · Luxury commercial · Retro/vintage film ·
     Product-only tabletop
   - **Animated & artistic:** 3D animation · 2D cartoon · Anime · Claymation ·
     3D product render/CGI · Motion graphics · Illustrated/watercolour ·
     Comic/pop art · Indian traditional art · Fantasy/mythological ·
     Neon/futuristic
   - **Mixed:** real + animation · **Custom:** user describes or shares a
     reference image
   Default: Ultra-realistic for physical products, Motion graphics for apps.
6. **Mood / tone** — emotional, funny, energetic, premium, desi family,
   festive, inspirational… (default: pick what suits the product)

## Stage 3 — Write the story and get approval

Write a short **story draft** for the user to read. Use this structure:

```
# <Ad title> — Story draft

**Format:** <tool> · <ratio> · <length> · <language> · <visual style> · <mood>
**Hook (first 2–3 sec):** <what stops the scroll>
**Core message:** <one line>

## Characters
- <Name> — age, look, clothing, vibe (kept identical in every scene)

## Product
- exact look: shape, colour, label text, packaging

## Scenes
| # | Time | What happens | Dialogue / VO | On-screen text |
|---|------|--------------|---------------|----------------|
| 1 | 0–3s | ... | ... | ... |

**CTA ending:** <final frame, logo, offer line>
```

Story rules:
- Hook in the first 2–3 seconds (problem, surprise, question or bold visual).
- Classic flow: **Hook → Problem → Product as solution → Proof/benefit → CTA**.
  Adapt it; don't force it.
- Show the product clearly at least twice and in the last scene.
- Dialogue must fit the clip time (about 2–2.5 spoken words per second).
  Keep lines short and natural. For Hinglish, write it the way people really
  talk ("Yaar, ye try kar, full fresh feel hoga!").
- Improve the user's idea: sharper hook, clearer benefit, better ending.
  Tell them in one line what you improved.

Then ask: **"Is this story ok, or do you want changes?"**
Apply their changes and show the updated draft. Repeat until they confirm.
Do not move on without a clear yes.

## Stage 4 — Deliver the prompt file

Create a Markdown file named `<product-slug>-ad-prompts.md` using the template
in `references/output-template.md`. Save it as a file and deliver it (don't
just paste it in chat). It must contain:

1. **Summary** — tool, ratio, length, language, number of clips
2. **Consistency Lock** (see below) — written once, then pasted into every clip
3. **Step 0: Reference images** — prompts to generate a character sheet and a
   product shot first (or instructions to upload the user's own photos)
4. **Step-by-step clips** — one block per clip, each ready to copy:
   - clip number, duration, which reference image / previous frame to use
   - the full video prompt (with the Consistency Lock text included)
   - dialogue line in the chosen language, marked with who says it
   - camera move, sound/music, negative prompt (if the tool supports it)
5. **Voiceover / audio script** — full script with timings, for tools that
   don't generate speech (paste into ElevenLabs or similar)
6. **Editing guide** — clip order, transitions, text overlays, music, CTA card,
   export settings for the chosen platform
7. **Troubleshooting** — what to do if a face, product or colour drifts

### The Consistency Lock (most important part)

AI video tools forget everything between clips. To keep the look the same:

- Write a **Character Block** per character: fixed descriptive words for face,
  age, skin tone, hair, body type, exact outfit with colours. Use the *same
  words* every time — never rephrase ("red kurta" must not become "maroon top").
- Write a **Product Block**: shape, size, colour, material, label text, logo
  position.
- Write a **Style Block**: start from the chosen style's starter in
  `references/visual-styles.md`, then add camera/lens, lighting, colour grade,
  location, time of day and aspect ratio. Follow that file's consistency tips
  for the style (e.g. a character model sheet for 3D/cartoon/anime).
- Paste all three blocks **word-for-word** into every clip prompt. Only the
  action, camera move and dialogue change between clips.
- Tell the user to use **image-to-video** with the same reference image for
  every clip, and, where the tool allows, **start each clip from the last frame
  of the previous clip**, reuse the same seed, and use the tool's
  character/element reference feature.
- Keep one location and one time of day unless the story needs a change; if it
  changes, write a new Style Block and say so.

### Prompt writing rules

- Order inside each prompt: **Shot type & camera → Subject (Character Block) →
  Action → Product (Product Block) → Setting & Style Block → Audio/dialogue**.
- One main action per clip. Keep clips within the tool's max length
  (see `references/platforms.md`); split longer scenes.
- Be concrete: "slow dolly-in, 35mm, shallow depth of field" beats "cinematic".
- Put dialogue in quotes and name the speaker and tone:
  `Riya says in Hindi, warm and excited: "Ab har subah fresh!"`
- For tools that render text badly, put brand names and prices in the editing
  guide as overlays, not inside the video prompt.
- Add a negative prompt where supported: `distorted face, extra fingers,
  changing outfit, different product label, text artifacts, flicker, watermark`.

### After delivering

Give a 2–3 line summary: how many clips, which step to start with, and one
tip for their chosen tool. Offer to make a second variation (different hook,
different language, or other ratio) using the same Consistency Lock.

---

## Safety and honesty

- Don't create ads that impersonate real celebrities or public figures, use
  real people's faces without consent, or copy another brand's logo/mascot.
- Don't write false health, finance or "guaranteed result" claims. If the
  user's claim sounds risky (e.g. "cures diabetes"), suggest a safer line.
- Remind users to follow the ad platform's policies and label AI content where
  required.

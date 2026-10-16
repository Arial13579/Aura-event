# 🎬 AI Video Ad Prompts: a Claude skill

An open-source [Claude skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
that turns a product and a rough story idea into **copy-paste, scene-by-scene
prompts** for AI video tools like Google Veo, Kling, Sora, Runway, Hailuo,
Higgsfield and Luma, while keeping the **characters, product and look the
same** in every clip.

Made for creators, D2C brands and small businesses, with first-class support
for **Hindi, Hinglish and Indian languages**.

## How it works

```
You: "Ad for my product + rough story"
        │
        ▼
1. Claude asks: which tool? Reel (9:16) or YouTube (16:9)? Length?
   Dialogue language (Hindi / English / Hinglish / other)?
   Visual style (ultra-realistic, UGC, 3D, cartoon, anime, claymation…)? Mood?
        │
        ▼
2. Claude writes the story (hook → problem → product → benefit → CTA)
   You read it, ask for changes, and confirm
        │
        ▼
3. Claude delivers a .md file:
   🔒 Consistency Lock (character + product + style blocks)
   Step 0: reference images
   Step 1…N: one ready-to-paste prompt per clip, with dialogue
   🎙️ Voiceover script · ✂️ Editing guide · 🛠️ Fixes
```

## 19 visual styles

|Real-life|Animated \& artistic|
|-|-|
|Ultra-realistic (looks like a real shoot)|3D animation|
|UGC / phone-shot|2D cartoon|
|Documentary / vlog|Anime|
|Luxury commercial|Claymation / stop-motion|
|Retro / vintage film|3D product render / CGI|
|Product-only tabletop|Motion graphics|
||Illustrated / watercolour|
||Comic / pop art|
||Indian traditional art|
||Fantasy / mythological|
||Neon / futuristic|

Plus **Mixed** (real + animation) and **Custom** (describe it or share a
reference image). Each style has a ready-made Style Block and its own
consistency tips in `references/visual-styles.md`.

## Why the video doesn't "change look"

AI video tools forget everything between clips. This skill fixes that by:

* writing **fixed description blocks** for each character, the product and the
visual style, then pasting them **word-for-word** into every clip
* starting with **reference images** (character sheet + product shot) and using
image-to-video for every clip
* chaining clips (**last frame → next start frame**) where the tool allows
* keeping brand text and prices as **editing overlays**, since AI tools often
garble text

## Install

**Claude apps (claude.ai / desktop / Cowork):** zip this folder and upload it
in *Settings → Capabilities → Skills*. (Menu names can vary by version.)

**Claude Code:**

```bash
git clone https://github.com/theakasharma/ai-video-ad-prompts.git \~/.claude/skills/ai-video-ad-prompts
```

**Claude API / Agent SDK:** upload the folder as a custom skill (see the
Anthropic skills docs).

## Use it

Just ask, in any language:

> "Mere organic honey brand ka ad banao. Story: ek bachcha dadi ke saath subah honey-lemon peeta hai aur school mein energetic rehta hai."

> "Make a 30s YouTube ad for my fitness app, funny tone."

## Files

```
ai-video-ad-prompts/
├── SKILL.md                      # the skill instructions
├── references/
│   ├── platforms.md              # per-tool tips, clip lengths, ratios
│   ├── visual-styles.md          # 19 styles with Style Block starters
│   └── output-template.md        # the final prompt-file template
└── examples/
    └── chai-masala-reel.md       # sample conversation
```

## Contributing

PRs are welcome, especially:

* updated limits and tips for new AI video tools and versions
* new visual styles and better Style Blocks
* more language examples (Tamil, Telugu, Bengali, Marathi…)
* sample outputs for different industries

## License

MIT © 2026 Aakash Kumar Sharma


# Platform notes

AI video tools update often. Clip lengths, features and names below are typical
as of 2026 — tell the user to check their tool's current limits, and adapt if
they say something differs.

| Tool | Typical clip length | Speech / audio | Best consistency method | Prompt tips |
|------|--------------------|----------------|-------------------------|-------------|
| **Google Veo** (Flow, Gemini) | ~8s | Native dialogue, SFX, music | Ingredients/reference images, frames-to-video, extend | Put dialogue in quotes with speaker + tone. Describe audio explicitly ("ambient kitchen sounds"). Supports Hindi and other languages for speech. |
| **Kling** | 5–10s | Native audio on newer versions; lip-sync tool | Elements / multi-image reference, start + end frame | Short, clear action. Use negative prompt field. Use end-frame of clip N as start-frame of clip N+1. |
| **Sora** | ~10–20s | Native audio + dialogue | Image input, storyboard, remix | Can handle multi-beat shots; still keep one clear action per shot. |
| **Runway** (Gen-4 family) | 5–10s | Mostly no speech — add VO later | Reference images, same seed | Focus on camera + motion; keep subject text identical. |
| **Hailuo / MiniMax** | ~6–10s | Limited | Subject reference image | Camera moves in [brackets] like `[push in]` work well. |
| **Higgsfield** | depends on model chosen | depends on model | Character/Soul ID, presets, image-to-video | Good for ad presets and camera motions; pick one model for the whole ad. |
| **Luma (Dream Machine / Ray)** | 5–10s | No/limited speech | Start/end keyframes, extend | Keyframes are key for continuity. |
| **Pika, Seedance, Wan, others** | 5–10s | Varies | Image-to-video with same reference | Use the generic template; keep prompts short. |

## If the tool has no native speech
- Keep dialogue in the **Voiceover / audio script** section.
- Generate voice in ElevenLabs (or similar) in the chosen language.
- Use a lip-sync tool (Kling lip-sync, HeyGen, Sync, etc.) only if a character
  talks on camera; otherwise use voiceover over visuals.

## Ratio cheat sheet
| Platform | Ratio | Export |
|----------|-------|--------|
| Instagram Reels / YouTube Shorts / WhatsApp status | 9:16 | 1080×1920, 30fps |
| YouTube in-stream / website | 16:9 | 1920×1080, 30fps |
| Instagram / Facebook feed | 4:5 or 1:1 | 1080×1350 / 1080×1080 |

Keep important content away from the top ~15% and bottom ~20% on 9:16 videos
(app buttons and captions cover those areas).

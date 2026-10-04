# Wedding Entrance — "Two Hearts Connect" (36 sec, 16:9)

Names: **ARIEL & MEIRAV** (change in `source/entrance.html`, first line of the script: `NAME_A`, `NAME_B`).
Voice: English AI voice (Kokoro TTS, voice `af_heart`), with light hall reverb.

---

## Full script & timing

| Time | Section | Voice-over (EN) | Screen | Sound |
|---|---|---|---|---|
| 0:00–0:10 | Dramatic opening | 1.6s "Beautiful people..." · 3.5s "Attention." · 5.25s "New frequencies have been activated." | Dark fog in deep purple / neon blue. A glowing round portal opens out of the fog with a slowly rotating galaxy inside. At 5.2s thin lasers sweep in from the four corners, and "NEW FREQUENCIES ACTIVATED" decodes on screen. | Deep drone, soft shimmer, low hit on "Attention", rising arpeggio when the lasers start |
| 0:10–0:17 | Hearts approach | 13.3s "Ariel and Meirav..." · 15.75s "...connect to one." | The galaxy grows and burns orange. Two crystal hearts (rose-pink and ice-blue) float in from both edges with light trails and meet in the center exactly at 17.0s. | Heartbeat that speeds up, tension strings, riser |
| 0:17–0:22 | The merge (mid-point peak) | — | White flash, shockwave, sparks, then one large golden-rose heart beating, with rotating god rays and "ARIEL ♥ MEIRAV" in elegant serif. | Huge impact plus a warm major chord, heartbeat synced to the beating heart, bells |
| 0:22–0:26 | Total silence | (4 seconds of absolute silence, music cut hard) | Hard cut to black, a giant 3D moon fades in, stars twinkle. **Tip: venue lights down to minimum.** | Silence (−91 dB) |
| 0:26–0:29 | Awakening | 26.05s "Are you ready for the after-party?" · 27.98s "Let's do it!" | The moon turns blood-red, embers rise, red flicker speeds up. | Riser and snare roll |
| 0:29–0:34.6 | AFTER-PARTY | — | DROP at 28.95s: red and gold explode, rotating beams, lasers, confetti, strobes on the beat. "ARIEL & MEIRAV" in giant cyber-punk letters with RGB-split glitch, plus "THE AFTER PARTY". | EDM drop, 128 BPM |
| 0:34.6–0:36.5 | Final hit | — | White flash, names hold, fade to black. | Final impact plus a chord ringing out |

**Cue for the DJ / lighting:** silence at 22.0s → lights down; drop at 28.95s → full lights, CO₂ / sparklers.

---

## Prompts for AI video tools (Runway / Kling / Veo / Sora)

Use these to generate alternative "real-footage" style clips per scene. Generate in 16:9, 1080p or 4K. Keep the subject centered, because a round LED screen crops the corners.

**Scene 1 — Opening (10s)**
> Cinematic dark void filled with thick volumetric fog, deep violet and neon blue. A colossal glowing circular portal slowly opens in the center out of the fog, a hypnotic spiral galaxy rotating inside it. Thin laser beams sweep from the corners through the haze. Slow push-in, anamorphic lens flares, ultra-detailed, 4K, epic and mysterious, no text.

**Scene 2 — Two hearts (7s)**
> Two giant crystal hearts made of faceted glass, one glowing rose-pink and one ice-blue, float slowly toward each other from the left and right edges of the frame over a burning orange-violet galaxy. Light trails and sparkling dust follow them. They meet exactly in the center. Cinematic, slow motion, volumetric light, 4K, no text.

**Scene 3 — The merge (5s)**
> The two crystal hearts fuse in a blinding explosion of white light and a circular shockwave, sparks burst outward, revealing one large radiant golden-rose crystal heart that beats slowly, with rotating god rays behind it. Emotional, majestic, 4K, centered composition.

**Scene 4 — Silence (4s)**
> A huge photoreal 3D full moon hangs motionless in deep black space, stars twinkling softly, extremely slow push-in, quiet and breathtaking, cinematic, 4K, no text.

**Scene 5 — After-party (8s)**
> Explosion of energy: blood-red and gold light bursts, fast strobe pulses on a 128 BPM beat, rotating light beams, red and gold lasers, falling gold confetti. Giant floating metallic gold letters "ARIEL & MEIRAV" with cyberpunk RGB glitch and scanline effects, subtitle "THE AFTER PARTY". High energy, club atmosphere, 4K.

**Voice prompt (ElevenLabs / any TTS)**
> Female, warm but authoritative AI announcer, slow and dramatic delivery, slight cinematic reverb. Lines: "Beautiful people... Attention. New frequencies have been activated." / "Ariel and Meirav... connect to one." / "Are you ready for the after-party? Let's do it!"

---

## Files

| File | What it is |
|---|---|
| `entrance-4k.mp4` | Master, 3840×2160, 30fps, with voice and music |
| `entrance-1080p.mp4` | 1920×1080, light version for the LED controller / laptop |
| `entrance-soundtrack.wav` | Music + voice only (for the sound system) |
| `source/entrance.html` | Visuals: change the names on the first line and re-render |
| `source/audio.py` | Music + voice mix |
| `source/rec4k.js` | Renderer (Playwright → ffmpeg) |

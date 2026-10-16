# Visual styles

Show the user this menu in Stage 2. Each style has a **Style Block starter**:
fixed words that go into the STYLE block of the Consistency Lock and into
every clip prompt. Keep them word-for-word across clips.

Don't name real studios, films, artists or franchises in prompts. Describe the
look instead.

---

## A. Real-life styles (should look like a real shoot)

### 1. Ultra-realistic / real shoot ⭐ (default for most products)
Looks like a real film crew shot it on a cinema camera.
```
Photorealistic live-action commercial footage, shot on a cinema camera with a
35mm prime lens, natural skin texture with visible pores and fine hair, real
fabric wrinkles, realistic hand and finger movement, natural motion blur,
soft motivated lighting, subtle film grain, true-to-life colours, shallow
depth of field, no CGI look, no plastic skin
```
Tips for making it look real:
- Add small imperfections: a slightly messy table, a loose hair strand, a
  fingerprint on glass, steam or dust in the light.
- Use real camera language: "handheld with slight shake", "focus pull",
  "50mm", "f/1.8", "golden hour side light".
- Keep actions simple and slow. Fast, complex hand actions give away AI.
- Negative: `plastic skin, waxy face, over-smooth, CGI, cartoon, oversaturated,
  perfect symmetry, extra fingers`.
- Best with: Veo, Sora, Kling (latest versions).

### 2. UGC / phone-shot (influencer, selfie review)
Looks like a real customer filmed it on a phone. Performs well on Reels.
```
Vertical smartphone front-camera footage, handheld, slightly shaky, casual
home lighting, auto-exposure shifts, natural unfiltered look, person talking
directly to camera, authentic influencer review style
```

### 3. Documentary / vlog
```
Documentary-style handheld footage, natural available light, candid moments,
real locations, slight lens flare, observational camera
```

### 4. Luxury / premium commercial
For jewellery, perfume, watches, fashion, cars.
```
High-end luxury commercial, controlled studio lighting with soft rim light,
glossy reflections, slow-motion macro details, rich deep blacks, elegant
slow camera moves, premium colour grade
```

### 5. Retro / vintage film
Nostalgic 80s–90s Indian TV ad feel.
```
Vintage 1990s television commercial look, 4:3 feel, soft film grain,
slightly faded warm colours, gentle vignette, analog video texture
```

### 6. Product-only / tabletop
No people, just the product. Food, cosmetics, gadgets.
```
Studio tabletop product commercial, macro lens, slow orbit around the product,
splashes and particles in slow motion, clean seamless background,
crisp reflections
```

---

## B. Animated & artistic styles

### 7. 3D animation (feature-film style)
```
Stylized 3D animated film look, soft global illumination, expressive
characters with slightly exaggerated proportions, big expressive eyes,
smooth subsurface skin shading, vibrant colours, warm family-friendly mood
```

### 8. 2D cartoon
```
Flat 2D cartoon animation, bold clean outlines, bright solid colours, simple
shapes, playful bouncy motion, kids-friendly
```

### 9. Anime
```
Japanese anime style, cel-shaded characters, detailed painted backgrounds,
dramatic lighting, dynamic camera angles, expressive eyes
```

### 10. Claymation / stop-motion
```
Handmade claymation stop-motion look, visible fingerprints on clay, slightly
choppy 12fps motion, miniature handcrafted sets, soft studio lighting
```

### 11. 3D product render / CGI
Tech, gadgets, apps, explainer shots.
```
Clean 3D CGI product render, studio lighting, glossy materials, floating
product rotating slowly, minimal gradient background, sleek tech aesthetic
```

### 12. Motion graphics / kinetic text
For apps, SaaS, offers, sales.
```
Modern 2D motion graphics, flat vector shapes, smooth easing transitions,
bold kinetic typography, brand colour palette, clean UI mockups
```

### 13. Illustrated / hand-painted
```
Hand-painted watercolour illustration style, soft textured paper, gentle
brush strokes, pastel colours, storybook feel
```

### 14. Comic / pop art
```
Comic book style, bold ink outlines, halftone dots, dramatic panels,
saturated pop-art colours
```

### 15. Indian traditional art
For festive, heritage and ethnic brands.
```
Indian folk art animation inspired by Madhubani and miniature painting
traditions, intricate patterns, rich earthy colours, ornate borders
```

### 16. Fantasy / mythological / epic
```
Epic cinematic fantasy look, grand scale, volumetric god rays, glowing
particles, dramatic sky, rich gold and deep blue palette
```

### 17. Neon / futuristic
```
Futuristic neon-lit city at night, cyan and magenta lighting, wet reflective
streets, high-tech holographic UI, sleek sci-fi mood
```

### 18. Mixed: real + animation
Real person with animated elements (doodles, characters, graphics).
```
Photorealistic live-action footage combined with hand-drawn 2D animated
doodles and graphics overlaid around the person and product
```

### 19. Custom
The user describes their own style or shares a reference image. Turn it into a
Style Block in the same format and confirm it with them.

---

## Consistency tips by style

- **Realistic:** lock face details, outfit colours, lens, light direction and
  time of day. Use a real product photo as the start frame.
- **3D / cartoon / anime:** first generate a **character model sheet** (front,
  side, back, 3 expressions) in that style and use it as the reference for
  every clip. Style drift is common, so repeat the full Style Block every time.
- **Motion graphics:** fix the colour palette (hex codes), font style and
  background, and make the text in the editor instead of in the AI tool.
- Never mix two styles in one ad unless the user chose style 18 (Mixed).

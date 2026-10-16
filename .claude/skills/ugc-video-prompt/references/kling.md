# Kling (可灵) — UGC prompt reference

## Prompt formula (official Kuaishou)

> **（镜头语言 + 光影）+ 主体 + 主体运动 + 场景 + 氛围**
> = (Camera language + Light/Shadow) + Subject + Subject Motion + Scene + Atmosphere

- Use **simple words, short sentences**; avoid long complex sentences.
- For **image-to-video**, the image already carries appearance — so the prompt
  should focus on **motion + camera**, not re-describing the subject.
- Scene should be something showable within the clip length ("符合 5s 视频内可以展现的画面即可").

Camera keywords (write inline): orbit / 360° orbit (great for products), dolly
push, crash zoom, whip-pan, pan, tilt, tracking, macro close-up, POV, push/pull,
time-freeze.

## Multi-shot (Kling 3.0)

Kling 3.0 supports **storyboards up to 6 shots** in one output — label shots
clearly and describe each, with optional per-shot durations. Older versions:
single shot, keep it to one beat.

## Asset reference

- **Image-to-video (first frame)**: `start_image_url`. Note: in i2v the **aspect
  ratio is inherited from the input image** — to get 9:16 you must feed a 9:16
  first frame (there's no aspect_ratio param in i2v).
- **End frame**: `end_image_url` (since 1.6) — interpolates start→end.
- **Omni dual-image / 多图参考 (the verified API path)**: the official API binds
  multiple reference images through the **omni-video** endpoint
  (`/v1/videos/omni-video`, model `kling-v3-omni`). You pass an `image_list` of 2+
  images and reference them **by index in the prompt** with `<<<image_1>>>`,
  `<<<image_2>>>` (and `<<<element_1>>>` for a registered subject). This is the true
  equivalent of 即梦's `@图1 @图2` — it locks **both** a person and a product to
  their originals in one shot. See "API generation (verified)" below.
- **Elements (registered subjects)**: optionally pre-register a subject from 1–4
  images (front, ¾-left, ¾-right, back for 3D consistency) via
  `/v1/general/advanced-custom-elements`, get an `element_id`, then reference it as
  `<<<element_1>>>`. Useful for a recurring character across many videos.
- **App vs API**: the consumer app binds assets via Elements slots (no in-prompt
  token); the **official API** uses the `<<<image_N>>>` / `<<<element_N>>>` tokens
  above. (Third-party wrappers like fal use `@Image1` — not the native syntax.)

Keep `@avatar`/`@product` as placeholders in the written prompt; when generating,
they map to `<<<image_1>>>` / `<<<image_2>>>` in the order you pass `--image`.

## API generation (verified working)

The bundled `scripts/kling/` toolkit (Node 18+, zero deps) runs the full
submit→poll→download. **This is the recommended path for person+product UGC** —
it's the only one that keeps both originals faithful, and Kling allows real-person
references here.

```bash
node scripts/kling/kling.mjs account --costs          # verify creds + quota
KLING_MEDIA_ROOTS="<img dir>" node scripts/kling/kling.mjs video \
  --model kling-v3-omni \
  --prompt "<<<image_1>>>中的女生 拿着 <<<image_2>>> 的产品，手持自拍展示…" \
  --image "person.png,product.jpg" \
  --aspect_ratio 9:16 --duration 5 --mode pro --sound on --output_dir "<out>"
```

Hard-won specifics:

- **Endpoint: `api-beijing.klingai.com` (CN) or `api-singapore.klingai.com`
  (global). NOT `api.klingai.com`** — that bare host returns a misleading
  `code=1002 Auth failed` even with a valid key. The toolkit auto-probes the right
  one. Error codes: `1000` = bad secret/signature, `1002` = account/endpoint
  mismatch.
- **Auth**: JWT HS256, payload `{iss: AccessKey, exp: now+1800, nbf: now-5}`, signed
  with the SecretKey, sent as `Authorization: Bearer`. Creds live in
  `~/.config/kling/.credentials` (`[default]` / `access_key_id` /
  `secret_access_key`) or a session `KLING_TOKEN`.
- **Two+ `--image` (comma-separated) auto-routes to omni-video** and builds
  `image_list`; a single `--image` stays on plain image2video.
- **Real people are allowed** on omni dual-image (unlike Seedance 2.0, which
  rejects real faces). Generations still pass Kuaishou content audit — a rejection
  surfaces as `task_status: failed` + `task_status_msg`.
- **Local paths** need `KLING_MEDIA_ROOTS=<dir>` (comma-separated) or
  `KLING_ALLOW_ABSOLUTE_PATHS=1`; URLs always work.
- `kling-v3-omni` supports `--sound on`; `kling-video-o1` does not.

## Audio (Kling 3.0 Omni)

Native audio with voice-to-character binding + automatic lip-sync. **State who
speaks and when** in multi-character scenes. Tone as bold modifiers:
`serious voice`, `crying voice`. `generate_audio` boolean (default true). Older
Kling: no audio — dub separately.

## Params

- `aspect_ratio`: 16:9 / **9:16** / 1:1 (default 16:9 in t2v; **set 9:16** for UGC).
  In i2v it's inherited from the image (feed 9:16).
- Duration: **5s or 10s** (enum 3–15, default 5).
- `cfg_scale` (~0–1, default 0.5): lower = more motion/creativity, higher = stricter.
- `negative_prompt`: default "blur, distort, and low quality".

## Mini template (image-to-video, product)

```
（手持竖屏自拍镜头 + 窗边柔和自然光）一位年轻博主 @avatar 把运动鞋 @product 举到手机镜头前，
用手转动鞋子、光打到透明鞋底里的小玩具时停一下，真实肤色、手机原相机质感、轻微手抖、无滤镜无调色。
她自己有点乱的卧室，床头一根充电线、椅背搭着件卫衣（虚焦在背景里）。她大多看着鞋子，偶尔抬头看镜头，随口说："鞋底里居然有玩具。"
氛围：真实随性的 UGC 感、自信、轻松。无品牌礼盒、无字幕。
```
Params: feed a 9:16 first frame (or set `aspect_ratio 9:16` in t2v), `duration 5`,
enable audio (3.0 Omni) and state she speaks; otherwise dub.

# Generating the video from a prompt

Two paths. Pick by how the reference assets must be bound:

- **`kling/` (Node) — dual-image binding, RECOMMENDED for person + product.** Locks
  BOTH a person photo and a product photo to their originals at once (即梦 `@图1
  @图2` equivalent), and allows real-person references. See **[Kling Omni dual-image](#kling-omni-dual-image-recommended-for-personproduct)** below.
- **`generate.py` (Python) — single reference image, all five vendors.** For when
  the user named a specific non-Kling model or has only one asset to lock.

---

## Kling Omni dual-image (recommended for person+product)

Bundled Node toolkit in `kling/` (Node 18+, zero npm deps). Verified end-to-end.

```bash
# 1. credentials → ~/.config/kling/.credentials (INI), once:
#    [default]
#    access_key_id = <AK>
#    secret_access_key = <SK>
node kling/kling.mjs account --costs            # verify creds + quota

# 2. generate — TWO --image inputs (comma-separated) auto-route to omni-video:
KLING_MEDIA_ROOTS="<dir with images>" node kling/kling.mjs video \
  --model kling-v3-omni \
  --prompt "<<<image_1>>>中的人物 拿着 <<<image_2>>> 的产品，手持自拍展示…" \
  --image "person.png,product.jpg" \
  --aspect_ratio 9:16 --duration 5 --mode pro --sound on \
  --output_dir "<out dir>"
```

- **Endpoint auto-probes `api-beijing.klingai.com` (CN) / `api-singapore.klingai.com`
  (global).** Do NOT use `api.klingai.com` (website host → misleading `code=1002
  Auth failed`). Error codes: `1000` bad secret, `1002` account/endpoint mismatch.
- **Reference images by index in the prompt**: `<<<image_1>>>`, `<<<image_2>>>`
  (order = `--image` order); `<<<element_1>>>` for a registered subject.
- **Real people allowed** (Seedance 2.0 rejects them).
- **Local paths**: set `KLING_MEDIA_ROOTS=<dir>` or `KLING_ALLOW_ABSOLUTE_PATHS=1`;
  URLs always work. `kling-v3-omni` supports `--sound on`; `kling-video-o1` doesn't.

---

## generate.py — single reference image, five vendors

One script, five vendors. It submits your prompt (and optional reference image)
to the vendor's **official** API, polls the async job, and downloads the finished
mp4.

## Install

```bash
pip install -r requirements.txt   # requests + pyjwt
```

## Credentials (env vars — never hard-code keys)

| Model | Required env vars | Optional |
|-------|-------------------|----------|
| `seedance` | `ARK_API_KEY` | `ARK_BASE_URL` (default Volcengine CN; set to `https://ark.ap-southeast.bytepluses.com/api/v3` for BytePlus global), `SEEDANCE_MODEL` |
| `kling` (single image) | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` | `KLING_BASE_URL` (default `api-beijing.klingai.com`; global = `api-singapore.klingai.com`), `KLING_MODEL`. For dual-image, use the `kling/` Node toolkit instead. |
| `hailuo` | `MINIMAX_API_KEY`, `MINIMAX_GROUP_ID` | `MINIMAX_BASE_URL` (default `api.minimax.io`; CN = `api.minimaxi.com`), `HAILUO_MODEL` |
| `veo` | `GEMINI_API_KEY` | `VEO_MODEL` |
| `sora` | `OPENAI_API_KEY` | `SORA_MODEL` |

> Pick the base URL that matches the region your key was issued for. A China key
> on a global host (or vice-versa) will fail auth, and Seedance model IDs are
> region-bound (`doubao-*` on Volcengine, `dreamina-*` on BytePlus).

## Examples

Text-to-video, Veo, vertical, with caption suppression:
```bash
python generate.py --model veo \
  --prompt-file prompt.txt --out grwm.mp4 \
  --aspect 9:16 --duration 8 --negative "no subtitles, no text, no captions"
```

Image-to-video, Seedance 2.0 with audio, avatar as first frame:
```bash
python generate.py --model seedance \
  --prompt-file prompt.txt --image avatar.png --out unbox.mp4 \
  --aspect 9:16 --duration 8 --audio
```

Kling image-to-video (product photo as first frame), pro quality:
```bash
python generate.py --model kling \
  --prompt-file prompt.txt --image product.jpg --out review.mp4 \
  --duration 5 --kling-mode pro --cfg-scale 0.4 --negative "blur, distort"
```

Sora with a reference frame:
```bash
python generate.py --model sora \
  --prompt-file prompt.txt --image first_frame.png --out clip.mp4 \
  --size 720x1280 --duration 8
```

## Images: local path or URL

`--image` / `--image-tail` accept a **local file** or an **http(s) URL**.

- Seedance, Hailuo, Kling: a local file is inlined as base64 automatically; a URL
  is used directly.
- **Veo and Sora require a local file** (sent as inline base64 / multipart upload).
  Passing a URL there errors out with a clear message.

## How the `@placeholders` map to real assets

The prompt the skill writes keeps semantic placeholders like `@avatar` and
`@product`. Those are *for you to read* — the script binds the real asset through
the **image inputs**, not the prompt text:

- `@avatar` (the person) or `@product` (the item) → pass that reference image via
  `--image` (first frame) and, if you have an end state, `--image-tail`.
- Most models take **one** reference image (first frame / subject reference). If
  you need both a person *and* a product locked in, use a model with multi-image
  reference (Seedance 2.0 `image_urls`, Kling Elements) — for those, prepare a
  single composited first frame, or extend the script's adapter to pass multiple
  images (the API fields are documented inline in `generate.py`).

## Notes / gotchas baked into the script

- **Polling**: default 10s interval, 900s timeout (`--poll-interval`, `--timeout`).
- **URL expiry**: vendor result URLs expire (Seedance ~24h, Hailuo ~9h, Veo ~2d,
  Sora ~1h). The script downloads immediately, so the local mp4 is yours to keep.
- **Errors are surfaced raw**: any non-OK API response prints the vendor's exact
  error body, so auth/quota/validation problems are easy to diagnose.
- This script aligns to each vendor's documented contract as of the build date.
  If a vendor changes a field, the adapter is a single function in `generate.py`
  — easy to patch.

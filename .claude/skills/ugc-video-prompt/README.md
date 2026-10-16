# ugc-video-prompt

A [Claude](https://claude.com/claude-code) skill that writes production-ready prompts for AI video models — and can call the vendors' official APIs to render the actual `.mp4` end to end.

The goal is a clip that looks like a **real person filmed it on their phone** — handheld micro-shake, natural daylight, real skin, casual self-aware dialogue — not a polished ad. That "authentic amateur" quality is what makes UGC spread, and it comes almost entirely from how the prompt is written.

## Supported models

Each path targets the vendor's **official** API (not a reseller):

| Model | Vendor | Native audio | Reference image |
|-------|--------|:---:|---|
| **Seedance** 即梦 | Volcengine / BytePlus ModelArk | — | first-frame image |
| **Kling** 可灵 | Kuaishou (`api.klingai.com`) | version-dependent | Elements / dual-image (Omni) |
| **Veo 3** | Google Gemini API | ✅ | separate image inputs |
| **Sora** | OpenAI `/v1/videos` | ✅ | — |
| **Hailuo** 海螺 | MiniMax | — | image input |

A verified **Kling Omni dual-image** path locks both a person photo *and* a product photo to their originals at once — the API equivalent of 即梦's `@图1 @图2`.

## What's in here

```
SKILL.md            The skill itself — prompt-engineering craft + per-model workflow
references/         Per-model API notes (dialogue syntax, audio, params, asset refs)
scripts/generate.py Multi-vendor renderer: submit prompt + images, poll, download
scripts/README.md   How to run the renderer
evals/evals.json    Evaluation cases (EN + 中文)
```

## Using the renderer

Credentials are read from environment variables — **never hard-coded**.

```bash
pip install requests pyjwt

# set keys for whichever model you use:
#   seedance : ARK_API_KEY
#   kling    : KLING_ACCESS_KEY, KLING_SECRET_KEY
#   hailuo   : MINIMAX_API_KEY, MINIMAX_GROUP_ID
#   veo      : GEMINI_API_KEY
#   sora     : OPENAI_API_KEY

python scripts/generate.py \
  --model veo --prompt-file prompt.txt --out out.mp4 \
  --aspect 9:16 --duration 8
```

`--image` / `--image-tail` accept either a local file path or an `http(s)` URL. See `scripts/README.md` for the full reference.

## Installing as a Claude skill

Clone into your skills directory so Claude Code can discover it:

```bash
git clone https://github.com/Jarad-z/ugc-video-prompt.git ~/.claude/skills/ugc-video-prompt
```

Then ask for a UGC video prompt (or just hand Claude a product photo and a model name) and the skill triggers automatically.

## License

[MIT](LICENSE)

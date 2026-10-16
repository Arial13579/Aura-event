#!/usr/bin/env python3
"""
generate.py — run a UGC video prompt through an official vendor API and download the result.

Supported models (each hits the vendor's OFFICIAL API, not a reseller):
  seedance  -> Volcengine / BytePlus ModelArk   (Bearer key)
  kling     -> Kuaishou api.klingai.com          (JWT signed with AccessKey/SecretKey)
  hailuo    -> MiniMax                           (Bearer key + GroupId)
  veo       -> Google Gemini API                 (API key)
  sora      -> OpenAI /v1/videos                 (Bearer key)

Quick start:
  pip install requests pyjwt
  export FAL_NOT_NEEDED=1
  # set the keys for whichever model you use (see --help / env section below)
  python generate.py --model veo --prompt-file prompt.txt --out out.mp4 --aspect 9:16 --duration 8
  python generate.py --model seedance --prompt-file p.txt --image avatar.png --image product.png

This script intentionally aligns to each vendor's documented request/response
contract. It cannot be fully end-to-end tested without live API keys, so it is
written defensively: every vendor call surfaces the raw error body on failure so
you can see exactly what the API said.

Credentials are read from environment variables (never hard-code keys):
  seedance : ARK_API_KEY                (+ optional ARK_BASE_URL, SEEDANCE_MODEL)
  kling    : KLING_ACCESS_KEY, KLING_SECRET_KEY   (+ optional KLING_BASE_URL, KLING_MODEL)
  hailuo   : MINIMAX_API_KEY, MINIMAX_GROUP_ID    (+ optional MINIMAX_BASE_URL, HAILUO_MODEL)
  veo      : GEMINI_API_KEY             (+ optional VEO_MODEL)
  sora     : OPENAI_API_KEY             (+ optional SORA_MODEL)

Asset inputs (--image / --image-tail) accept EITHER a local file path OR an http(s) URL.
Local files are inlined as base64 data URIs where the vendor supports it; for vendors
that require a public URL you must pass a URL (the script will tell you).
"""

import argparse
import base64
import mimetypes
import os
import sys
import time
import json

try:
    import requests
except ImportError:
    sys.exit("Missing dependency: pip install requests")


# --------------------------------------------------------------------------- #
# Shared helpers
# --------------------------------------------------------------------------- #

def log(msg):
    print(f"[generate] {msg}", flush=True)


def is_url(s):
    return isinstance(s, str) and s.lower().startswith(("http://", "https://"))


def read_prompt(args):
    if args.prompt_file:
        with open(args.prompt_file, encoding="utf-8") as f:
            return f.read().strip()
    if args.prompt:
        return args.prompt
    sys.exit("Provide a prompt via --prompt or --prompt-file")


def load_image_as_data_uri(path_or_url):
    """Return a data: URI for a local file, or the URL unchanged if already a URL."""
    if is_url(path_or_url):
        return path_or_url
    if not os.path.isfile(path_or_url):
        sys.exit(f"Image not found: {path_or_url}")
    mime = mimetypes.guess_type(path_or_url)[0] or "image/png"
    with open(path_or_url, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def load_image_raw_base64(path_or_url):
    """Return raw base64 (no data: prefix). Vendors like Kling want this for files."""
    if is_url(path_or_url):
        return path_or_url  # Kling also accepts a URL directly
    if not os.path.isfile(path_or_url):
        sys.exit(f"Image not found: {path_or_url}")
    with open(path_or_url, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


def need_env(name):
    val = os.environ.get(name)
    if not val:
        sys.exit(f"Missing required environment variable: {name}")
    return val


def download(url, out_path, headers=None):
    log(f"Downloading video -> {out_path}")
    r = requests.get(url, headers=headers or {}, stream=True, timeout=300)
    r.raise_for_status()
    with open(out_path, "wb") as f:
        for chunk in r.iter_content(chunk_size=1 << 16):
            if chunk:
                f.write(chunk)
    log(f"Saved {os.path.getsize(out_path)} bytes")


def poll(fn, *, interval, timeout, label):
    """Call fn() repeatedly; fn returns (done, result_or_none, status_str). Raises on timeout."""
    start = time.time()
    last = None
    while True:
        done, result, status = fn()
        if status != last:
            log(f"{label}: status={status}")
            last = status
        if done:
            return result
        if time.time() - start > timeout:
            raise TimeoutError(f"{label}: timed out after {timeout}s (last status: {status})")
        time.sleep(interval)


def die_http(resp, label):
    body = resp.text
    try:
        body = json.dumps(resp.json(), ensure_ascii=False)
    except Exception:
        pass
    sys.exit(f"{label} failed: HTTP {resp.status_code}\n{body}")


# --------------------------------------------------------------------------- #
# Seedance — Volcengine / BytePlus ModelArk
# --------------------------------------------------------------------------- #

def run_seedance(args, prompt):
    base = os.environ.get("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3").rstrip("/")
    model = args.model_id or os.environ.get("SEEDANCE_MODEL", "doubao-seedance-2-0-260128")
    key = need_env("ARK_API_KEY")
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    is_v1 = ("1-0" in model) or ("1.0" in model)

    text = prompt
    if is_v1:
        # Seedance 1.0 packs parameters as `--key value` flags appended to the prompt
        # text, NOT as top-level JSON fields. It also has no native audio.
        flags = []
        flags.append(f"--resolution {args.resolution or '720p'}")
        flags.append(f"--ratio {args.aspect or '9:16'}")
        flags.append(f"--dur {int(args.duration or 5)}")
        if args.seed is not None:
            flags.append(f"--seed {args.seed}")
        text = prompt + "\n" + " ".join(flags)

    content = [{"type": "text", "text": text}]
    if args.image:
        content.append({"type": "image_url",
                        "image_url": {"url": load_image_as_data_uri(args.image)},
                        "role": "first_frame"})
    if args.image_tail:
        content.append({"type": "image_url",
                        "image_url": {"url": load_image_as_data_uri(args.image_tail)},
                        "role": "last_frame"})

    body = {"model": model, "content": content}
    if not is_v1:
        # Seedance 2.0 promotes these to top-level JSON fields and supports audio.
        body["ratio"] = args.aspect or "9:16"
        body["duration"] = int(args.duration or 5)
        if args.resolution:
            body["resolution"] = args.resolution
        if args.seed is not None:
            body["seed"] = args.seed
        body["generate_audio"] = bool(args.audio)

    log(f"Seedance: creating task on {model}")
    r = requests.post(f"{base}/contents/generations/tasks", headers=headers, json=body, timeout=60)
    if not r.ok:
        die_http(r, "Seedance create")
    task_id = r.json().get("id")
    if not task_id:
        sys.exit(f"Seedance create: no task id in response: {r.text}")

    def check():
        q = requests.get(f"{base}/contents/generations/tasks/{task_id}", headers=headers, timeout=60)
        if not q.ok:
            die_http(q, "Seedance poll")
        data = q.json()
        status = data.get("status", "unknown")
        if status == "succeeded":
            url = (data.get("content") or {}).get("video_url")
            if not url:
                sys.exit(f"Seedance succeeded but no video_url: {json.dumps(data, ensure_ascii=False)}")
            return True, url, status
        if status in ("failed", "expired", "cancelled"):
            sys.exit(f"Seedance task {status}: {json.dumps(data.get('error', data), ensure_ascii=False)}")
        return False, None, status

    url = poll(check, interval=args.poll_interval, timeout=args.timeout, label="Seedance")
    download(url, args.out)


# --------------------------------------------------------------------------- #
# Kling — Kuaishou api.klingai.com  (JWT auth)
# --------------------------------------------------------------------------- #

def kling_jwt(access_key, secret_key):
    try:
        import jwt  # PyJWT
    except ImportError:
        sys.exit("Kling needs PyJWT: pip install pyjwt")
    now = int(time.time())
    payload = {"iss": access_key, "exp": now + 1800, "nbf": now - 5}
    return jwt.encode(payload, secret_key, algorithm="HS256",
                      headers={"alg": "HS256", "typ": "JWT"})


def run_kling(args, prompt):
    # NOTE: the official business endpoint is api-beijing.klingai.com (CN) /
    # api-singapore.klingai.com (global). The bare api.klingai.com is the website
    # host and returns a misleading "code=1002 Auth failed" for API calls.
    base = os.environ.get("KLING_BASE_URL", "https://api-beijing.klingai.com").rstrip("/")
    model = args.model_id or os.environ.get("KLING_MODEL", "kling-v1-6")
    ak = need_env("KLING_ACCESS_KEY")
    sk = need_env("KLING_SECRET_KEY")

    def headers():
        return {"Authorization": f"Bearer {kling_jwt(ak, sk)}", "Content-Type": "application/json"}

    i2v = bool(args.image)
    endpoint = "image2video" if i2v else "text2video"
    body = {
        "model_name": model,
        "prompt": prompt,
        "duration": str(int(args.duration or 5)),
        "cfg_scale": args.cfg_scale,
    }
    if args.negative:
        body["negative_prompt"] = args.negative
    if i2v:
        body["image"] = load_image_raw_base64(args.image)
        if args.image_tail:
            body["image_tail"] = load_image_raw_base64(args.image_tail)
    else:
        body["aspect_ratio"] = args.aspect or "9:16"
        body["mode"] = args.kling_mode

    log(f"Kling: creating {endpoint} task on {model}")
    r = requests.post(f"{base}/v1/videos/{endpoint}", headers=headers(), json=body, timeout=60)
    if not r.ok:
        die_http(r, "Kling create")
    data = r.json()
    if data.get("code") != 0:
        sys.exit(f"Kling create error: {json.dumps(data, ensure_ascii=False)}")
    task_id = data["data"]["task_id"]

    def check():
        q = requests.get(f"{base}/v1/videos/{endpoint}/{task_id}", headers=headers(), timeout=60)
        if not q.ok:
            die_http(q, "Kling poll")
        d = q.json()
        if d.get("code") != 0:
            sys.exit(f"Kling poll error: {json.dumps(d, ensure_ascii=False)}")
        st = d["data"]["task_status"]
        if st == "succeed":
            vids = (d["data"].get("task_result") or {}).get("videos") or []
            if not vids:
                sys.exit(f"Kling succeed but no videos: {json.dumps(d, ensure_ascii=False)}")
            return True, vids[0]["url"], st
        if st == "failed":
            sys.exit(f"Kling task failed: {d['data'].get('task_status_msg')}")
        return False, None, st

    url = poll(check, interval=args.poll_interval, timeout=args.timeout, label="Kling")
    download(url, args.out)


# --------------------------------------------------------------------------- #
# Hailuo — MiniMax
# --------------------------------------------------------------------------- #

def run_hailuo(args, prompt):
    base = os.environ.get("MINIMAX_BASE_URL", "https://api.minimax.io").rstrip("/")
    model = args.model_id or os.environ.get("HAILUO_MODEL", "MiniMax-Hailuo-02")
    key = need_env("MINIMAX_API_KEY")
    group_id = need_env("MINIMAX_GROUP_ID")
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    body = {"model": model, "prompt": prompt, "prompt_optimizer": True}
    if args.duration:
        body["duration"] = int(args.duration)
    if args.resolution:
        body["resolution"] = args.resolution
    if args.image:
        # Hailuo accepts a public URL or a base64 data URI for the first frame.
        body["first_frame_image"] = load_image_as_data_uri(args.image)

    log(f"Hailuo: creating task on {model}")
    r = requests.post(f"{base}/v1/video_generation", headers=headers, json=body, timeout=60)
    if not r.ok:
        die_http(r, "Hailuo create")
    data = r.json()
    if (data.get("base_resp") or {}).get("status_code") not in (0, None):
        sys.exit(f"Hailuo create error: {json.dumps(data, ensure_ascii=False)}")
    task_id = data.get("task_id")
    if not task_id:
        sys.exit(f"Hailuo create: no task id: {r.text}")

    def check():
        q = requests.get(f"{base}/v1/query/video_generation",
                         headers=headers, params={"task_id": task_id}, timeout=60)
        if not q.ok:
            die_http(q, "Hailuo poll")
        d = q.json()
        st = d.get("status", "unknown")
        if st == "Success":
            return True, d.get("file_id"), st
        if st == "Fail":
            sys.exit(f"Hailuo task failed: {json.dumps(d, ensure_ascii=False)}")
        return False, None, st

    file_id = poll(check, interval=args.poll_interval, timeout=args.timeout, label="Hailuo")

    # Resolve file_id -> download_url
    fr = requests.get(f"{base}/v1/files/retrieve", headers=headers,
                      params={"GroupId": group_id, "file_id": file_id}, timeout=60)
    if not fr.ok:
        die_http(fr, "Hailuo file retrieve")
    url = ((fr.json().get("file") or {}).get("download_url"))
    if not url:
        sys.exit(f"Hailuo: no download_url: {fr.text}")
    download(url, args.out)


# --------------------------------------------------------------------------- #
# Veo — Google Gemini API (long-running operation)
# --------------------------------------------------------------------------- #

def run_veo(args, prompt):
    base = "https://generativelanguage.googleapis.com/v1beta"
    model = args.model_id or os.environ.get("VEO_MODEL", "veo-3.0-generate-001")
    key = need_env("GEMINI_API_KEY")
    headers = {"x-goog-api-key": key, "Content-Type": "application/json"}

    instance = {"prompt": prompt}
    if args.image:
        if is_url(args.image):
            sys.exit("Veo image input must be a local file (it is sent as inline base64), not a URL.")
        mime = mimetypes.guess_type(args.image)[0] or "image/png"
        with open(args.image, "rb") as f:
            instance["image"] = {"inlineData": {"mimeType": mime,
                                                "data": base64.b64encode(f.read()).decode("ascii")}}
    params = {
        "aspectRatio": args.aspect or "9:16",
        "durationSeconds": int(args.duration or 8),
        "numberOfVideos": 1,
    }
    if args.resolution:
        params["resolution"] = args.resolution
    if args.negative:
        params["negativePrompt"] = args.negative
    body = {"instances": [instance], "parameters": params}

    log(f"Veo: starting long-running op on {model}")
    r = requests.post(f"{base}/models/{model}:predictLongRunning",
                      headers=headers, json=body, timeout=60)
    if not r.ok:
        die_http(r, "Veo start")
    op_name = r.json().get("name")
    if not op_name:
        sys.exit(f"Veo start: no operation name: {r.text}")

    def check():
        q = requests.get(f"{base}/{op_name}", headers=headers, timeout=60)
        if not q.ok:
            die_http(q, "Veo poll")
        d = q.json()
        if d.get("done"):
            if "error" in d:
                sys.exit(f"Veo op error: {json.dumps(d['error'], ensure_ascii=False)}")
            samples = (((d.get("response") or {}).get("generateVideoResponse") or {})
                       .get("generatedSamples") or [])
            if not samples:
                sys.exit(f"Veo done but no samples: {json.dumps(d, ensure_ascii=False)}")
            return True, samples[0]["video"]["uri"], "done"
        return False, None, "running"

    uri = poll(check, interval=args.poll_interval, timeout=args.timeout, label="Veo")
    # The Gemini file URI requires the API key to download.
    download(uri, args.out, headers={"x-goog-api-key": key})


# --------------------------------------------------------------------------- #
# Sora — OpenAI /v1/videos
# --------------------------------------------------------------------------- #

def run_sora(args, prompt):
    base = "https://api.openai.com/v1"
    model = args.model_id or os.environ.get("SORA_MODEL", "sora-2")
    key = need_env("OPENAI_API_KEY")
    auth = {"Authorization": f"Bearer {key}"}

    size = args.size or ("720x1280" if (args.aspect or "9:16") == "9:16" else "1280x720")
    seconds = str(int(args.duration or 8))

    log(f"Sora: creating video on {model} ({size}, {seconds}s)")
    if args.image:
        if is_url(args.image):
            sys.exit("Sora input_reference must be a local image file, not a URL.")
        files = {"input_reference": (os.path.basename(args.image), open(args.image, "rb"))}
        form = {"model": model, "prompt": prompt, "seconds": seconds, "size": size}
        r = requests.post(f"{base}/videos", headers=auth, data=form, files=files, timeout=120)
    else:
        r = requests.post(f"{base}/videos", headers={**auth, "Content-Type": "application/json"},
                          json={"model": model, "prompt": prompt, "seconds": seconds, "size": size},
                          timeout=120)
    if not r.ok:
        die_http(r, "Sora create")
    video_id = r.json().get("id")
    if not video_id:
        sys.exit(f"Sora create: no id: {r.text}")

    def check():
        q = requests.get(f"{base}/videos/{video_id}", headers=auth, timeout=60)
        if not q.ok:
            die_http(q, "Sora poll")
        d = q.json()
        st = d.get("status", "unknown")
        prog = d.get("progress")
        if st == "completed":
            return True, video_id, st
        if st == "failed":
            sys.exit(f"Sora failed: {json.dumps(d.get('error', d), ensure_ascii=False)}")
        return False, None, f"{st} ({prog}%)" if prog is not None else st

    poll(check, interval=args.poll_interval, timeout=args.timeout, label="Sora")
    # Content endpoint streams the mp4 bytes directly.
    download(f"{base}/videos/{video_id}/content", args.out, headers=auth)


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

RUNNERS = {
    "seedance": run_seedance,
    "kling": run_kling,
    "hailuo": run_hailuo,
    "veo": run_veo,
    "sora": run_sora,
}


def main():
    p = argparse.ArgumentParser(
        description="Run a UGC video prompt through an official vendor API and download the result.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--model", required=True, choices=sorted(RUNNERS),
                   help="Which vendor to call")
    p.add_argument("--model-id", help="Override the specific model id (else a sensible default per vendor)")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--prompt", help="Prompt text inline")
    g.add_argument("--prompt-file", help="Path to a file containing the prompt")
    p.add_argument("--image", help="First-frame / reference image: local path OR http(s) URL")
    p.add_argument("--image-tail", help="Last-frame image (Seedance/Kling): local path OR URL")
    p.add_argument("--out", default="out.mp4", help="Output mp4 path (default out.mp4)")
    p.add_argument("--aspect", help="Aspect ratio, e.g. 9:16 (default 9:16)")
    p.add_argument("--size", help="Sora only: WIDTHxHEIGHT, e.g. 720x1280")
    p.add_argument("--duration", help="Duration in seconds (vendor-dependent valid values)")
    p.add_argument("--resolution", help="e.g. 720p / 1080p / 768P (vendor-dependent)")
    p.add_argument("--audio", action="store_true", help="Seedance 2.0: request native audio")
    p.add_argument("--negative", help="Negative prompt (Kling/Veo)")
    p.add_argument("--seed", type=int, help="Seed (Seedance)")
    p.add_argument("--cfg-scale", type=float, default=0.5, help="Kling cfg_scale 0-1 (default 0.5)")
    p.add_argument("--kling-mode", default="std", choices=["std", "pro"], help="Kling quality mode")
    p.add_argument("--poll-interval", type=float, default=10, help="Seconds between status polls")
    p.add_argument("--timeout", type=float, default=900, help="Max seconds to wait (default 900)")
    args = p.parse_args()

    prompt = read_prompt(args)
    log(f"Model={args.model}  out={args.out}")
    RUNNERS[args.model](args, prompt)
    log("Done.")


if __name__ == "__main__":
    main()

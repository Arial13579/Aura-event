async function handler(request, env) {
  // Short-lived private file links so the agent can send sandbox files with send_media.
  // POST ?token=<upload token>&name=<filename>  body = raw file bytes  -> { url }
  // GET  ?id=<random id>                                                -> the file (expires after TTL)
  const UPLOAD_TOKEN = "__UPLOAD_TOKEN__";
  const TTL_SECONDS = 3600;
  const MAX_BYTES = 15 * 1024 * 1024;
  const url = new URL(request.url);

  function json(obj, status) {
    return new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json" } });
  }

  function toBase64(buf) {
    const bytes = new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  function fromBase64(b64) {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  const TYPES = {
    pdf: "application/pdf", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    csv: "text/csv", txt: "text/plain", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    mp3: "audio/mpeg", ogg: "audio/ogg", mp4: "video/mp4", zip: "application/zip", ics: "text/calendar"
  };

  if (request.method === "POST") {
    if (url.searchParams.get("token") !== UPLOAD_TOKEN) return json({ ok: false, error: "unauthorized" }, 401);
    const name = (url.searchParams.get("name") || "file").replace(/[^\w.\-֐-׿ ]/g, "_").slice(0, 120);
    const buf = await request.arrayBuffer();
    if (!buf.byteLength) return json({ ok: false, error: "empty body: send the file bytes with curl --data-binary @file" }, 400);
    if (buf.byteLength > MAX_BYTES) return json({ ok: false, error: "file too large (max 15MB)" }, 413);
    const id = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const ext = (name.split(".").pop() || "").toLowerCase();
    const meta = { name: name, type: TYPES[ext] || "application/octet-stream", expires: Date.now() + TTL_SECONDS * 1000 };
    await env.KV.put("file:" + id, JSON.stringify(meta) + "\n" + toBase64(buf));
    const base = url.origin + url.pathname;
    return json({ ok: true, url: base + "?id=" + id + "&name=" + encodeURIComponent(name), expires_in_seconds: TTL_SECONDS });
  }

  const id = url.searchParams.get("id");
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return json({ ok: false, error: "not found" }, 404);
  const stored = await env.KV.get("file:" + id);
  if (!stored) return json({ ok: false, error: "not found" }, 404);
  const nl = stored.indexOf("\n");
  const meta = JSON.parse(stored.slice(0, nl));
  if (Date.now() > meta.expires) {
    await env.KV.delete("file:" + id);
    return json({ ok: false, error: "expired" }, 410);
  }
  return new Response(fromBase64(stored.slice(nl + 1)), {
    headers: {
      "Content-Type": meta.type,
      "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(meta.name),
      "Cache-Control": "no-store"
    }
  });
}

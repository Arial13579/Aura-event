async function handler(request, env) {
  // Allow only the owner's WhatsApp number through to the agent; everything else is dropped.
  const OWNER = "972512440252";
  const payload = await request.json();
  const ctx = (payload.execution_context && payload.execution_context.context) || {};
  const contact = ctx.contact || {};
  const raw = String(ctx.phone_number || contact.wa_id || "");
  const sender = raw.replace(/\D/g, "");
  const edge = sender === OWNER ? "owner" : "blocked";
  return new Response(JSON.stringify({ next_edge: edge, vars: { sender_checked: sender } }), {
    headers: { "Content-Type": "application/json" }
  });
}

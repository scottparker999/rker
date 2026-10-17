// rker.me Worker: serves the static site, plus a private JSON API for Lift Log at /api/log.
// Cloudflare Access sits in front of /log and /api/log; this Worker also verifies the
// Access token itself, so the API stays locked even if the Access app is misconfigured.

const COLLECTIONS = ["sessions", "body"];
const KEY = "data";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/log")) return env.ASSETS.fetch(request);

    if (!(await verifyAccess(request, env))) return json({ error: "Not signed in" }, 401);

    const parts = url.pathname.replace(/^\/api\/log\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    const data = (await env.LOG.get(KEY, { type: "json" })) || { sessions: {}, body: {} };
    for (const c of COLLECTIONS) data[c] = data[c] || {};

    if (parts.length === 0) {
      if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
      return json(data, 200);
    }

    const [col, id] = parts;
    if (parts.length !== 2 || !COLLECTIONS.includes(col) || !/^[A-Za-z0-9_.-]{1,64}$/.test(id)) {
      return json({ error: "Not found" }, 404);
    }

    if (request.method === "PUT") {
      if (Number(request.headers.get("content-length") || 0) > 64_000) return json({ error: "Too large" }, 413);
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
      if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Expected an object" }, 400);
      data[col][id] = body;
      await env.LOG.put(KEY, JSON.stringify(data));
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }

    if (request.method === "DELETE") {
      delete data[col][id];
      await env.LOG.put(KEY, JSON.stringify(data));
      return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    }

    return json({ error: "Method not allowed" }, 405);
  },
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// ---- Cloudflare Access token check (fails closed if not configured) ----
let certs = { at: 0, keys: [] };

async function accessKeys(team) {
  if (certs.keys.length && Date.now() - certs.at < 3_600_000) return certs.keys;
  const res = await fetch(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!res.ok) return [];
  const body = await res.json();
  certs = { at: Date.now(), keys: body.keys || [] };
  return certs.keys;
}

const b64u = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function verifyAccess(request, env) {
  const team = env.ACCESS_TEAM;
  const allowed = (env.ACCESS_AUD || "").split(",").map((a) => a.trim()).filter(Boolean);
  if (!team || !allowed.length || team.startsWith("REPLACE")) return false;

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return false;
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return false;

  let header, payload;
  try {
    const dec = new TextDecoder();
    header = JSON.parse(dec.decode(b64u(h)));
    payload = JSON.parse(dec.decode(b64u(p)));
  } catch { return false; }
  if (header.alg !== "RS256") return false;

  const jwk = (await accessKeys(team)).find((k) => k.kid === header.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return false;

  const now = Date.now() / 1000;
  if (payload.exp && payload.exp < now) return false;
  if (payload.iss !== `https://${team}.cloudflareaccess.com`) return false;
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  return auds.some((a) => allowed.includes(a));
}

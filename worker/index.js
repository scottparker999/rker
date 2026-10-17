// rker.me Worker: serves the static site, plus a private JSON API for the
// Tennis Fitness Tracker at /api/log.
//
// Storage is a single SQLite-backed Durable Object, which is strongly consistent:
// a batch of queued offline changes is applied in one transaction, so saves can
// never overwrite each other. On first use it imports the earlier KV data (the
// KV copy is left in place as a backup).
//
// Cloudflare Access sits in front of /log and /api/log; this Worker also verifies
// the Access token itself, so the API stays locked even if Access is misconfigured.

import { DurableObject } from "cloudflare:workers";

const COLLECTIONS = ["sessions", "body"];
const ID_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_BODY = 64_000;
const MAX_OPS = 200;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/log")) return env.ASSETS.fetch(request);
    if (!(await verifyAccess(request, env))) return json({ error: "Not signed in" }, 401);
    return handleApi(request, env);
  },
};

export async function handleApi(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/log\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const store = env.STORE.get(env.STORE.idFromName("main"));

  // GET /api/log -> everything
  if (parts.length === 0) {
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    return json(await store.all(), 200);
  }

  // POST /api/log/batch  { ops: [{op:"put"|"delete", col, id, body?}] }
  if (parts.length === 1 && parts[0] === "batch") {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const raw = await request.text();
    if (raw.length > MAX_BODY * 8) return json({ error: "Too large" }, 413);
    let payload;
    try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
    const ops = payload && Array.isArray(payload.ops) ? payload.ops : null;
    if (!ops || ops.length > MAX_OPS) return json({ error: "Expected ops" }, 400);
    for (const o of ops) {
      const err = checkOp(o);
      if (err) return json({ error: err }, 400);
    }
    const applied = await store.apply(ops);
    return json({ ok: true, applied }, 200);
  }

  // PUT / DELETE /api/log/<col>/<id>  (single-document form, kept for older cached pages)
  const [col, id] = parts;
  if (parts.length !== 2) return json({ error: "Not found" }, 404);
  if (request.method === "PUT") {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: "Too large" }, 413);
    let body;
    try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
    const op = { op: "put", col, id, body };
    const err = checkOp(op);
    if (err) return json({ error: err }, 400);
    await store.apply([op]);
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  if (request.method === "DELETE") {
    const op = { op: "delete", col, id };
    const err = checkOp(op);
    if (err) return json({ error: err }, 400);
    await store.apply([op]);
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  return json({ error: "Method not allowed" }, 405);
}

function checkOp(o) {
  if (!o || typeof o !== "object") return "Bad op";
  if (o.op !== "put" && o.op !== "delete") return "Bad op type";
  if (!COLLECTIONS.includes(o.col)) return "Bad collection";
  if (typeof o.id !== "string" || !ID_RE.test(o.id)) return "Bad id";
  if (o.op === "put") {
    if (!o.body || typeof o.body !== "object" || Array.isArray(o.body)) return "Body must be an object";
    if (JSON.stringify(o.body).length > MAX_BODY) return "Document too large";
  }
  return null;
}

export class LogStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => {
      this.sql.exec(`CREATE TABLE IF NOT EXISTS docs (
        col TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, updated_at TEXT,
        PRIMARY KEY (col, id))`);
      this.sql.exec(`CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)`);
      const done = this.sql.exec(`SELECT v FROM meta WHERE k = 'kv_imported'`).toArray();
      if (!done.length) await this.importFromKv(env);
    });
  }

  async importFromKv(env) {
    let data = null;
    try { data = env.LOG ? await env.LOG.get("data", { type: "json" }) : null; } catch { data = null; }
    this.ctx.storage.transactionSync(() => {
      if (data) {
        for (const col of COLLECTIONS) {
          for (const [id, body] of Object.entries(data[col] || {})) {
            if (!ID_RE.test(id) || !body || typeof body !== "object") continue;
            this.sql.exec(
              `INSERT OR IGNORE INTO docs (col, id, body, updated_at) VALUES (?, ?, ?, ?)`,
              col, id, JSON.stringify(body), typeof body.updatedAt === "string" ? body.updatedAt : null,
            );
          }
        }
      }
      this.sql.exec(`INSERT OR REPLACE INTO meta (k, v) VALUES ('kv_imported', ?)`, new Date().toISOString());
    });
  }

  all() {
    const out = { sessions: {}, body: {} };
    for (const row of this.sql.exec(`SELECT col, id, body FROM docs`)) {
      if (out[row.col]) out[row.col][row.id] = JSON.parse(row.body);
    }
    return out;
  }

  // Applies ops in order, in one transaction. A put carrying an older updatedAt
  // than the stored copy is skipped, so a stale offline queue can't roll back
  // newer edits made on another device.
  apply(ops) {
    let applied = 0;
    this.ctx.storage.transactionSync(() => {
      for (const o of ops) {
        if (o.op === "delete") {
          this.sql.exec(`DELETE FROM docs WHERE col = ? AND id = ?`, o.col, o.id);
          applied++;
          continue;
        }
        const incoming = typeof o.body.updatedAt === "string" ? o.body.updatedAt : null;
        const cur = this.sql.exec(`SELECT updated_at FROM docs WHERE col = ? AND id = ?`, o.col, o.id).toArray()[0];
        if (cur && cur.updated_at && incoming && incoming < cur.updated_at) continue;
        this.sql.exec(
          `INSERT OR REPLACE INTO docs (col, id, body, updated_at) VALUES (?, ?, ?, ?)`,
          o.col, o.id, JSON.stringify(o.body), incoming,
        );
        applied++;
      }
    });
    return applied;
  }
}

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

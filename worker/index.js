// rker.me Worker: serves the static site, plus a private JSON API for the
// Tennis Fitness Tracker at /api/log.
//
// Storage is a single SQLite-backed Durable Object, which is strongly consistent:
// a batch of queued offline changes is applied in one transaction, so saves can
// never overwrite each other. (The original KV copy of the data is still in the
// "fitness-log" KV namespace as a backup; nothing reads it any more.)
//
// Cloudflare Access sits in front of /log and /api/log; this Worker also verifies
// the Access token itself, so the API stays locked even if Access is misconfigured.

import { DurableObject } from "cloudflare:workers";

const COLLECTIONS = ["sessions", "body", "play"];
const MAX_INGEST = 32_000_000;
const ID_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_BODY = 64_000;
const MAX_OPS = 200;
const MAX_BATCH = 512_000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/log")) return env.ASSETS.fetch(request);
    // Refuse requests started by other websites (the Access cookie would ride along).
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    if ((origin && origin !== url.origin) || site === "cross-site") return json({ error: "Not allowed" }, 403);
    const who = await verifyAccess(request, env);
    if (!who) return json({ error: "Not signed in" }, 401);
    // A service token (Health Auto Export on the phone) may only send workouts in.
    if (!who.email) {
      const isIngest = url.pathname.replace(/\/+$/, "") === "/api/log/ingest" && request.method === "POST";
      if (!isIngest) return json({ error: "Not allowed" }, 403);
    }
    return handleApi(request, env);
  },
};

export async function handleApi(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/log\/?/, "").split("/").filter(Boolean);
  const store = env.STORE.get(env.STORE.idFromName("main"));
  if (request.method === "POST" && !/^application\/json\b/i.test(request.headers.get("content-type") || "")) {
    return json({ error: "Expected application/json" }, 415);
  }

  // POST /api/log/ingest  Health Auto Export JSON -> tennis sessions in "play"
  if (parts.length === 1 && parts[0] === "ingest") {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (Number(request.headers.get("content-length") || 0) > MAX_INGEST) return json({ error: "Too large" }, 413);
    const raw = await request.text();
    if (raw.length > MAX_INGEST) return json({ error: "Too large" }, 413);
    let payload;
    try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
    const workouts = (payload && payload.data && payload.data.workouts) || (payload && payload.workouts) || [];
    if (!Array.isArray(workouts)) return json({ error: "Expected workouts" }, 400);
    const now = new Date().toISOString();
    const ops = [];
    for (const w of workouts) {
      const doc = summariseWorkout(w, now);
      if (doc && !checkOp({ op: "put", col: "play", id: doc.id, body: doc })) ops.push({ op: "put", col: "play", id: doc.id, body: doc });
    }
    const res = ops.length ? await store.apply(ops) : { applied: 0, created: 0 };
    const dates = ops.map((o) => o.body.date).sort();
    return json({ ok: true, received: workouts.length, tennis: ops.length, applied: res.applied, created: res.created,
      first: dates[0] || null, last: dates[dates.length - 1] || null }, 200);
  }

  // GET /api/log -> everything
  if (parts.length === 0) {
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    return json(await store.all(), 200);
  }

  // POST /api/log/batch  { ops: [{op:"put"|"delete", col, id, body?}] }
  if (parts.length === 1 && parts[0] === "batch") {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const raw = await request.text();
    if (raw.length > MAX_BATCH) return json({ error: "Too large" }, 413);
    let payload;
    try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }
    const ops = payload && Array.isArray(payload.ops) ? payload.ops : null;
    if (!ops || ops.length > MAX_OPS) return json({ error: "Expected ops" }, 400);
    for (const o of ops) {
      const err = checkOp(o);
      if (err) return json({ error: err }, 400);
    }
    const res = await store.apply(ops);
    return json({ ok: true, applied: res.applied }, 200);
  }

  return json({ error: "Not found" }, 404);
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

// ---- Apple Health (Health Auto Export) workout -> compact tennis session ----
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const qty = (v) => (v && typeof v === "object" ? num(v.qty) : num(v));
const units = (v) => (v && typeof v === "object" && typeof v.units === "string" ? v.units.toLowerCase() : "");
const round = (n, d = 0) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);
const HAE_DATE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?\s*([+-]\d{2}):?(\d{2})?$/;

function parseHaeDate(s) {
  if (typeof s !== "string") return null;
  const m = s.trim().match(HAE_DATE);
  if (!m) return null;
  const iso = `${m[1]}T${m[2]}:${m[3] || "00"}${m[4]}:${m[5] || "00"}`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? { t, date: m[1], hhmm: m[2] } : null;
}

function summariseWorkout(w, now) {
  if (!w || typeof w !== "object") return null;
  const acts = Array.isArray(w.activities) ? w.activities : [];
  const tennis = /tennis/i.test(String(w.name || "")) || acts.some((a) => /tennis/i.test(String(a && a.activityType || "")));
  if (!tennis) return null;
  const st = parseHaeDate(w.start), en = parseHaeDate(w.end);
  if (!st) return null;
  const id = String(w.id || `${st.date}-${st.hhmm}`).replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 64);
  if (!id) return null;

  const secs = num(w.duration) ?? (en ? (en.t - st.t) / 1000 : null);
  const kcal = (v) => { const n = qty(v); return n == null ? null : units(v).includes("kj") ? n / 4.184 : n; };
  const km = (v) => { const n = qty(v); if (n == null) return null; const u = units(v); return u === "m" ? n / 1000 : u === "mi" ? n * 1.609344 : n; };
  const celsius = (v) => { const n = qty(v); return n == null ? null : units(v).includes("f") ? (n - 32) * 5 / 9 : n; };
  const hrObj = w.heartRate && typeof w.heartRate === "object" ? w.heartRate : {};

  // per-minute heart-rate trace (index = minutes from start, null for gaps)
  let hr = null;
  if (Array.isArray(w.heartRateData) && w.heartRateData.length && secs) {
    const mins = Math.min(600, Math.ceil(secs / 60));
    const sum = new Array(mins).fill(0), cnt = new Array(mins).fill(0);
    for (const s of w.heartRateData) {
      const d = parseHaeDate(s && s.date);
      const v = num(s && (s.Avg ?? s.avg ?? s.qty));
      if (!d || v == null) continue;
      const i = Math.floor((d.t - st.t) / 60000);
      if (i >= 0 && i < mins) { sum[i] += v; cnt[i]++; }
    }
    hr = sum.map((v, i) => (cnt[i] ? Math.round(v / cnt[i]) : null));
    if (!hr.some((v) => v != null)) hr = null;
  }
  const steps = Array.isArray(w.stepCount) ? w.stepCount.reduce((a, s) => a + (num(s && s.qty) || 0), 0) : null;

  return {
    id,
    date: st.date,
    start: w.start,
    end: typeof w.end === "string" ? w.end : null,
    startTime: st.hhmm,
    endTime: en ? en.hhmm : null,
    durationMin: round(secs != null ? secs / 60 : null, 1),
    activeKcal: round(kcal(w.activeEnergyBurned)),
    totalKcal: round(kcal(w.totalEnergy)),
    avgHr: round(qty(w.avgHeartRate) ?? qty(hrObj.avg)),
    maxHr: round(qty(w.maxHeartRate) ?? qty(hrObj.max)),
    minHr: round(qty(hrObj.min)),
    distanceKm: round(km(w.distance), 2),
    steps: steps ? Math.round(steps) : null,
    tempC: round(celsius(w.temperature), 1),
    humidity: round(qty(w.humidity)),
    hr,
    source: "Apple Health",
    updatedAt: now,
  };
}

export class LogStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS docs (
      col TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, updated_at TEXT,
      PRIMARY KEY (col, id))`);
  }

  all() {
    const out = { sessions: {}, body: {}, play: {} };
    for (const row of this.sql.exec(`SELECT col, id, body FROM docs`)) {
      if (out[row.col]) out[row.col][row.id] = JSON.parse(row.body);
    }
    return out;
  }

  // Applies ops in order, in one transaction. A put carrying an older updatedAt
  // than the stored copy is skipped, so a stale offline queue can't roll back
  // newer edits made on another device.
  apply(ops) {
    let applied = 0, created = 0;
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
        if (!cur) created++;
        this.sql.exec(
          `INSERT OR REPLACE INTO docs (col, id, body, updated_at) VALUES (?, ?, ?, ?)`,
          o.col, o.id, JSON.stringify(o.body), incoming,
        );
        applied++;
      }
    });
    return { applied, created };
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

// Cached for an hour; refetched early (at most once a minute) when Cloudflare
// rotates its signing keys and a token arrives with an unknown key id.
async function accessKey(team, kid) {
  const fresh = Date.now() - certs.at < 3_600_000;
  let jwk = fresh ? certs.keys.find((k) => k.kid === kid) : null;
  if (!jwk && Date.now() - certs.at > 60_000) {
    try {
      const res = await fetch(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`);
      if (res.ok) certs = { at: Date.now(), keys: (await res.json()).keys || [] };
    } catch {}
    jwk = certs.keys.find((k) => k.kid === kid);
  }
  return jwk || null;
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

  const jwk = await accessKey(team, header.kid);
  if (!jwk) return false;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) return false;

  const now = Date.now() / 1000;
  if (typeof payload.exp !== "number" || payload.exp < now) return false;
  if (typeof payload.nbf === "number" && payload.nbf > now + 60) return false;
  if (payload.iss !== `https://${team}.cloudflareaccess.com`) return false;
  const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!auds.some((a) => allowed.includes(a))) return false;
  // People sign in with email; service tokens carry common_name and no email.
  return { email: typeof payload.email === "string" && payload.email ? payload.email : null };
}

# rker.me

Personal home page. A single static `index.html` plus supporting assets —
no build step, no framework.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | The page. Self-contained (CSS + JS inline). |
| `favicon.svg`, `apple-touch-icon.png`, `icon-192/512.png` | Icons. |
| `site.webmanifest` | PWA manifest. |
| `og.png` | 1200×630 social share image. |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Crawler / SEO / LLM discovery. |
| `_headers` | Security headers (Cloudflare Pages syntax). |
| `fonts.css`, `fonts/` | Self-hosted Space Grotesk / Space Mono (woff2, SIL OFL). |
| `tools/` | Browser-side calculators. `displacement.js` holds the maths; run its tests with `node --test tools/displacement.test.mjs`. |
| `log/` | Tennis Fitness Tracker (private, see below). |
| `pwa/tennis-fitness/` | The tracker's app manifest and icons (public so the browser can fetch them). |
| `worker/index.js` | Cloudflare Worker: serves the site and the tracker's private API. |
| `wrangler.jsonc` | Cloudflare config: Worker entry, static assets, Durable Object storage, Access settings. |

## Editing

Search the source for `EDIT ME` — tagline, name in the JSON-LD, and social links.

## Deploy

Connected to <host> for continuous deploys: push to `main` and the live
site rebuilds automatically. `index.html` is the entry point; all other
files sit at the site root.

## Tennis Fitness Tracker (`/log`)

A private, installable training log. Cloudflare Access protects `/log` and
`/api/log`; the Worker also verifies the Access token itself.

- **Storage:** one SQLite-backed Durable Object (`LogStore`) with a single
  `docs` table holding JSON documents in three collections: `sessions`,
  `body` and `play`.
- **API:** `GET /api/log` (everything), `POST /api/log/batch` (queued
  changes from the app), `POST /api/log/ingest` (Health Auto Export
  workouts; tennis only). A service token may only call `ingest`.
- **App:** `log/app.js` saves changes on the phone first and syncs them in
  batches; `log/sw.js` keeps the app shell available offline.

**When changing `log/app.js`, `log/app.css` or the fonts:** bump the `?v=`
number in `log/index.html` and the matching `VERSION` and `?v=` entries in
`log/sw.js`, so installed copies pick up the new files.

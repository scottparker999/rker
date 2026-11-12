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
  changes from the app), `POST /api/log/ingest` (Health Auto Export: tennis
  workouts go to `play`; if the export includes Weight, each day's last
  reading fills that day's bodyweight in `body` without replacing a weight
  typed in by hand). A service token may only call `ingest`.
- **App:** `log/app.js` holds the screens, sync and reminders. The logic with
  no screen attached lives in `log/lib/`: `plan.js` (the programme and
  exercise instructions), `plates.js` (what the dumbbells can be loaded to),
  `strength.js` (progress maths), `rotation.js` (which workout is due; also
  used by the Worker's reminder), `charts.js`, `format.js`, `dom.js`.
  Changes are saved on the phone first and synced in batches; `log/sw.js`
  keeps the app shell available offline.
- **Reminders:** a daily scheduled run (22:00 UTC = 8am Brisbane) sends a Web
  Push notification on training days. `worker/push.js` does the VAPID signing
  and message encryption with WebCrypto; the server's push key is created in
  and never leaves the Durable Object.
  The app re-registers its subscription on every launch, and the Worker keeps the
  result of the last send (`GET /api/log/push` → `last`), which the Progress tab
  shows, so a refused or expired push is visible instead of silent.

**Tests and versions.** `node scripts/build.mjs --check` runs every test
(`worker/*.test.mjs`, `log/lib/*.test.mjs`). The same script runs before each
deploy (`"build"` in `wrangler.jsonc`): a failing test stops the deploy, and
it stamps the tracker's files with a version taken from their contents
(`?v=` on every script and style, the service worker's cache name and file
list), so installed copies pick up changes with nothing to bump by hand. In
the repository those stamps read `dev`. `pwa/tennis-fitness/version.json`
(written by the build, public) shows which build is live.

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

## Editing

Search the source for `EDIT ME` — tagline, name in the JSON-LD, and social links.

## Deploy

Connected to <host> for continuous deploys: push to `main` and the live
site rebuilds automatically. `index.html` is the entry point; all other
files sit at the site root.

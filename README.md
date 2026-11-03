# Thirumalai Properties: Blog Admin & CMS

Admin panel at **https://blog.thirumalaiproperties.com**, where staff write and publish blog articles and manage SEO for **https://thirumalaiproperties.com**.

The public blog itself is part of the main website (`/blog/`, repository `mailthirumalaiproperties-sketch/thirumalaiproperties.com`). This repository holds the admin and its API.

```
admin/    React admin panel (Vite + Tailwind + TipTap editor) → GitHub Pages
worker/   CMS API (Cloudflare Worker + Hono + D1 database)     → Cloudflare, free plan
scripts/  One-time import of the starter articles
```

## What the admin does

- **Articles:** rich-text editor, cover images, categories, tags, drafts → review → publish, unpublish, delete
- **SEO per article:** SEO title, meta description, focus keyword, URL, social image, canonical, noindex, Google preview, SEO checklist
- **Website SEO:** title, description, social image and noindex for every main-site page (Home, Properties, …, Blog)
- **Site settings** (admins): business details (used for Google structured data), title suffix, default description and image
- **Images:** upload (auto-resized to WebP), alt text, reuse
- **Users & roles:** Admin, Editor, Writer; temporary passwords with forced change; deactivate; password reset
- **Activity log** and **website update status** (shows the main site's GitHub Actions build)

| Role | Can |
|---|---|
| Writer | Create and edit own drafts, upload images, submit for review |
| Editor | Everything a writer can, plus edit/publish/unpublish any article, categories, page SEO, start a website update |
| Admin | Everything, plus users, site settings, activity log |

Publishing calls GitHub's API to start the main site's "Build and deploy website" workflow. The site is live about 2 minutes later.

## Security notes

- Passwords: PBKDF2-SHA256 with per-user salt and a server-side pepper (`PASSWORD_PEPPER` secret). Minimum 10 characters.
- Login lockout: 5 failures per email + network, 30 per network, 15 minutes.
- Sessions: random tokens (only their SHA-256 hash is stored), 12-hour expiry, revoked on password change and deactivation.
- Only `ALLOWED_ORIGINS` (the admin domain) can call the authenticated API from a browser.
- Uploaded files are checked by their content (JPEG/PNG/WebP/GIF only; SVG is refused).
- Article HTML is sanitized again when the main site is built.
- Drafts and articles in review are never exposed by the public endpoint.

## Local development

```bash
# API (http://127.0.0.1:8787) – uses a local SQLite copy of D1
cd worker
npm install
cp .dev.vars.example .dev.vars        # then edit the values
npm run db:migrate:local
npm run dev

# Admin (http://localhost:5173)
cd admin
npm install
VITE_API_URL=http://127.0.0.1:8787 npm run dev
```

On first visit the admin shows **First-time setup**. Enter the `SETUP_TOKEN` from `.dev.vars` to create the first admin.

## Production setup (one time)

1. **Cloudflare** (free account): `cd worker && npx wrangler login`
2. Create the database and put its id in `worker/wrangler.jsonc`:
   `npx wrangler d1 create thirumalai-cms`
3. Create tables: `npm run db:migrate:remote`
4. Secrets (`npx wrangler secret put <NAME>`):
   - `PASSWORD_PEPPER`: long random string. **Never change it** (existing passwords would stop working).
   - `SETUP_TOKEN`: one-time code for creating the first admin.
   - `GITHUB_TOKEN`: fine-grained token from the account that owns `thirumalaiproperties.com`, limited to that one repository, permission **Actions: Read and write**.
5. Deploy: `npm run deploy`. Note the `https://thirumalai-cms-api.<account>.workers.dev` URL.
6. In **both** GitHub repositories set the Actions variable `CMS_API_URL` to that URL.
7. This repository: Pages source **GitHub Actions**, custom domain `blog.thirumalaiproperties.com`.
8. Main site repository: Pages source **GitHub Actions** (see its README).
9. Open the admin, complete first-time setup, then import the starter articles:
   `cd scripts && npm install && node import-starter-posts.mjs` (with `CMS_API_URL`, `CMS_EMAIL`, `CMS_PASSWORD` set).

## Backups

`npx wrangler d1 export thirumalai-cms --remote --output backup.sql` exports the database. D1 Time Travel can also restore the database to any point in the recent past (7 days on the free plan): `npx wrangler d1 time-travel restore thirumalai-cms --timestamp=<ISO time>`.

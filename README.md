# Thirumalai Properties: Blog Admin & CMS

Admin panel at **https://blog.thirumalaiproperties.com**, where staff write and publish blog articles and manage SEO for **https://thirumalaiproperties.com**.

The public blog is part of the main website (`/blog/`, repository [`mailthirumalaiproperties-sketch/thirumalaiproperties.com`](https://github.com/mailthirumalaiproperties-sketch/thirumalaiproperties.com)). This repository holds the admin panel and its API.

> **This repository is public.** Never commit passwords, tokens or secret values. Everything secret lives in Cloudflare or GitHub settings, and the logins for those accounts stay with the owner (see [Accounts](#accounts-and-who-holds-the-logins)).

**Contents:** [Live system](#live-system-at-a-glance) · [Architecture](#how-it-fits-together) · [Accounts](#accounts-and-who-holds-the-logins) · [Keys, tokens and settings](#keys-tokens-and-settings) · [Local development](#local-development) · [Deploying changes](#deploying-changes) · [Setup from zero](#production-setup-from-zero) · [Runbooks](#runbooks) · [Backups](#backups-and-restore) · [Rollback](#rollback) · [Troubleshooting](#troubleshooting) · [Limits](#limits-free-plans) · [Security](#security-notes) · [API reference](#api-reference)

## Live system at a glance

| Part | Where | Details |
|---|---|---|
| Admin panel | GitHub Pages (this repo, `main`) | https://blog.thirumalaiproperties.com, built by `.github/workflows/deploy-admin.yml` |
| CMS API | Cloudflare Worker `thirumalai-cms-api` | https://thirumalai-cms-api.thirumalai-cms-api.workers.dev (health: `/api/health`) |
| Database | Cloudflare D1 `thirumalai-cms` (region APAC) | id in `worker/wrangler.jsonc`; images and PDFs are stored inside it |
| Main website | GitHub Pages (main site repo) | https://thirumalaiproperties.com, rebuilt by GitHub Actions on publish and nightly |
| DNS | Hostinger (`ns1/ns2.dns-parking.com`) | `blog` CNAME → `mailthirumalaiproperties-sketch.github.io` (full list in the main site README) |

Went live on 2026-11-03. Everything runs on free plans and needs no server or PC to stay on.

## How it fits together

```
 Staff browser
      │  https://blog.thirumalaiproperties.com  (admin/, static files on GitHub Pages)
      ▼
 CMS API: Cloudflare Worker (worker/) ── D1 database: users, articles, images, PDFs, SEO, settings
      │  on publish / "Update website now": calls GitHub's API (GITHUB_TOKEN)
      ▼
 Main site repo: "Build and deploy website" workflow
      │  downloads published content from /api/public/content, pre-renders every page
      ▼
 https://thirumalaiproperties.com  (GitHub Pages)
```

The main site also rebuilds every night at 03:00 IST, so published articles still appear if the GitHub token ever stops working.

```
admin/          React admin panel (Vite + Tailwind + TipTap editor)
  public/posts/   Redirects from the old blog URLs (/posts/<slug>/) to thirumalaiproperties.com/blog/<slug>/
worker/         CMS API (Cloudflare Worker + Hono + D1)
  migrations/     Database schema (0001) and default content (0002)
  wrangler.jsonc  Worker name, D1 binding, non-secret settings
scripts/        One-time import of the starter articles (starter-content/)
```

## What the admin does

- **Articles:** rich-text editor, cover images, categories, tags, drafts → review → publish, unpublish, delete
- **Media in articles:** images (auto-resized to WebP, max 1600 px), **YouTube videos** (paste a link; embedded with youtube-nocookie.com) and **PDF downloads** (max 1.9 MB)
- **SEO per article:** SEO title, meta description, focus keyword, URL, social image, canonical, noindex, Google preview, SEO checklist
- **Website SEO:** title, description, social image and noindex for every main-site page (Home, Properties, …, Blog)
- **Site settings** (admins): business details (used for Google structured data), title suffix, default description and image
- **Users & roles:** Admin, Editor, Writer; temporary passwords with forced change; deactivate; password reset; delete (their articles and files move to another user)
- **Activity log** and **website update status** (shows the main site's latest GitHub Actions build)

| Role | Can |
|---|---|
| Writer | Create and edit own drafts, upload files, submit for review |
| Editor | Everything a writer can, plus edit/publish/unpublish any article, categories, page SEO, start a website update |
| Admin | Everything, plus users, site settings, activity log |

## Accounts and who holds the logins

No login or secret value is stored in this repository. The owner (Thirumalai Properties) keeps these logins, ideally in a password manager:

| Account | Used for | Notes |
|---|---|---|
| GitHub `mailthirumalaiproperties-sketch` | Both repositories, GitHub Pages, the `GITHUB_TOKEN` | Owner of both repos |
| Cloudflare (signed up with the business Gmail address) | Worker, D1 database, Worker secrets | Free plan |
| Hostinger | Domain and DNS for thirumalaiproperties.com | Do not move DNS to Cloudflare's proxy: it broke GitHub's certificate renewal in 2026 (see `THIRUMALAI_DOMAIN_SSL_AUDIT.md` in the main site repo) |
| CMS admin user(s) | Logging in to the admin panel | Created in the admin itself; passwords are hashed and cannot be read back |

A new developer needs: collaborator access to both GitHub repos, and a Cloudflare API token from the owner (or membership of the Cloudflare account). They never need the owner's personal passwords.

## Keys, tokens and settings

Every value the system uses, where it lives, and what happens without it.

### Summary

| Name | Kind | Lives in | Needed for | If missing or wrong |
|---|---|---|---|---|
| `PASSWORD_PEPPER` | Worker **secret** | Cloudflare | Hashing and checking every password | Nobody can log in. **Never change it** |
| `GITHUB_TOKEN` | Worker **secret** | Cloudflare | Rebuilding the main site on publish | Admin shows "Not connected"; articles appear only after the nightly build |
| `SETUP_TOKEN` | Worker **secret** (temporary) | Cloudflare, only during first setup | Creating the very first admin | Normal; it is deleted after setup |
| `ALLOWED_ORIGINS` | Worker variable | `worker/wrangler.jsonc` | Which website may call the API from a browser | Admin shows network errors (CORS) |
| `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_WORKFLOW`, `GITHUB_REF` | Worker variables | `worker/wrangler.jsonc` | Which repo/workflow/branch to rebuild | Publishing can't start the rebuild |
| `DB` → `thirumalai-cms` | Worker D1 binding | `worker/wrangler.jsonc` (`database_id`) | All data | API fails |
| `CMS_API_URL` | GitHub Actions **variable** | **Both** repos | Admin build (API address) and main-site build (content source) | Admin build stops with an error; **main site builds with an empty blog** (see Troubleshooting) |
| `CLOUDFLARE_API_TOKEN` | Developer credential | Your own PC only | Deploying the Worker, migrations, secrets from the command line | Use `npx wrangler login` instead |
| `.dev.vars` | Local file (gitignored) | `worker/.dev.vars` on your PC | Local development only | Copy `worker/.dev.vars.example` |

### Worker variables (not secret)

In `worker/wrangler.jsonc` under `"vars"`, committed and deployed with the Worker:

```jsonc
"ALLOWED_ORIGINS": "https://blog.thirumalaiproperties.com",   // comma-separated list, exact origins
"GITHUB_OWNER":    "mailthirumalaiproperties-sketch",
"GITHUB_REPO":     "thirumalaiproperties.com",
"GITHUB_WORKFLOW": "deploy.yml",                               // main site's workflow file
"GITHUB_REF":      "main"
```

Change them in the file, then deploy the Worker (`cd worker && npx wrangler deploy`).

### `PASSWORD_PEPPER` (Worker secret)

A long random string mixed into every password hash (HMAC) before PBKDF2. It keeps a stolen database useless on its own.

- **Create:** `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`, then store it as a secret (see [How to set a secret](#how-to-set-a-secret-safely)). Don't keep a copy anywhere else.
- **Never change or delete it.** Every existing password stops working. Cloudflare can't show its value, which is fine: nobody ever needs to read it.
- **If it was changed or lost:** set a new one, then follow [All admins locked out](#all-admins-locked-out-or-a-forgotten-password-with-no-other-admin) to give one admin a temporary password; that admin then resets everyone else from the Users page.

### `GITHUB_TOKEN` (Worker secret)

A GitHub **fine-grained personal access token** that lets the API start the main site's "Build and deploy website" workflow.

- **Current token:** "Thirumalai CMS publish", created 2026-11-03 on the `mailthirumalaiproperties-sketch` account, no expiration.
- **Create or replace:** while logged in to GitHub as `mailthirumalaiproperties-sketch`, open https://github.com/settings/personal-access-tokens/new:
  - Resource owner: `mailthirumalaiproperties-sketch`
  - Repository access: **Only select repositories** → `thirumalaiproperties.com` (only that one)
  - Permissions → Repositories → **Actions: Read and write** (Metadata: Read-only is added automatically). Nothing else.
  - Generate, copy it once (it starts with `github_pat_`), and store it as the `GITHUB_TOKEN` secret.
- **Regenerate an existing one:** on https://github.com/settings/personal-access-tokens open the token, then **Regenerate token**. Update the Cloudflare secret straight away; the old value stops working.
- **Check it:** in the admin, the Dashboard's "Public website" card shows the latest build. Or run `curl -H "Authorization: Bearer <token>" https://api.github.com/repos/mailthirumalaiproperties-sketch/thirumalaiproperties.com/actions/workflows/deploy.yml`: 200 means it works.
- **Revoke:** delete it on the GitHub tokens page and delete the secret (`npx wrangler secret delete GITHUB_TOKEN`). The site then updates only nightly.

### `SETUP_TOKEN` (temporary Worker secret)

A one-time code typed on the admin's **First-time setup** page. It only works while the database has no users.

- Set it just before first setup (any hard-to-guess code, for example `ABCD-EFGH-JKMN`), create the first admin, then delete it: `npx wrangler secret delete SETUP_TOKEN`.
- In production it was deleted after setup on 2026-11-03. Adding more users is done from the admin's Users page, not with this code.

### `CMS_API_URL` (GitHub Actions variable, both repos)

The API's address, `https://thirumalai-cms-api.thirumalai-cms-api.workers.dev`. It's public (it's visible in the admin's JavaScript), so it's a **variable**, not a secret.

- Set in each repo under **Settings → Secrets and variables → Actions → Variables**:
  - This repo: https://github.com/mailthirumalaiproperties-sketch/Blog.thirumalaiproperties/settings/variables/actions
  - Main site: https://github.com/mailthirumalaiproperties-sketch/thirumalaiproperties.com/settings/variables/actions
- This repo bakes it into the admin at build time (`VITE_API_URL`). The main site reads content from it at build time.
- **If the API address changes** (for example a custom domain such as `api.thirumalaiproperties.com`), update both variables, then rebuild both sites: Actions → "Deploy admin to GitHub Pages" → **Run workflow**, and the same for "Build and deploy website" in the main site repo.

### `CLOUDFLARE_API_TOKEN` (developer credential, your PC only)

Wrangler (the Cloudflare CLI) needs to be logged in for `deploy`, `d1 … --remote` and `secret` commands. Two ways:

1. **`npx wrangler login`**: opens a browser and you click **Allow**. If it fails with "No CSRF value available in the session cookie", which happened in one Chrome profile, use option 2.
2. **API token** (works everywhere): Cloudflare dashboard → **My Profile → API Tokens → Create Token** → template **Edit Cloudflare Workers** → **+ Add more: Account / D1 / Edit** → Account Resources: the Thirumalai account → Zone Resources: All zones → choose an expiry → Create. Then make it available to Wrangler:
   ```powershell
   # Windows PowerShell: saves it for your Windows user; paste at the prompt (not in chat or files)
   [Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', (Read-Host 'Cloudflare token'), 'User')
   # open a new terminal, then:
   npx wrangler whoami
   ```
   ```bash
   # macOS/Linux, current terminal only
   read -rs CLOUDFLARE_API_TOKEN && export CLOUDFLARE_API_TOKEN && npx wrangler whoami
   ```
   When you're done, delete the token in Cloudflare. In PowerShell, remove it with `[Environment]::SetEnvironmentVariable('CLOUDFLARE_API_TOKEN', $null, 'User')`.

The live system never uses this token. Deleting it changes nothing for the websites.

### How to set a secret safely

Pick one; all three store the exact value and never print it:

- **Cloudflare dashboard:** Workers & Pages → `thirumalai-cms-api` → Settings → Variables and Secrets → Add (type **Secret**) or edit.
- **Wrangler, interactive:** `cd worker && npx wrangler secret put GITHUB_TOKEN`, then paste at the prompt.
- **Cloudflare REST API:** `PUT https://api.cloudflare.com/client/v4/accounts/<account_id>/workers/scripts/thirumalai-cms-api/secrets` with JSON `{"name":"GITHUB_TOKEN","text":"<value>","type":"secret_text"}`.

> **Windows PowerShell 5.1 pitfall:** don't *pipe* a value into Wrangler (`"value" | npx wrangler secret put X`). PowerShell can add an invisible byte-order mark to the start, so the stored secret no longer matches what people type. This happened with `SETUP_TOKEN` during go-live. Use one of the three methods above.

`npx wrangler secret list` shows the secret **names** currently set. Values can't be read back.

### Local development values (`worker/.dev.vars`)

```
PASSWORD_PEPPER="any-long-random-string-for-local-use"
SETUP_TOKEN="local-setup-code"
ALLOWED_ORIGINS="http://localhost:5173"
# GITHUB_TOKEN=""   # optional; leave unset so local publishing doesn't rebuild the live site
```

`.dev.vars` is gitignored. Never put production values in it.

## Local development

```bash
# API (http://127.0.0.1:8787) – uses a local SQLite copy of D1 under worker/.wrangler/
cd worker
npm install
cp .dev.vars.example .dev.vars        # then edit the values
npm run db:migrate:local
npm run dev

# Admin (http://localhost:5173)
cd admin
npm install
VITE_API_URL=http://127.0.0.1:8787 npm run dev    # PowerShell: $env:VITE_API_URL="http://127.0.0.1:8787"; npm run dev
```

On first visit the admin shows **First-time setup**. Enter the `SETUP_TOKEN` from `.dev.vars`.

Tips:
- Open the admin at `http://localhost:5173`, not `127.0.0.1`. YouTube refuses to play embeds on raw-IP pages ("video unavailable").
- Checks before pushing: `cd admin && npm run lint && npm run build`.
- On Windows, stopping `wrangler dev` from some task runners leaves `workerd.exe` running and holding the port. A "fresh" restart then silently talks to the old instance. Check with `Get-NetTCPConnection -LocalPort 8787` and stop the leftover process.

## Deploying changes

| Change | How it goes live |
|---|---|
| Admin (`admin/**`) | Push to `main`. "Deploy admin to GitHub Pages" builds and publishes (about 1 minute). Other paths don't trigger it; run it by hand from the Actions tab if needed. |
| API code (`worker/src/**`) | `cd worker && npx wrangler deploy`. Pushing does **not** deploy the Worker. |
| Database schema | Add `worker/migrations/000N_name.sql`, then `npm run db:migrate:local` to test and `npm run db:migrate:remote` for production. Back up first (see [Backups](#backups-and-restore)). |
| Worker variables (`wrangler.jsonc`) | `npx wrangler deploy` |
| Worker secrets | See [How to set a secret](#how-to-set-a-secret-safely). Takes effect immediately, no deploy needed. |

Worker deploy checklist: test locally, run `npx wrangler deploy`, check `curl https://thirumalai-cms-api.thirumalai-cms-api.workers.dev/api/health` returns `{"ok":true}`, log in to the admin and open an article. Logs: Cloudflare dashboard → Worker → Observability, or `npx wrangler tail` for a live stream.

## Production setup from zero

Only needed to rebuild everything on new accounts. The current production system is already set up.

1. **Cloudflare:** create a free account, then authenticate Wrangler (see [`CLOUDFLARE_API_TOKEN`](#cloudflare_api_token-developer-credential-your-pc-only)).
2. **Database:** `cd worker && npx wrangler d1 create thirumalai-cms --location apac`, then put the printed id in `wrangler.jsonc` (`database_id`) and commit.
3. **Tables and defaults:** `npm run db:migrate:remote`. This creates 3 categories, SEO for 7 pages and the site settings.
4. **First deploy with secrets:** create a JSON file *outside the repo*, for example `{"PASSWORD_PEPPER":"<random>","SETUP_TOKEN":"<one-time code>"}`, then run `npx wrangler deploy --secrets-file <that file>` and delete the file. On a new account Wrangler first asks for (or picks) a `workers.dev` subdomain; the API address becomes `https://thirumalai-cms-api.<subdomain>.workers.dev`.
5. **Check:** `/api/health` returns `{"ok":true}` and `/api/auth/setup` returns `{"needsSetup":true}`.
6. **GitHub variables:** set `CMS_API_URL` in both repos ([details](#cms_api_url-github-actions-variable-both-repos)).
7. **Admin hosting:** in this repo, Settings → Pages → Source **GitHub Actions**. Push to `main` (or run the workflow), then set custom domain `blog.thirumalaiproperties.com` and tick **Enforce HTTPS**. DNS needs a `blog` CNAME pointing to `<github-user>.github.io`.
8. **First admin:** open the admin, enter the setup code, name, email and password. Then remove the code: `npx wrangler secret delete SETUP_TOKEN`.
9. **Starter articles** (optional): `cd scripts && npm install`, then set `CMS_API_URL` and either `CMS_EMAIL` + `CMS_PASSWORD` or `CMS_TOKEN` (an admin session token) and run `node import-starter-posts.mjs`. Existing slugs are skipped, so it's safe to re-run.
10. **Automatic site updates:** create the fine-grained token and store it as `GITHUB_TOKEN` ([details](#github_token-worker-secret)).
11. **Main site:** follow the main site README (Pages source **GitHub Actions**, push `main`).

## Runbooks

### Add, deactivate or delete a user
Admin → **Users**. New users get a temporary password, which the admin shares privately, and must choose their own at first login. **Deactivate** blocks login but keeps everything. **Delete** removes the account; their articles and files move to a user you choose. Published bylines don't change.

### Someone forgot their password (another admin exists)
Admin → Users → **Reset password**. A temporary password is shown once; they must change it at next login.

### Locked out after wrong passwords
After 5 failures for the same email from the same network, or 30 from one network, login is blocked for 15 minutes. Wait, or clear the counters:
`npx wrangler d1 execute DB --remote --command "DELETE FROM login_attempts"`

### All admins locked out, or a forgotten password with no other admin
Passwords can't be set directly in the database, because the hash depends on `PASSWORD_PEPPER`. Instead, create a 10-minute session for the admin and use the API's reset endpoint:

```bash
cd worker
# 1. A one-time session token and its SHA-256 hash (keep the token private)
node -e "const c=require('crypto');const t=c.randomBytes(32).toString('base64url');console.log('TOKEN='+t+'\nHASH='+c.createHash('sha256').update(t).digest('hex'))"
# 2. The admin's user id
npx wrangler d1 execute DB --remote --command "SELECT id, email, active FROM users WHERE role = 'admin'"
# 3. A session that expires in 10 minutes
npx wrangler d1 execute DB --remote --command "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ('<HASH>', '<USER_ID>', strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now','+10 minutes'))"
# 4. Give the admin a temporary password (10+ characters). This also deletes all their sessions, including the one above.
curl -X POST "https://thirumalai-cms-api.thirumalai-cms-api.workers.dev/api/users/<USER_ID>/reset-password" \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{"password":"<temporary-password>"}'
```

Share the temporary password privately; the admin must choose a new one at login.

Before step 3, check the account's state; the session from step 3 is refused otherwise:
- **Deactivated:** `UPDATE users SET active = 1 WHERE id = '<USER_ID>'`
- **Still on a temporary password** (`must_change_password = 1`, for example a temporary password they also forgot): `UPDATE users SET must_change_password = 0 WHERE id = '<USER_ID>'`. Step 4 sets it back to 1.

### Change a user's login email or name
The admin panel can change roles but not emails. Use SQL; emails are unique and case-insensitive:
`npx wrangler d1 execute DB --remote --command "UPDATE users SET email = 'new@example.com', name = 'New Name', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE email = 'old@example.com'"`

### Rotate the GitHub token
Regenerate it on GitHub, update the `GITHUB_TOKEN` secret, then press **Update website now** in the admin to confirm ([details](#github_token-worker-secret)).

### Publish happened but the website didn't change
Check the main site repo's **Actions** tab. If no run started, `GITHUB_TOKEN` is missing, expired or revoked: replace it. If a run failed, open it. "CMS fetch failed" means the API was unreachable, and the live site stays on its previous version.

## Backups and restore

- **Export** (includes images and PDFs, which are stored in the database): `cd worker && npx wrangler d1 export thirumalai-cms --remote --output backup-YYYY-MM-DD.sql`. Keep exports private: they contain user emails and password hashes.
- **Time Travel** (point-in-time restore, last 7 days on the free plan): `npx wrangler d1 time-travel info thirumalai-cms`, then `npx wrangler d1 time-travel restore thirumalai-cms --timestamp=<ISO time>`.
- Back up before every schema migration.

## Rollback

| What | How |
|---|---|
| Admin panel | `git revert` the bad commit(s) on `main` and push. If no `admin/**` file changed, run "Deploy admin to GitHub Pages" by hand. |
| API code | `cd worker && npx wrangler deployments list`, then `npx wrangler rollback <version-id>`. Or redeploy an older commit. |
| Data | D1 Time Travel or a SQL export (above) |
| Main website | See the main site README (switch Pages back to the `gh-pages` branch) |

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Admin: "Failed to fetch" / network error on every action | API down or CORS. Check `/api/health`; `ALLOWED_ORIGINS` must contain exactly `https://blog.thirumalaiproperties.com` (no trailing slash). |
| Dashboard "Public website: Not connected" | `GITHUB_TOKEN` secret missing. Add it. |
| "Too many failed attempts" | See [Locked out](#locked-out-after-wrong-passwords). |
| Setup page says "The setup code is not correct" with the right code | The secret has hidden characters (see the PowerShell pitfall). Set it again from the dashboard. |
| "File is too large (max 1.9 MB)" | D1 rows are limited to about 2 MB. Compress the PDF, or upload a smaller image. Big videos go on YouTube. |
| Admin build fails "Set the CMS_API_URL repository variable" | Add the variable in this repo. |
| Main site deployed with an **empty blog** | `CMS_API_URL` is missing in the main site repo: the build then uses defaults on purpose. Add it and rebuild. |
| `wrangler login` fails with "No CSRF value…" | Use an API token instead. |
| Local YouTube player shows "video unavailable" | You opened the page via `127.0.0.1`; use `localhost`. |

## Limits (free plans)

These are approximate; check Cloudflare's and GitHub's current pricing pages.

- **Cloudflare Workers Free:** about 100,000 API requests per day. The public site doesn't call the API at all (it's pre-rendered), so only admin use and builds count.
- **Cloudflare D1 Free:** 5 GB storage; daily row read and write quotas far above this site's needs. Images and PDFs count toward storage.
- **Uploads:** 1.9 MB per file, images auto-converted to WebP at most 1600 px wide.
- **GitHub Pages / Actions:** public repos have free Actions minutes; Pages has a soft limit of about 100 GB bandwidth per month.

## Security notes

- Passwords: PBKDF2-SHA256 with per-user salt and a server-side pepper (`PASSWORD_PEPPER`). Minimum 10 characters.
- Login lockout: 5 failures per email + network, 30 per network, 15 minutes.
- Sessions: random tokens (only their SHA-256 hash is stored), 12-hour expiry, revoked on password change, reset, deactivation and deletion.
- Only `ALLOWED_ORIGINS` can call the authenticated API from a browser. `/api/public/*` is read-only and returns published content only.
- Uploads are checked by content, not file name: JPEG, PNG, WebP, GIF and PDF only; SVG and anything else is refused. PDFs are served as downloads.
- Only YouTube embeds are allowed in articles. The main site's build sanitizes all article HTML again and rebuilds every embed with fixed, safe attributes.
- Drafts and articles in review are never exposed publicly.
- `GITHUB_TOKEN` is limited to the main site repo's Actions: it can start, re-run or cancel workflow runs there, but can't change code, settings or other repositories.

## API reference

All routes are under `/api`. Everything except `/api/health`, `/api/public/*` and login/setup requires `Authorization: Bearer <session token>`.

| Area | Routes |
|---|---|
| Health | `GET /health` |
| Auth | `GET/POST /auth/setup`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password` |
| Articles | `GET/POST /posts`, `GET/PUT/DELETE /posts/:id`, `POST /posts/:id/submit`, `/publish`, `/unpublish` |
| Categories | `GET/POST /categories`, `PUT/DELETE /categories/:id` |
| Media | `GET/POST /media` (multipart upload), `PUT/DELETE /media/:id` |
| SEO & settings | `GET /seo/pages`, `PUT /seo/pages/:key`, `GET /seo/settings`, `PUT /seo/settings/:key` |
| Users (admin) | `GET/POST /users`, `PUT/DELETE /users/:id` (`?transferTo=<id>`), `POST /users/:id/reset-password` |
| Site | `GET /site/dashboard`, `GET /site/activity` (admin), `GET/POST /site/deploy` (status / start rebuild) |
| Public (no login, CORS `*`) | `GET /public/content` (published articles, categories, page SEO, settings), `GET /public/media/:id` |

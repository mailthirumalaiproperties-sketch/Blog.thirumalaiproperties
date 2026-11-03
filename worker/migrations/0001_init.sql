-- Thirumalai Properties CMS schema (Cloudflare D1 / SQLite)

CREATE TABLE users (
  id                   TEXT PRIMARY KEY,
  email                TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name                 TEXT NOT NULL,
  role                 TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'writer')),
  password_hash        TEXT NOT NULL,
  password_salt        TEXT NOT NULL,
  active               INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL,
  last_login_at        TEXT
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Brute-force protection for /auth/login, keyed by "email:<x>" and "ip:<x>"
CREATE TABLE login_attempts (
  key          TEXT PRIMARY KEY,
  failures     INTEGER NOT NULL,
  window_start INTEGER NOT NULL,
  locked_until INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE categories (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  seo_title       TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

-- Images are stored inline (max ~1.9 MB each, enforced by the API)
CREATE TABLE media (
  id          TEXT PRIMARY KEY,
  filename    TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL,
  width       INTEGER,
  height      INTEGER,
  alt         TEXT NOT NULL DEFAULT '',
  data        BLOB NOT NULL,
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_media_created ON media(created_at);

CREATE TABLE posts (
  id              TEXT PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  title           TEXT NOT NULL,
  excerpt         TEXT NOT NULL DEFAULT '',
  content_html    TEXT NOT NULL DEFAULT '',
  cover_media_id  TEXT REFERENCES media(id) ON DELETE SET NULL,
  cover_alt       TEXT NOT NULL DEFAULT '',
  category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
  tags            TEXT NOT NULL DEFAULT '[]',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  author_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name     TEXT NOT NULL DEFAULT '',
  seo_title       TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  focus_keyword   TEXT NOT NULL DEFAULT '',
  canonical_url   TEXT NOT NULL DEFAULT '',
  noindex         INTEGER NOT NULL DEFAULT 0,
  og_media_id     TEXT REFERENCES media(id) ON DELETE SET NULL,
  published_at    TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_posts_status ON posts(status, published_at);

-- SEO for the main website's pages (home, properties, blog, ...)
CREATE TABLE page_seo (
  page_key    TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  path        TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  og_media_id TEXT REFERENCES media(id) ON DELETE SET NULL,
  noindex     INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT,
  updated_by  TEXT REFERENCES users(id) ON DELETE SET NULL
);

-- Site-wide settings stored as JSON values
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE activity (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  user_name  TEXT,
  action     TEXT NOT NULL,
  entity     TEXT,
  entity_id  TEXT,
  detail     TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_activity_created ON activity(created_at);

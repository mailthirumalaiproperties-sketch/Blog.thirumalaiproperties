# Thirumalai Properties Blog

Source for **https://blog.thirumalaiproperties.com**, the blog of [Thirumalai Properties](https://thirumalaiproperties.com).

Built with React (Next.js, static export) and Tailwind CSS. Every article is rendered to its own HTML page at build time, so search engines can read it. The site is hosted on GitHub Pages and deploys automatically on every push to `main`.

This blog is separate from the main website repository. The two sites only link to each other.

## Writing a new article

1. Create a file in `content/posts/`. The file name becomes the URL, so use lowercase words joined by hyphens:

   `content/posts/how-to-check-guideline-value.md` → `https://blog.thirumalaiproperties.com/posts/how-to-check-guideline-value/`

2. Start the file with this header block, then write the article in [Markdown](https://www.markdownguide.org/basic-syntax/):

   ```markdown
   ---
   title: "How to Check the Guideline Value of a Property"
   description: "One or two sentences shown in search results and on the article card."
   date: 2026-11-15
   category: Buying Guide
   tags: [guideline value, stamp duty]
   cover: /images/covers/my-image.webp
   coverAlt: "Short description of the image"
   ---

   Your article starts here...

   ## A section heading

   More text...
   ```

   - `title`, `description`, `date` and `category` are required.
   - `category` can be an existing one (`Buying Guide`, `NRI Corner`, `Registration & Documents`) or a new name, which creates a new category page automatically.
   - `cover` is optional. Put images in `public/images/covers/`, ideally WebP around 1024×800 and under 200 KB.
   - Add `updated: 2026-12-01` when you revise an article.
   - Add `draft: true` to keep an article out of the published site.

3. Commit and push to `main`. The site rebuilds and goes live in about two minutes (see the **Actions** tab).

## Running it locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev      # http://localhost:3000, with live reload while you edit
npm run build    # produces the static site in ./out
npm run lint
```

## Project layout

```
content/posts/          Articles (Markdown)
public/images/          Logos and cover images
src/app/                Pages: home, /posts/[slug], /category/[category], sitemap, robots, 404
src/components/         Header, Footer, PostCard, CtaBox (call-to-action to the main site)
src/lib/posts.js        Reads and parses the Markdown articles
src/lib/site.js         Business details (phone, WhatsApp, address, links); edit here once
.github/workflows/      GitHub Pages deployment
```

## Hosting setup (already configured once)

- GitHub → repository **Settings → Pages → Source: GitHub Actions**
- Custom domain: `blog.thirumalaiproperties.com`, with **Enforce HTTPS** on
- DNS at Hostinger: `CNAME blog → mailthirumalaiproperties-sketch.github.io`

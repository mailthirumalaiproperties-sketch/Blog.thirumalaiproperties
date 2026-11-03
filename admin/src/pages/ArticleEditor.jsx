import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MediaPicker from "../components/MediaPicker.jsx";
import RichEditor from "../components/RichEditor.jsx";
import { GooglePreview, SeoChecklist } from "../components/SeoTools.jsx";
import { Badge, Button, Card, CharCount, Checkbox, Field, Input, LoadingBlock, Notice, Select, Textarea } from "../components/ui.jsx";
import { api, mediaUrl, postUrl, SITE_URL } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { formatDate, slugify, STATUS, timeAgo } from "../lib/format.js";
import { Link, useRouter, useUnsavedChangesGuard } from "../lib/router.jsx";
import { DESCRIPTION_RANGE, effectiveDescription, effectivePostTitle, postSeoChecks, TITLE_RANGE } from "../lib/seo.js";

const EMPTY = {
  title: "",
  slug: "",
  excerpt: "",
  contentHtml: "",
  coverMediaId: null,
  coverAlt: "",
  categoryId: "",
  tags: [],
  authorName: "",
  seoTitle: "",
  seoDescription: "",
  focusKeyword: "",
  canonicalUrl: "",
  noindex: false,
  ogMediaId: null,
};
const EDITABLE_KEYS = Object.keys(EMPTY);

function ImageChooser({ mediaId, onChange, disabled, emptyLabel }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {mediaId ? (
        <img src={mediaUrl(mediaId)} alt="" className="w-full aspect-[16/10] object-cover rounded-lg border border-stone-200 bg-stone-100" />
      ) : (
        <div className="w-full aspect-[16/10] rounded-lg border-2 border-dashed border-stone-200 flex items-center justify-center text-xs text-stone-400">{emptyLabel}</div>
      )}
      {!disabled && (
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            {mediaId ? "Change" : "Choose image"}
          </Button>
          {mediaId && (
            <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </div>
      )}
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={({ media, alt }) => onChange(media.id, alt)} />
    </div>
  );
}

export default function ArticleEditor({ id }) {
  const isNew = id === "new";
  const { user, can } = useAuth();
  const { navigate } = useRouter();
  const [post, setPost] = useState(null); // last saved version from the server
  const [form, setForm] = useState(null); // what the user is editing
  const [categories, setCategories] = useState([]);
  const [titleSuffix, setTitleSuffix] = useState(" | Thirumalai Properties");
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const loadedId = useRef(null);

  useEffect(() => {
    api("/api/categories").then((d) => setCategories(d.categories)).catch(() => {});
    api("/api/seo/settings")
      .then((d) => d.settings.seo_defaults?.titleSuffix && setTitleSuffix(d.settings.seo_defaults.titleSuffix))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (loadedId.current === id) return; // e.g. after the first save of a new article
    loadedId.current = id;
    if (isNew) {
      setPost({ status: "draft", canEdit: true });
      setForm({ ...EMPTY, authorName: user.name });
      return;
    }
    setPost(null);
    api(`/api/posts/${id}`)
      .then((d) => {
        setPost(d.post);
        setForm(Object.fromEntries(EDITABLE_KEYS.map((k) => [k, d.post[k] ?? EMPTY[k]])));
        setTagsText(d.post.tags.join(", "));
        setSlugTouched(true);
      })
      .catch((e) => setNotice({ tone: "error", text: e.message }));
  }, [id, isNew, user.name]);

  const saved = useMemo(() => post && Object.fromEntries(EDITABLE_KEYS.map((k) => [k, post[k] ?? EMPTY[k]])), [post]);
  const dirty = Boolean(form && saved && (isNew ? form.title || form.contentHtml : JSON.stringify(form) !== JSON.stringify(saved)));
  useUnsavedChangesGuard(dirty);

  const update = useCallback((patch) => setForm((f) => ({ ...f, ...patch })), []);
  const onContent = useCallback((html) => setForm((f) => ({ ...f, contentHtml: html })), []);

  if (!post || !form) return notice ? <Notice tone="error">{notice.text}</Notice> : <LoadingBlock />;

  const readOnly = !post.canEdit;
  const status = post.status;
  const effectiveSlug = form.slug || slugify(form.title);
  const seo = postSeoChecks({ ...form, slug: effectiveSlug }, titleSuffix);

  async function save() {
    const body = { ...form, slug: effectiveSlug, expectedUpdatedAt: post.updatedAt };
    const data = isNew
      ? await api("/api/posts", { method: "POST", body })
      : await api(`/api/posts/${post.id}`, { method: "PUT", body });
    setPost(data.post);
    setForm(Object.fromEntries(EDITABLE_KEYS.map((k) => [k, data.post[k] ?? EMPTY[k]])));
    setSlugTouched(true);
    if (isNew) {
      loadedId.current = data.post.id;
      navigate(`/articles/${data.post.id}`, { replace: true, keepScroll: true });
    }
    return data.post;
  }

  async function run(label, action) {
    if (!form.title.trim()) {
      setNotice({ tone: "error", text: "Give the article a title first." });
      return;
    }
    setBusy(label);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    } finally {
      setBusy("");
    }
  }

  const onSave = () =>
    run("save", async () => {
      const p = await save();
      setNotice({
        tone: "success",
        text: p.status === "published" ? "Saved. The live article will update on the website in about 2 minutes." : "Saved.",
      });
    });

  const onSubmit = () =>
    run("submit", async () => {
      const p = dirty || isNew ? await save() : post;
      const data = await api(`/api/posts/${p.id}/submit`, { method: "POST" });
      setPost(data.post);
      setNotice({ tone: "success", text: "Submitted for review. An editor will check and publish it." });
    });

  const onPublish = () => {
    if (seo.score < 50 && !window.confirm(`The SEO checklist is only ${seo.score}% complete. Publish anyway?`)) return;
    run("publish", async () => {
      const p = dirty || isNew ? await save() : post;
      const data = await api(`/api/posts/${p.id}/publish`, { method: "POST" });
      setPost(data.post);
      setNotice({ tone: "success", text: "Published! It will appear on thirumalaiproperties.com/blog in about 2 minutes." });
    });
  };

  const onUnpublish = () => {
    const live = status === "published";
    if (live && !window.confirm("Take this article off the website? It will become a draft again.")) return;
    run("unpublish", async () => {
      const data = await api(`/api/posts/${post.id}/unpublish`, { method: "POST" });
      setPost(data.post);
      setNotice({ tone: "success", text: live ? "Unpublished. It will disappear from the website in about 2 minutes." : "Sent back to draft." });
    });
  };

  const onDelete = () => {
    if (!window.confirm(`Delete “${post.title}” permanently? This can't be undone.`)) return;
    run("delete", async () => {
      await api(`/api/posts/${post.id}`, { method: "DELETE" });
      loadedId.current = null;
      navigate("/articles", { replace: true }); // replace skips the unsaved-changes prompt
    });
  };

  const canPublish = can("posts.publish");
  const canDelete = !isNew && (can("posts.editAny") || (post.authorId === user.id && status !== "published"));

  return (
    <div className="flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/articles" className="text-sm font-semibold text-stone-500 hover:text-brand-gold shrink-0">
            ← Articles
          </Link>
          <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
          <span className="text-xs text-stone-500 truncate">
            {isNew ? "New article" : dirty ? "Unsaved changes" : `Saved ${timeAgo(post.updatedAt)}${post.updatedByName ? ` by ${post.updatedByName}` : ""}`}
          </span>
        </div>
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
            {canDelete && (
              <Button variant="danger" busy={busy === "delete"} onClick={onDelete}>
                Delete
              </Button>
            )}
            {canPublish && status !== "draft" && (
              <Button busy={busy === "unpublish"} onClick={onUnpublish}>
                {status === "published" ? "Unpublish" : "Send back to draft"}
              </Button>
            )}
            <Button variant={status === "published" ? "primary" : "secondary"} busy={busy === "save"} disabled={!dirty && !isNew} onClick={onSave}>
              {status === "published" ? "Update live article" : "Save draft"}
            </Button>
            {!canPublish && status === "draft" && (
              <Button variant="primary" busy={busy === "submit"} onClick={onSubmit}>
                Submit for review
              </Button>
            )}
            {canPublish && status !== "published" && (
              <Button variant="primary" busy={busy === "publish"} onClick={onPublish}>
                Publish
              </Button>
            )}
          </div>
        )}
      </div>

      {readOnly && (
        <Notice tone="info">
          {status === "published" ? "This article is published. Only editors and admins can change it." : "You can view this article but not edit it."}
        </Notice>
      )}
      {status === "review" && !canPublish && !readOnly && <Notice tone="warning">Waiting for an editor to review and publish. You can still make changes.</Notice>}
      {notice && (
        <Notice tone={notice.tone} onClose={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Main column */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <textarea
            aria-label="Article title"
            rows={1}
            className="w-full resize-none [field-sizing:content] bg-transparent font-serif text-3xl md:text-4xl leading-tight font-bold text-brand-dark placeholder:text-stone-300 focus:outline-none"
            placeholder="Article title"
            value={form.title}
            readOnly={readOnly}
            maxLength={160}
            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
            onChange={(e) => update({ title: e.target.value.replace(/\n/g, " "), ...(slugTouched ? {} : { slug: "" }) })}
          />
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <span className="text-stone-500">{SITE_URL.replace("https://", "")}/blog/</span>
            <input
              aria-label="URL slug"
              className="flex-1 min-w-48 rounded-md border border-transparent hover:border-stone-200 focus:border-brand-gold bg-transparent px-1.5 py-0.5 font-semibold text-stone-700 focus:outline-none"
              value={form.slug || slugify(form.title)}
              readOnly={readOnly}
              onChange={(e) => {
                setSlugTouched(true);
                update({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") });
              }}
              onBlur={() => update({ slug: slugify(form.slug) })}
            />
            {status === "published" && post.slug && (
              <a href={postUrl(post.slug)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-gold hover:underline">
                View live ↗
              </a>
            )}
          </div>
          {status === "published" && form.slug !== post.slug && (
            <Notice tone="warning">Changing the URL of a published article breaks existing links and resets its Google ranking.</Notice>
          )}
          <RichEditor value={form.contentHtml} onChange={onContent} editable={!readOnly} />
          <p className="text-xs text-stone-500">
            {seo.words} words · about {Math.max(1, Math.round(seo.words / 200))} min read
          </p>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5">
          <Card title="Article details">
            <div className="flex flex-col gap-4">
              <Field label="Summary" hint="Shown on the blog page under the title, and used as the Google description if you don't write one below." counter={<CharCount value={form.excerpt} range={[80, 200]} />}>
                {(fid) => <Textarea id={fid} rows={3} maxLength={400} readOnly={readOnly} value={form.excerpt} onChange={(e) => update({ excerpt: e.target.value })} />}
              </Field>
              <Field label="Category">
                {(fid) => (
                  <Select id={fid} disabled={readOnly} value={form.categoryId || ""} onChange={(e) => update({ categoryId: e.target.value })}>
                    <option value="">— No category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Tags" hint="Separate with commas, e.g. plots, patta, Villianur">
                {(fid) => (
                  <Input
                    id={fid}
                    readOnly={readOnly}
                    value={tagsText}
                    onChange={(e) => {
                      setTagsText(e.target.value);
                      update({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) });
                    }}
                  />
                )}
              </Field>
              <Field label="Author name" hint="Shown on the article.">
                {(fid) => <Input id={fid} readOnly={readOnly} maxLength={80} value={form.authorName} onChange={(e) => update({ authorName: e.target.value })} />}
              </Field>
              {post.publishedAt && <p className="text-xs text-stone-500">First published {formatDate(post.publishedAt, { time: true })}</p>}
            </div>
          </Card>

          <Card title="Cover image">
            <ImageChooser
              mediaId={form.coverMediaId}
              disabled={readOnly}
              emptyLabel="No cover image"
              onChange={(mediaId, alt) => update({ coverMediaId: mediaId, ...(alt !== undefined ? { coverAlt: alt } : {}) })}
            />
            {form.coverMediaId && (
              <Field label="Image description (alt text)" className="mt-3">
                {(fid) => <Input id={fid} readOnly={readOnly} maxLength={200} value={form.coverAlt} onChange={(e) => update({ coverAlt: e.target.value })} />}
              </Field>
            )}
          </Card>

          <Card title="SEO (Google)">
            <div className="flex flex-col gap-4">
              <GooglePreview title={effectivePostTitle(form, titleSuffix)} description={effectiveDescription(form)} path={`/blog/${effectiveSlug}/`} />
              <Field label="Focus keyword" hint="The main phrase people search for, e.g. “plots for sale in Pondicherry”.">
                {(fid) => <Input id={fid} readOnly={readOnly} maxLength={80} value={form.focusKeyword} onChange={(e) => update({ focusKeyword: e.target.value })} />}
              </Field>
              <Field
                label="SEO title"
                hint={`Leave empty to use “${form.title || "article title"}${titleSuffix}”.`}
                counter={<CharCount value={effectivePostTitle(form, titleSuffix)} range={TITLE_RANGE} />}
              >
                {(fid) => <Input id={fid} readOnly={readOnly} maxLength={120} value={form.seoTitle} onChange={(e) => update({ seoTitle: e.target.value })} />}
              </Field>
              <Field label="Meta description" hint="1–2 sentences that make people want to click." counter={<CharCount value={effectiveDescription(form)} range={DESCRIPTION_RANGE} />}>
                {(fid) => <Textarea id={fid} rows={3} readOnly={readOnly} maxLength={320} value={form.seoDescription} onChange={(e) => update({ seoDescription: e.target.value })} />}
              </Field>
              <SeoChecklist checks={seo.checks} score={seo.score} />

              <button type="button" className="text-sm font-semibold text-stone-600 hover:text-brand-gold text-left" onClick={() => setShowAdvanced(!showAdvanced)} aria-expanded={showAdvanced}>
                {showAdvanced ? "▾" : "▸"} Advanced SEO
              </button>
              {showAdvanced && (
                <div className="flex flex-col gap-4 border-t border-stone-100 pt-4">
                  <Field label="Social sharing image" hint="Shown when the article is shared on WhatsApp, Facebook, etc. Defaults to the cover image.">
                    <ImageChooser mediaId={form.ogMediaId} disabled={readOnly} emptyLabel="Uses cover image" onChange={(mediaId) => update({ ogMediaId: mediaId })} />
                  </Field>
                  <Field label="Canonical URL" hint="Only if this article was first published on another website. Usually leave empty.">
                    {(fid) => <Input id={fid} readOnly={readOnly} placeholder="https://…" value={form.canonicalUrl} onChange={(e) => update({ canonicalUrl: e.target.value })} />}
                  </Field>
                  <Checkbox
                    label="Hide from Google (noindex)"
                    hint="The article stays on the website but asks search engines not to list it."
                    checked={form.noindex}
                    disabled={readOnly}
                    onChange={(v) => update({ noindex: v })}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

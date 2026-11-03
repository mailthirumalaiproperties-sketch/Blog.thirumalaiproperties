import { useEffect, useState } from "react";
import MediaPicker from "../components/MediaPicker.jsx";
import { GooglePreview } from "../components/SeoTools.jsx";
import { Badge, Button, Card, CharCount, Checkbox, Field, Input, LoadingBlock, Notice, PageHeader, Textarea } from "../components/ui.jsx";
import { api, mediaUrl, SITE_URL } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { timeAgo } from "../lib/format.js";
import { DESCRIPTION_RANGE, TITLE_RANGE } from "../lib/seo.js";

function PageSeoForm({ page, canEdit, onSaved }) {
  const [form, setForm] = useState(page);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [picker, setPicker] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(page);

  async function save() {
    setBusy(true);
    setNotice(null);
    try {
      await api(`/api/seo/pages/${page.key}`, { method: "PUT", body: form });
      setNotice({ tone: "success", text: "Saved. The website will update in about 2 minutes." });
      onSaved(form);
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="flex flex-col gap-4">
        <Field label="SEO title" hint="The blue headline in Google. Put the most important words first." counter={<CharCount value={form.title} range={TITLE_RANGE} />}>
          {(id) => <Input id={id} maxLength={120} disabled={!canEdit} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />}
        </Field>
        <Field label="Meta description" hint="The grey text under the headline. Summarise the page and invite the click." counter={<CharCount value={form.description} range={DESCRIPTION_RANGE} />}>
          {(id) => <Textarea id={id} rows={4} maxLength={320} disabled={!canEdit} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        </Field>
        <Field label="Social sharing image" hint="Shown when this page is shared on WhatsApp or Facebook. Uses the site default if empty.">
          <div className="flex items-center gap-3">
            {form.ogMediaId ? (
              <img src={mediaUrl(form.ogMediaId)} alt="" className="h-16 w-28 rounded-md object-cover border border-stone-200" />
            ) : (
              <span className="h-16 w-28 rounded-md border-2 border-dashed border-stone-200 flex items-center justify-center text-[10px] text-stone-400">Site default</span>
            )}
            {canEdit && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setPicker(true)}>
                  Choose
                </Button>
                {form.ogMediaId && (
                  <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, ogMediaId: null })}>
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
        </Field>
        <Checkbox label="Hide from Google (noindex)" hint="Rarely needed. Keeps this page out of search results." checked={form.noindex} disabled={!canEdit} onChange={(v) => setForm({ ...form, noindex: v })} />
        {notice && (
          <Notice tone={notice.tone} onClose={() => setNotice(null)}>
            {notice.text}
          </Notice>
        )}
        {canEdit && (
          <Button variant="primary" busy={busy} disabled={!dirty} onClick={save} className="self-start">
            Save page SEO
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <GooglePreview title={form.title} description={form.description} path={page.path} />
        <a href={`${SITE_URL}${page.path}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-gold hover:underline self-start">
          Open {page.label} page ↗
        </a>
        {page.updatedAt && (
          <p className="text-xs text-stone-500">
            Last changed {timeAgo(page.updatedAt)}
            {page.updatedByName ? ` by ${page.updatedByName}` : ""}
          </p>
        )}
      </div>
      <MediaPicker open={picker} onClose={() => setPicker(false)} askAlt={false} onSelect={({ media }) => setForm({ ...form, ogMediaId: media.id })} />
    </div>
  );
}

export default function Seo() {
  const { can } = useAuth();
  const [pages, setPages] = useState(null);
  const [selected, setSelected] = useState("home");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/seo/pages").then((d) => setPages(d.pages)).catch((e) => setError(e.message));
  }, []);

  const current = pages?.find((p) => p.key === selected);
  const warn = (p) => p.title.length > TITLE_RANGE[1] + 10 || p.description.length < DESCRIPTION_RANGE[0] - 30;

  return (
    <>
      <PageHeader
        title="Website SEO"
        description="Control how each page of thirumalaiproperties.com appears in Google. Article SEO is set inside each article."
      />
      <Notice tone="error">{error}</Notice>
      {!pages ? (
        <LoadingBlock />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <Card bodyClassName="p-2">
            <nav className="flex flex-col gap-1" aria-label="Website pages">
              {pages.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelected(p.key)}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                    selected === p.key ? "bg-brand-cream text-brand-dark" : "text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span>
                    {p.label}
                    <span className="block text-xs font-normal text-stone-400">{p.path}</span>
                  </span>
                  {p.noindex ? <Badge tone="red">Hidden</Badge> : warn(p) ? <Badge tone="amber">Check</Badge> : null}
                </button>
              ))}
            </nav>
          </Card>
          <Card title={`${current.label} page`} className="lg:col-span-3">
            <PageSeoForm
              key={current.key}
              page={current}
              canEdit={can("seo.pages")}
              onSaved={(form) => setPages((list) => list.map((p) => (p.key === form.key ? { ...form, updatedAt: new Date().toISOString() } : p)))}
            />
          </Card>
        </div>
      )}
    </>
  );
}

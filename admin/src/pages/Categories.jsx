import { useEffect, useState } from "react";
import { Button, Card, CharCount, EmptyState, Field, Input, LoadingBlock, Notice, PageHeader, Textarea } from "../components/ui.jsx";
import { api, SITE_URL } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { slugify } from "../lib/format.js";
import { DESCRIPTION_RANGE, TITLE_RANGE } from "../lib/seo.js";

const BLANK = { id: null, name: "", slug: "", description: "", seoTitle: "", seoDescription: "" };

export default function Categories() {
  const { can } = useAuth();
  const manage = can("categories.manage");
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = () => api("/api/categories").then((d) => setItems(d.categories)).catch((e) => setNotice({ tone: "error", text: e.message }));
  useEffect(() => {
    load();
  }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const body = { ...form, slug: form.slug || slugify(form.name) };
      if (form.id) await api(`/api/categories/${form.id}`, { method: "PUT", body });
      else await api("/api/categories", { method: "POST", body });
      setNotice({ tone: "success", text: form.id ? "Category updated." : "Category added." });
      setForm(BLANK);
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove(cat) {
    const warning = cat.postCount ? ` ${cat.postCount} article(s) will be left without a category.` : "";
    if (!window.confirm(`Delete the category “${cat.name}”?${warning}`)) return;
    try {
      await api(`/api/categories/${cat.id}`, { method: "DELETE" });
      if (form.id === cat.id) setForm(BLANK);
      await load();
    } catch (err) {
      setNotice({ tone: "error", text: err.message });
    }
  }

  return (
    <>
      <PageHeader title="Categories" description="Group articles by topic. Each category gets its own page on the blog." />
      {notice && (
        <div className="mb-4">
          <Notice tone={notice.tone} onClose={() => setNotice(null)}>
            {notice.text}
          </Notice>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <Card title="All categories" className="lg:col-span-3" bodyClassName="p-0">
          {!items ? (
            <LoadingBlock />
          ) : items.length === 0 ? (
            <EmptyState title="No categories yet" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {items.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800">{c.name}</p>
                    <p className="text-xs text-stone-500 truncate">
                      /blog/category/{c.slug}/ · {c.publishedCount} published, {c.postCount} total
                    </p>
                  </div>
                  {manage && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => setForm({ ...BLANK, ...c })}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => remove(c)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {manage && (
          <Card title={form.id ? `Edit “${form.name}”` : "Add a category"} className="lg:col-span-2">
            <form onSubmit={save} className="flex flex-col gap-4">
              <Field label="Name">{(id) => <Input id={id} required maxLength={60} value={form.name} onChange={set("name")} />}</Field>
              <Field label="URL" hint={`${SITE_URL.replace("https://", "")}/blog/category/${form.slug || slugify(form.name) || "…"}/`}>
                {(id) => <Input id={id} maxLength={80} placeholder={slugify(form.name)} value={form.slug} onChange={set("slug")} onBlur={() => setForm((f) => ({ ...f, slug: slugify(f.slug) }))} />}
              </Field>
              <Field label="Description" hint="Shown at the top of the category page.">
                {(id) => <Textarea id={id} maxLength={400} value={form.description} onChange={set("description")} />}
              </Field>
              <Field label="SEO title" counter={<CharCount value={form.seoTitle} range={TITLE_RANGE} />} hint="Leave empty to use the category name.">
                {(id) => <Input id={id} maxLength={120} value={form.seoTitle} onChange={set("seoTitle")} />}
              </Field>
              <Field label="Meta description" counter={<CharCount value={form.seoDescription} range={DESCRIPTION_RANGE} />}>
                {(id) => <Textarea id={id} maxLength={320} value={form.seoDescription} onChange={set("seoDescription")} />}
              </Field>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" busy={busy}>
                  {form.id ? "Save changes" : "Add category"}
                </Button>
                {form.id && (
                  <Button variant="ghost" onClick={() => setForm(BLANK)}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        )}
      </div>
    </>
  );
}

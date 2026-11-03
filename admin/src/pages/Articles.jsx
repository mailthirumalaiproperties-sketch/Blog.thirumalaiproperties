import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, EmptyState, Input, LoadingBlock, Notice, PageHeader, Select } from "../components/ui.jsx";
import { api, mediaUrl, postUrl } from "../lib/api.js";
import { STATUS, timeAgo } from "../lib/format.js";
import { Link, useRouter } from "../lib/router.jsx";

const TABS = [
  { key: "", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "review", label: "In review" },
  { key: "published", label: "Published" },
];

export default function Articles() {
  const { path, query, navigate } = useRouter();
  const status = query.get("status") || "";
  const [posts, setPosts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/posts").then((d) => setPosts(d.posts)).catch((e) => setError(e.message));
    api("/api/categories").then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!posts) return null;
    const needle = q.trim().toLowerCase();
    return posts.filter(
      (p) => (!status || p.status === status) && (!category || p.categoryId === category) && (!needle || p.title.toLowerCase().includes(needle))
    );
  }, [posts, status, category, q]);

  const counts = useMemo(() => {
    const c = { "": posts?.length ?? 0 };
    for (const p of posts || []) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [posts]);

  const setTab = (key) => navigate(key ? `${path}?status=${key}` : path, { replace: true, keepScroll: true });

  return (
    <>
      <PageHeader
        title="Articles"
        description="Everything written for the blog. Published articles appear at thirumalaiproperties.com/blog."
        actions={
          <Button variant="primary" onClick={() => navigate("/articles/new")}>
            + New article
          </Button>
        }
      />
      <Notice tone="error">{error}</Notice>
      <Card bodyClassName="p-0">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between px-4 py-3 border-b border-stone-100">
          <div className="flex flex-wrap gap-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={status === t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${status === t.key ? "bg-brand-dark text-white" : "text-stone-600 hover:bg-stone-100"}`}
              >
                {t.label} <span className="opacity-60">({counts[t.key] || 0})</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input type="search" placeholder="Search titles…" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-56" aria-label="Search titles" />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-48" aria-label="Filter by category">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!filtered ? (
          <LoadingBlock />
        ) : filtered.length === 0 ? (
          <EmptyState title="No articles here" action={<Button onClick={() => navigate("/articles/new")}>Write an article</Button>}>
            {q || category ? "Try a different search or category." : "Articles you create will show up here."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-stone-100">
            {filtered.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-4 py-3 hover:bg-stone-50">
                <div className="hidden sm:block h-14 w-20 shrink-0 rounded-md bg-stone-100 overflow-hidden">
                  {p.coverMediaId && <img src={mediaUrl(p.coverMediaId)} alt="" className="h-full w-full object-cover" loading="lazy" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={`/articles/${p.id}`} className="font-semibold text-stone-800 hover:text-brand-gold line-clamp-1">
                    {p.title}
                  </Link>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {p.categoryName || "No category"} · by {p.authorName} · updated {timeAgo(p.updatedAt)}
                    {p.updatedByName && ` by ${p.updatedByName}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                  {p.status === "published" && (
                    <a href={postUrl(p.slug)} target="_blank" rel="noopener noreferrer" className="hidden md:inline text-xs font-semibold text-stone-500 hover:text-brand-gold">
                      View ↗
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

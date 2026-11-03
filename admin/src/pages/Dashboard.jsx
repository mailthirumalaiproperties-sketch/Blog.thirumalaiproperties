import { useEffect, useState } from "react";
import DeployStatus from "../components/DeployStatus.jsx";
import { Badge, Button, Card, LoadingBlock, Notice, PageHeader } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { STATUS, timeAgo } from "../lib/format.js";
import { Link, useRouter } from "../lib/router.jsx";

function Stat({ label, value, to, tone }) {
  return (
    <Link to={to} className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 hover:border-brand-gold transition">
      <p className="text-sm font-semibold text-stone-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${tone}`}>{value}</p>
    </Link>
  );
}

function PostList({ items, empty }) {
  if (!items.length) return <p className="text-sm text-stone-500">{empty}</p>;
  return (
    <ul className="divide-y divide-stone-100 -my-2">
      {items.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
          <Link to={`/articles/${p.id}`} className="font-semibold text-stone-800 hover:text-brand-gold truncate">
            {p.title}
          </Link>
          <span className="flex items-center gap-2 shrink-0">
            <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
            <span className="text-xs text-stone-400 hidden sm:inline">{timeAgo(p.updatedAt)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const { user, can } = useAuth();
  const { navigate } = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/site/dashboard").then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Write articles, manage SEO and keep the blog on thirumalaiproperties.com up to date."
        actions={
          <Button variant="primary" onClick={() => navigate("/articles/new")}>
            + Write new article
          </Button>
        }
      />
      <Notice tone="error">{error}</Notice>
      {!data ? (
        !error && <LoadingBlock />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Published" value={data.counts.published} to="/articles?status=published" tone="text-green-700" />
            <Stat label="Waiting for review" value={data.counts.review} to="/articles?status=review" tone="text-amber-600" />
            <Stat label="Drafts" value={data.counts.draft} to="/articles?status=draft" tone="text-stone-700" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {can("posts.publish") && data.counts.review > 0 && (
                <Notice tone="warning">
                  {data.counts.review} article{data.counts.review === 1 ? " is" : "s are"} waiting for review.{" "}
                  <Link to="/articles?status=review" className="font-semibold underline">
                    Review now
                  </Link>
                </Notice>
              )}
              <Card title="Recently updated">
                <PostList items={data.recent} empty="No articles yet. Write the first one!" />
              </Card>
              <Card title="My unpublished articles">
                <PostList items={data.myDrafts} empty="You have no drafts." />
              </Card>
            </div>
            <div className="flex flex-col gap-6">
              <DeployStatus />
              <Card title="How publishing works">
                <ol className="text-sm text-stone-600 space-y-2 list-decimal pl-4">
                  <li>Write the article and save it as a draft.</li>
                  {user.role === "writer" ? <li>Click “Submit for review”. An editor checks and publishes it.</li> : <li>Fill in the SEO panel, then click “Publish”.</li>}
                  <li>The website updates automatically in about 2 minutes.</li>
                </ol>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { Card, LoadingBlock, Notice, PageHeader } from "../components/ui.jsx";
import { api } from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import { Link } from "../lib/router.jsx";

const ACTIONS = {
  setup: "completed first-time setup",
  login: "logged in",
  "password.change": "changed their password",
  "post.create": "created article",
  "post.update": "edited article",
  "post.submit": "submitted for review",
  "post.publish": "published",
  "post.unpublish": "unpublished",
  "post.return": "sent back to draft",
  "post.delete": "deleted article",
  "category.create": "added category",
  "category.update": "edited category",
  "category.delete": "deleted category",
  "media.upload": "uploaded image",
  "media.delete": "deleted image",
  "seo.page": "changed SEO for page",
  "settings.update": "changed site settings",
  "user.create": "added user",
  "user.update": "updated user",
  "user.reset-password": "reset password for",
  "user.delete": "deleted user",
  "site.rebuild": "started a website update",
};

export default function Activity() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/site/activity?limit=300").then((d) => setItems(d.activity)).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <PageHeader title="Activity" description="A record of who changed what, most recent first." />
      <Notice tone="error">{error}</Notice>
      <Card bodyClassName="p-0">
        {!items ? (
          <LoadingBlock />
        ) : (
          <ul className="divide-y divide-stone-100">
            {items.map((a) => (
              <li key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-5 py-2.5 text-sm">
                <span className="text-stone-700">
                  <b className="font-semibold text-stone-900">{a.userName || "System"}</b> {ACTIONS[a.action] || a.action}{" "}
                  {a.entity === "post" && a.action !== "post.delete" ? (
                    <Link to={`/articles/${a.entityId}`} className="font-semibold text-brand-gold hover:underline">
                      {a.detail}
                    </Link>
                  ) : (
                    a.detail && <span className="text-stone-500">{a.detail}</span>
                  )}
                </span>
                <time className="text-xs text-stone-400 shrink-0" dateTime={a.createdAt}>
                  {formatDate(a.createdAt, { time: true })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

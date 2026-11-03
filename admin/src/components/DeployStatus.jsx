import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { timeAgo } from "../lib/format.js";
import { Badge, Button, Card } from "./ui.jsx";

/** Shows whether the public website has finished updating, with a manual rebuild button. */
export default function DeployStatus() {
  const { can } = useAuth();
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(() => api("/api/site/deploy").then(setInfo).catch((e) => setInfo({ error: e.message })), []);

  const running = info?.run && info.run.status !== "completed";
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [running, load]);

  async function rebuild() {
    setBusy(true);
    setMessage("");
    try {
      await api("/api/site/deploy", { method: "POST" });
      setMessage("Website update started. It usually takes about 2 minutes.");
      setTimeout(load, 4000);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }

  let badge = <Badge>Checking…</Badge>;
  let detail = "";
  if (info?.configured === false) {
    badge = <Badge tone="amber">Not connected</Badge>;
    detail = "Automatic website updates are not connected yet.";
  } else if (info?.error) {
    badge = <Badge tone="red">Unknown</Badge>;
    detail = info.error;
  } else if (info?.run === null) {
    badge = <Badge>No updates yet</Badge>;
  } else if (info?.run) {
    const r = info.run;
    if (r.status !== "completed") {
      badge = <Badge tone="blue">Updating…</Badge>;
      detail = `Started ${timeAgo(r.createdAt)}. Changes appear on the website when this finishes.`;
    } else if (r.conclusion === "success") {
      badge = <Badge tone="green">Up to date</Badge>;
      detail = `Last updated ${timeAgo(r.updatedAt)}.`;
    } else {
      badge = <Badge tone="red">Last update failed</Badge>;
      detail = `Attempted ${timeAgo(r.updatedAt)}. The live website still shows the previous version.`;
    }
  }

  return (
    <Card
      title="Public website"
      actions={info?.run?.url && (
        <a href={info.run.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-stone-500 hover:text-brand-gold">
          Details ↗
        </a>
      )}
    >
      <div className="flex items-center gap-3">{badge}</div>
      {detail && <p className="text-sm text-stone-500 mt-2">{detail}</p>}
      {can("deploy.trigger") && info?.configured !== false && (
        <div className="mt-4">
          <Button size="sm" busy={busy} disabled={running} onClick={rebuild}>
            Update website now
          </Button>
          {message && <p className="text-xs text-stone-600 mt-2">{message}</p>}
        </div>
      )}
    </Card>
  );
}

import { useEffect, useState } from "react";
import { UploadButton } from "../components/MediaPicker.jsx";
import { Button, Card, EmptyState, Input, LoadingBlock, Notice, PageHeader } from "../components/ui.jsx";
import { api, mediaUrl } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { formatBytes, timeAgo } from "../lib/format.js";

function MediaCard({ item, canManage, onDeleted, onError }) {
  const [alt, setAlt] = useState(item.alt);
  const [saved, setSaved] = useState(false);

  async function saveAlt() {
    if (alt === item.alt) return;
    try {
      await api(`/api/media/${item.id}`, { method: "PUT", body: { alt } });
      item.alt = alt;
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      onError(e.message);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${item.filename}? Articles using it as a cover will lose the image.`)) return;
    try {
      await api(`/api/media/${item.id}`, { method: "DELETE" });
      onDeleted(item.id);
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col">
      <a href={mediaUrl(item.id)} target="_blank" rel="noopener noreferrer" className="block bg-stone-100 aspect-[4/3]">
        <img src={mediaUrl(item.id)} alt={item.alt} loading="lazy" className="h-full w-full object-cover" />
      </a>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs text-stone-500 truncate" title={item.filename}>
          {item.width ? `${item.width}×${item.height} · ` : ""}
          {formatBytes(item.size)} · {item.uploadedByName || "unknown"}, {timeAgo(item.createdAt)}
        </p>
        <Input
          aria-label={`Description for ${item.filename}`}
          placeholder="Describe the image (alt text)"
          value={alt}
          maxLength={200}
          disabled={!canManage}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={saveAlt}
          className={!alt ? "border-amber-300" : ""}
        />
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xs text-green-700">{saved ? "Saved ✓" : ""}</span>
          {canManage && (
            <Button size="sm" variant="danger" onClick={remove}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MediaLibrary() {
  const { user, can } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    api("/api/media").then((d) => setItems(d.media)).catch((e) => setError(e.message));
  }, []);

  const needle = filter.trim().toLowerCase();
  const shown = items?.filter((m) => !needle || m.alt.toLowerCase().includes(needle) || m.filename.toLowerCase().includes(needle));
  const missingAlt = items?.filter((m) => !m.alt).length || 0;

  return (
    <>
      <PageHeader
        title="Images"
        description="All images used in articles. Photos are resized and compressed automatically when uploaded."
        actions={<UploadButton variant="primary" onUploaded={(created) => setItems((prev) => [...created, ...(prev || [])])} />}
      />
      <div className="flex flex-col gap-4">
        <Notice tone="error" onClose={error ? () => setError("") : undefined}>
          {error}
        </Notice>
        {missingAlt > 0 && <Notice tone="warning">{missingAlt} image{missingAlt === 1 ? " has" : "s have"} no description. Descriptions help Google understand your images.</Notice>}
        <Input type="search" placeholder="Search by description or file name…" value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" aria-label="Search images" />
        {!shown ? (
          <LoadingBlock />
        ) : shown.length === 0 ? (
          <Card>
            <EmptyState title={items.length ? "No matching images" : "No images yet"}>Upload photos of plots, properties or documents to use in articles.</EmptyState>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shown.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                canManage={can("media.manageAny") || item.uploadedBy === user.id}
                onDeleted={(id) => setItems((prev) => prev.filter((m) => m.id !== id))}
                onError={setError}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

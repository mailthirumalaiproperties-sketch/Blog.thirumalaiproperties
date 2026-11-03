import { useEffect, useState } from "react";
import { ACCEPT_ANY, isDocument, PdfBadge, UploadButton } from "../components/MediaPicker.jsx";
import { Button, Card, EmptyState, Input, LoadingBlock, Notice, PageHeader } from "../components/ui.jsx";
import { api, mediaUrl } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";
import { formatBytes, timeAgo } from "../lib/format.js";

function MediaCard({ item, canManage, onDeleted, onError }) {
  const doc = isDocument(item);
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
    if (!window.confirm(`Delete ${item.filename}?${doc ? "" : " Articles using it as a cover will lose the image."}`)) return;
    try {
      await api(`/api/media/${item.id}`, { method: "DELETE" });
      onDeleted(item.id);
    } catch (e) {
      onError(e.message);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden flex flex-col">
      {doc ? (
        <a
          href={mediaUrl(item.id)}
          title="Download"
          className="flex flex-col items-center justify-center gap-3 bg-stone-100 aspect-[4/3] px-4 text-center hover:bg-brand-cream"
        >
          <PdfBadge className="text-sm px-3 py-1" />
          <span className="text-xs font-semibold text-stone-600 break-all line-clamp-2">{item.filename}</span>
        </a>
      ) : (
        <a href={mediaUrl(item.id)} target="_blank" rel="noopener noreferrer" className="block bg-stone-100 aspect-[4/3]">
          <img src={mediaUrl(item.id)} alt={item.alt} loading="lazy" className="h-full w-full object-cover" />
        </a>
      )}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="text-xs text-stone-500 truncate" title={item.filename}>
          {item.width ? `${item.width}×${item.height} · ` : ""}
          {formatBytes(item.size)} · {item.uploadedByName || "unknown"}, {timeAgo(item.createdAt)}
        </p>
        <Input
          aria-label={`${doc ? "Title" : "Description"} for ${item.filename}`}
          placeholder={doc ? "Document title" : "Describe the image (alt text)"}
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
  const [type, setType] = useState("all");

  useEffect(() => {
    api("/api/media").then((d) => setItems(d.media)).catch((e) => setError(e.message));
  }, []);

  const needle = filter.trim().toLowerCase();
  const shown = items?.filter(
    (m) =>
      (type === "all" || (type === "documents") === isDocument(m)) &&
      (!needle || m.alt.toLowerCase().includes(needle) || m.filename.toLowerCase().includes(needle))
  );
  const missingAlt = items?.filter((m) => !m.alt && !isDocument(m)).length || 0;
  const docCount = items?.filter(isDocument).length || 0;
  const TYPES = [
    ["all", "All", items?.length || 0],
    ["images", "Images", (items?.length || 0) - docCount],
    ["documents", "PDF documents", docCount],
  ];

  return (
    <>
      <PageHeader
        title="Images & documents"
        description="All images and PDF documents used in articles. Photos are resized automatically; PDFs can be up to 1.9 MB. For videos, use the Video button in the article editor (YouTube links)."
        actions={
          <UploadButton variant="primary" label="Upload images or PDFs" accept={ACCEPT_ANY} onUploaded={(created) => setItems((prev) => [...created, ...(prev || [])])} />
        }
      />
      <div className="flex flex-col gap-4">
        <Notice tone="error" onClose={error ? () => setError("") : undefined}>
          {error}
        </Notice>
        {missingAlt > 0 && <Notice tone="warning">{missingAlt} image{missingAlt === 1 ? " has" : "s have"} no description. Descriptions help Google understand your images.</Notice>}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="File type">
            {TYPES.map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={type === key}
                onClick={() => setType(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${type === key ? "bg-brand-dark text-white" : "text-stone-600 hover:bg-stone-100"}`}
              >
                {label} <span className="opacity-60">({count})</span>
              </button>
            ))}
          </div>
          <Input type="search" placeholder="Search by description or file name…" value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:max-w-sm" aria-label="Search files" />
        </div>
        {!shown ? (
          <LoadingBlock />
        ) : shown.length === 0 ? (
          <Card>
            <EmptyState title={items.length ? "Nothing matches" : "No files yet"}>Upload photos of plots and properties, or PDF documents, to use in articles.</EmptyState>
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

import { useCallback, useEffect, useRef, useState } from "react";
import { api, mediaUrl } from "../lib/api.js";
import { formatBytes } from "../lib/format.js";
import { prepareImage } from "../lib/image.js";
import { Button, Field, Input, LoadingBlock, Modal, Notice } from "./ui.jsx";

// Matches MAX_FILE_BYTES in worker/src/routes/media.js (database row limit).
const MAX_UPLOAD_BYTES = 1_900_000;

export const isDocument = (m) => m.mime === "application/pdf";
const isPdfFile = (file) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);

const KINDS = {
  image: {
    accept: "image/jpeg,image/png,image/webp,image/gif",
    match: (m) => !isDocument(m),
    title: "Choose an image",
    confirm: "Use this image",
    upload: "Upload images",
  },
  document: {
    accept: "application/pdf,.pdf",
    match: isDocument,
    title: "Insert a PDF document",
    confirm: "Insert document",
    upload: "Upload PDF",
  },
};
export const ACCEPT_ANY = `${KINDS.image.accept},${KINDS.document.accept}`;

export function PdfBadge({ className = "" }) {
  return <span className={`inline-flex items-center justify-center rounded bg-red-700 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white ${className}`}>PDF</span>;
}

/** Uploads images (resized first) and PDFs (as-is); returns the created media records. */
export async function uploadFiles(files, onProgress) {
  const created = [];
  for (const [i, file] of [...files].entries()) {
    onProgress?.(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
    const pdf = isPdfFile(file);
    if (pdf && file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`“${file.name}” is ${formatBytes(file.size)}. PDFs can be at most 1.9 MB. Compress it (search for “compress PDF”) and upload again.`);
    }
    const prepared = pdf ? { blob: file, name: file.name } : await prepareImage(file);
    const form = new FormData();
    form.append("file", prepared.blob, prepared.name);
    if (prepared.width) form.append("width", String(prepared.width));
    if (prepared.height) form.append("height", String(prepared.height));
    form.append("alt", pdf ? file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() : "");
    created.push((await api("/api/media", { method: "POST", form })).media);
  }
  return created;
}

export function UploadButton({ onUploaded, label = "Upload images", accept = KINDS.image.accept, multiple = true, variant = "secondary" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handle(files) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      onUploaded(await uploadFiles(files, setMessage));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setMessage("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => handle(e.target.files)} />
      <Button variant={variant} busy={busy} onClick={() => inputRef.current?.click()}>
        {busy ? message || "Uploading…" : label}
      </Button>
      {error && <p className="text-xs text-red-600 max-w-sm">{error}</p>}
    </div>
  );
}

/**
 * Modal to choose an image or PDF from the library (or upload a new one).
 * Calls onSelect({ media, alt }) when the user confirms. For documents, `alt`
 * is the document title shown as the download link.
 */
export default function MediaPicker({ open, onClose, onSelect, kind = "image", title, askAlt = true }) {
  const k = KINDS[kind];
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [alt, setAlt] = useState("");

  const load = useCallback(() => {
    setError("");
    api("/api/media")
      .then((d) => setItems(d.media))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setAlt("");
      load();
    }
  }, [open, load]);

  function choose(item) {
    setSelected(item);
    setAlt(item.alt || (isDocument(item) ? item.filename.replace(/\.pdf$/i, "") : ""));
  }

  async function confirm() {
    if (askAlt && alt.trim() && alt.trim() !== selected.alt) {
      // Save the description on the file too, so it can be reused.
      await api(`/api/media/${selected.id}`, { method: "PUT", body: { alt: alt.trim() } }).catch(() => {});
    }
    onSelect({ media: { ...selected, alt: alt.trim() }, alt: alt.trim() });
    onClose();
  }

  const shown = items?.filter(k.match);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || k.title}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selected || (askAlt && !alt.trim())} onClick={confirm}>
            {k.confirm}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-stone-500">
            {kind === "document"
              ? "Click a document to select it, or upload a new PDF (max 1.9 MB). Readers get a download button in the article."
              : "Click an image to select it, or upload a new one. Photos are resized automatically."}
          </p>
          <UploadButton
            variant="primary"
            label={k.upload}
            accept={k.accept}
            onUploaded={(created) => {
              setItems((prev) => [...created, ...(prev || [])]);
              choose(created[0]);
            }}
          />
        </div>
        <Notice tone="error">{error}</Notice>
        {!shown ? (
          <LoadingBlock />
        ) : shown.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-10">{kind === "document" ? "No documents yet. Upload your first PDF." : "No images yet. Upload your first one."}</p>
        ) : kind === "document" ? (
          <ul className="flex flex-col gap-2">
            {shown.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => choose(item)}
                  className={`w-full flex items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left ${
                    selected?.id === item.id ? "border-brand-yellow bg-brand-cream" : "border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <PdfBadge />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-stone-800 truncate">{item.alt || item.filename}</span>
                    <span className="block text-xs text-stone-500 truncate">
                      {item.filename} · {formatBytes(item.size)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {shown.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => choose(item)}
                className={`group relative aspect-square rounded-lg overflow-hidden border-2 bg-stone-100 ${
                  selected?.id === item.id ? "border-brand-yellow ring-2 ring-brand-yellow/40" : "border-transparent hover:border-stone-300"
                }`}
                title={item.alt || item.filename}
              >
                <img src={mediaUrl(item.id)} alt={item.alt} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        {selected && askAlt && (
          <Field
            label={kind === "document" ? "Document title (shown on the download button)" : "Image description (alt text)"}
            hint={
              kind === "document"
                ? "Example: “Sample sale deed format” or “Patta transfer checklist”."
                : "Describe what the image shows. Google and screen readers use this. Example: “Residential plot with boundary stones near Villianur”."
            }
          >
            {(id) => (
              <Input
                id={id}
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                maxLength={200}
                placeholder={kind === "document" ? "What is this document?" : "What does this image show?"}
              />
            )}
          </Field>
        )}
      </div>
    </Modal>
  );
}

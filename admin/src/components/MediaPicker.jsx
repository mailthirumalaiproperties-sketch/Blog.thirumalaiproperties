import { useCallback, useEffect, useRef, useState } from "react";
import { api, mediaUrl } from "../lib/api.js";
import { prepareImage } from "../lib/image.js";
import { Button, Field, Input, LoadingBlock, Modal, Notice } from "./ui.jsx";

/** Uploads one or more files; returns the created media records. */
export async function uploadImages(files, onProgress) {
  const created = [];
  for (const [i, file] of [...files].entries()) {
    onProgress?.(`Uploading ${i + 1} of ${files.length}: ${file.name}`);
    const img = await prepareImage(file);
    const form = new FormData();
    form.append("file", img.blob, img.name);
    if (img.width) form.append("width", String(img.width));
    if (img.height) form.append("height", String(img.height));
    form.append("alt", "");
    created.push((await api("/api/media", { method: "POST", form })).media);
  }
  return created;
}

export function UploadButton({ onUploaded, label = "Upload images", multiple = true, variant = "secondary" }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handle(files) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      onUploaded(await uploadImages(files, setMessage));
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
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={multiple} className="hidden" onChange={(e) => handle(e.target.files)} />
      <Button variant={variant} busy={busy} onClick={() => inputRef.current?.click()}>
        {busy ? message || "Uploading…" : label}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Modal to choose an image from the library (or upload a new one).
 * Calls onSelect({ media, alt }) when the user confirms.
 */
export default function MediaPicker({ open, onClose, onSelect, title = "Choose an image", askAlt = true }) {
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
    setAlt(item.alt || "");
  }

  async function confirm() {
    if (askAlt && alt.trim() && alt.trim() !== selected.alt) {
      // Save the description on the image too, so it can be reused.
      await api(`/api/media/${selected.id}`, { method: "PUT", body: { alt: alt.trim() } }).catch(() => {});
    }
    onSelect({ media: { ...selected, alt: alt.trim() }, alt: alt.trim() });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={!selected || (askAlt && !alt.trim())} onClick={confirm}>
            Use this image
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-stone-500">Click an image to select it, or upload a new one. Photos are resized automatically.</p>
          <UploadButton
            variant="primary"
            onUploaded={(created) => {
              setItems((prev) => [...created, ...(prev || [])]);
              choose(created[0]);
            }}
          />
        </div>
        <Notice tone="error">{error}</Notice>
        {!items ? (
          <LoadingBlock />
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-10">No images yet. Upload your first one.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {items.map((item) => (
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
          <Field label="Image description (alt text)" hint="Describe what the image shows. Google and screen readers use this. Example: “Residential plot with boundary stones near Villianur”.">
            {(id) => <Input id={id} value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} placeholder="What does this image show?" />}
          </Field>
        )}
      </div>
    </Modal>
  );
}

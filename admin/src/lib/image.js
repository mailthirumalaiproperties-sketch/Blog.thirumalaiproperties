const MAX_BYTES = 1_800_000;

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resizes photos to at most `maxWidth` px and re-encodes them as WebP so they
 * load fast and fit the server's 1.9 MB limit. GIFs are kept as-is (animation).
 */
export async function prepareImage(file, { maxWidth = 1600 } = {}) {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    throw new Error(`"${file.name}" is not a JPEG, PNG, WebP or GIF image.`);
  }
  if (file.type === "image/gif") {
    if (file.size > MAX_BYTES) throw new Error(`"${file.name}" is too large. GIFs must be under 1.8 MB.`);
    return { blob: file, name: file.name, width: null, height: null };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let type = "image/webp";
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, type, quality);
  if (!blob || blob.type !== "image/webp") type = "image/jpeg"; // browsers without WebP encoding
  for (let attempt = 0; attempt < 8 && (!blob || blob.type !== type || (blob.size > MAX_BYTES && quality > 0.4)); attempt++) {
    if (blob && blob.type === type) quality -= 0.1;
    blob = await canvasToBlob(canvas, type, quality);
  }
  if (!blob) throw new Error(`Couldn't process "${file.name}". Try a different image.`);
  if (blob.size > MAX_BYTES) throw new Error(`"${file.name}" is still too large after compression. Try a smaller image.`);

  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return { blob, name: `${base}.${type === "image/webp" ? "webp" : "jpg"}`, width, height };
}

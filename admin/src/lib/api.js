// Thin client for the CMS API (Cloudflare Worker).

export const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
export const SITE_URL = "https://thirumalaiproperties.com";

const TOKEN_KEY = "tp_cms_token";

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Storage blocked (private mode); the session lasts until the tab closes.
    }
  },
};

let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const init = { method, headers };
  if (payload !== undefined) init.body = payload;
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your internet connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new ApiError(res.status, data.error || `Request failed (${res.status}).`);
  }
  return data;
}

export const mediaUrl = (id) => (id ? `${API_URL}/api/public/media/${id}` : null);
export const postUrl = (slug) => `${SITE_URL}/blog/${slug}/`;

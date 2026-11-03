import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "./api.js";

// Mirrors PERMISSIONS in worker/src/lib/auth.js (the server is the real gatekeeper).
const PERMISSIONS = {
  "posts.publish": ["admin", "editor"],
  "posts.editAny": ["admin", "editor"],
  "categories.manage": ["admin", "editor"],
  "media.manageAny": ["admin", "editor"],
  "seo.pages": ["admin", "editor"],
  "settings.manage": ["admin"],
  "users.manage": ["admin"],
  "activity.view": ["admin"],
  "deploy.trigger": ["admin", "editor"],
};

export const ROLE_LABELS = { admin: "Admin", editor: "Editor", writer: "Writer" };
export const ROLE_HELP = {
  admin: "Everything, including users and site settings",
  editor: "Write, edit and publish all articles; manage categories, images and page SEO",
  writer: "Write and edit their own drafts, then submit them for review",
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const clear = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clear);
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => clear())
      .finally(() => setReady(true));
  }, [clear]);

  const startSession = useCallback((data) => {
    tokenStore.set(data.token);
    setUser(data.user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      async login(email, password) {
        startSession(await api("/api/auth/login", { method: "POST", body: { email, password } }));
      },
      async setup(fields) {
        startSession(await api("/api/auth/setup", { method: "POST", body: fields }));
      },
      async logout() {
        await api("/api/auth/logout", { method: "POST" }).catch(() => {});
        clear();
      },
      markPasswordChanged() {
        setUser((u) => (u ? { ...u, mustChangePassword: false } : u));
      },
      can(permission) {
        return Boolean(user && PERMISSIONS[permission]?.includes(user.role));
      },
    }),
    [user, ready, startSession, clear]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

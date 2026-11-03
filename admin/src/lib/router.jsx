import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Minimal history-based router: the admin has a handful of screens, so this
// avoids pulling in a routing library.
const RouterContext = createContext(null);

const currentLocation = () => ({ path: window.location.pathname, search: window.location.search });

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(currentLocation);
  const guardRef = useRef(null);

  useEffect(() => {
    const onPop = () => setLocation(currentLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to, { replace = false, keepScroll = false } = {}) => {
    if (to === window.location.pathname + window.location.search) return;
    if (!replace && guardRef.current && !guardRef.current()) return;
    window.history[replace ? "replaceState" : "pushState"](null, "", to);
    setLocation(currentLocation());
    if (!keepScroll) window.scrollTo(0, 0);
  }, []);

  const value = useMemo(
    () => ({ path: location.path, search: location.search, query: new URLSearchParams(location.search), navigate, guardRef }),
    [location, navigate]
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

/** Matches "/articles/:id" style patterns. Returns params or null. */
export function matchPath(pattern, path) {
  const want = pattern.split("/").filter(Boolean);
  const got = path.split("/").filter(Boolean);
  if (want.length !== got.length) return null;
  const params = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(":")) params[want[i].slice(1)] = decodeURIComponent(got[i]);
    else if (want[i] !== got[i]) return null;
  }
  return params;
}

export function Link({ to, children, onClick, ...rest }) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/** Asks for confirmation before leaving a screen with unsaved changes. */
export function useUnsavedChangesGuard(dirty) {
  const { guardRef } = useRouter();
  useEffect(() => {
    if (!dirty) return undefined;
    const message = "You have unsaved changes. Leave without saving?";
    guardRef.current = () => window.confirm(message);
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = message;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      guardRef.current = null;
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [dirty, guardRef]);
}

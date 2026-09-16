"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthAPI, getToken, setToken } from "@/lib/api";

// ---------- Theme ----------
type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>({
  theme: "light",
  toggle: () => {},
  set: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tv-theme") as Theme | null;
      const initial =
        saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      setTheme(initial);
      document.documentElement.classList.toggle("dark", initial === "dark");
    } catch {
      /* ignore */
    }
  }, []);
  const set = useCallback((t: Theme) => {
    setTheme(t);
    try {
      localStorage.setItem("tv-theme", t);
    } catch {
      /* ignore */
    }
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);
  const toggle = useCallback(() => set(theme === "dark" ? "light" : "dark"), [theme, set]);
  return <ThemeCtx.Provider value={{ theme, toggle, set }}>{children}</ThemeCtx.Provider>;
}
export const useTheme = () => useContext(ThemeCtx);

// ---------- Auth ----------
type User = { id: string; email: string; name?: string; role?: string } | null;
const AuthCtx = createContext<{
  user: User;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setTok] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setTok(null);
      setLoading(false);
      return;
    }
    try {
      const { user } = await AuthAPI.me(t);
      setUser(user);
      setTok(t);
    } catch {
      setToken(null);
      setUser(null);
      setTok(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await AuthAPI.login({ email, password });
    setToken(data.accessToken);
    setTok(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthAPI.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    setTok(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, refresh }),
    [user, token, loading, login, logout, refresh]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

// ---------- Toasts ----------
export type Toast = { id: number; title: string; body?: string; kind: "info" | "success" | "error" };
const ToastCtx = createContext<{ push: (t: Omit<Toast, "id">) => void; toasts: Toast[] }>({
  push: () => {},
  toasts: [],
});
let toastId = 1;
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = toastId++;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);
  return <ToastCtx.Provider value={{ push, toasts }}>{children}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

// ---------- Favorites + recent ----------
const FavCtx = createContext<{
  favorites: string[];
  toggleFav: (slug: string) => void;
  isFav: (slug: string) => boolean;
  recent: string[];
  touchRecent: (slug: string) => void;
}>({ favorites: [], toggleFav: () => {}, isFav: () => false, recent: [], touchRecent: () => {} });

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("tv-favs") ?? "[]");
    } catch {
      return [];
    }
  });
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("tv-recent") ?? "[]");
    } catch {
      return [];
    }
  });
  const toggleFav = useCallback((slug: string) => {
    setFavs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem("tv-favs", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const touchRecent = useCallback((slug: string) => {
    setRecent((prev) => {
      const next = [slug, ...prev.filter((s) => s !== slug)].slice(0, 8);
      try {
        localStorage.setItem("tv-recent", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const isFav = useCallback((slug: string) => favorites.includes(slug), [favorites]);
  return (
    <FavCtx.Provider value={{ favorites, toggleFav, isFav, recent, touchRecent }}>
      {children}
    </FavCtx.Provider>
  );
}
export const usePrefs = () => useContext(FavCtx);

// ---------- Command palette open state ----------
const PaletteCtx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});
export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <PaletteCtx.Provider value={{ open, setOpen }}>{children}</PaletteCtx.Provider>;
}
export const usePalette = () => useContext(PaletteCtx);

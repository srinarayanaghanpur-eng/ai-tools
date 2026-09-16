"use client";

import { useAuth, useTheme } from "@/components/providers";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, set } = useTheme();
  return (
    <div>
      <h1 className="text-xl font-extrabold tracking-tight">Settings</h1>
      <div className="surface mt-4 space-y-4 rounded-2xl p-5">
        <div>
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="text-muted mt-1 text-sm">{user?.email ?? "Not signed in"} {user?.role ? `· ${user.role}` : ""}</p>
        </div>
        <fieldset>
          <legend className="text-sm font-semibold">Theme</legend>
          <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Theme">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                role="radio"
                aria-checked={theme === t}
                onClick={() => set(t)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${theme === t ? "bg-brand-600 text-white" : "surface-soft"}`}
              >
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
          <p className="text-muted mt-1.5 text-xs">Your choice is saved on this device.</p>
        </fieldset>
        {user && (
          <button onClick={logout} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

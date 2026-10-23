"use client";

import { useSyncExternalStore } from "react";
import { es } from "@/i18n/es";

type Theme = "dark" | "light" | "auto";
const KEY = "theme";
const listeners = new Set<() => void>();

function read(): Theme {
  const theme = document.documentElement.getAttribute("data-theme");
  return theme === "light" || theme === "auto" ? theme : "dark";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function choose(next: Theme) {
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
  for (const listener of listeners) listener();
}

/** Dark by default, like the app. The choice stays in this browser only (localStorage, no cookie). */
export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as const);
  const t = es.layout;
  return (
    <div className="theme-switch" role="group" aria-label={t.theme}>
      {(["dark", "light", "auto"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={() => choose(option)}
        >
          {t.themes[option]}
        </button>
      ))}
    </div>
  );
}

/** Runs before paint so a light-mode visitor never sees a dark flash, and vice versa. */
export const themeScript = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="auto")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

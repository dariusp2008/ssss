import { useEffect, useState } from "react";

// Client-only visibility preferences for the dashboard "insight" sections.
// IMPORTANT: these only gate what is RENDERED. The underlying React Query
// requests in dashboard.tsx must keep firing regardless, so backend behaviour
// is unchanged — we never disable a query based on these flags.

export type DashboardSectionKey = "onboarding" | "upcoming" | "matchEngine";

export interface DashboardPrefs {
  onboarding: boolean;
  upcoming: boolean;
  matchEngine: boolean;
}

export const DASHBOARD_SECTIONS: { key: DashboardSectionKey; label: string; description: string }[] = [
  { key: "onboarding", label: "Ghid de început", description: "Pașii de configurare afișați pentru conturile noi." },
  { key: "upcoming", label: "Se deschid curând", description: "Apelurile anunțate care nu sunt încă deschise." },
  { key: "matchEngine", label: "Motor de Potrivire", description: "Rezumatul potrivirilor pentru compania selectată." },
];

const DEFAULT_PREFS: DashboardPrefs = {
  onboarding: true,
  upcoming: true,
  matchEngine: true,
};

const STORAGE_KEY = "granted_dashboard_prefs";
const EVENT_NAME = "granted-dashboard-prefs";

export function readDashboardPrefs(): DashboardPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writeDashboardPrefs(prefs: DashboardPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new Event(EVENT_NAME));
}

// Reactive hook — re-renders when prefs change (same tab via custom event,
// other tabs via the native `storage` event).
export function useDashboardPrefs(): [DashboardPrefs, (next: DashboardPrefs) => void] {
  const [prefs, setPrefs] = useState<DashboardPrefs>(() => readDashboardPrefs());

  useEffect(() => {
    const sync = () => setPrefs(readDashboardPrefs());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = (next: DashboardPrefs) => {
    writeDashboardPrefs(next);
    setPrefs(next);
  };

  return [prefs, update];
}

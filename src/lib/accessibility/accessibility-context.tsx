import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export type TextScale = 1 | 1.25 | 1.5 | 2;

export interface AccessibilityPrefs {
  high_contrast_enabled: boolean;
  text_scale_factor: TextScale;
  reduce_motion_enabled: boolean;
}

const STORAGE_KEYS = {
  contrast: "cst_high_contrast",
  scale: "cst_text_scale",
  motion: "cst_reduce_motion",
} as const;

function detectMotionPreference(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readGuest(): AccessibilityPrefs {
  const defaults: AccessibilityPrefs = {
    high_contrast_enabled: false,
    text_scale_factor: 1,
    reduce_motion_enabled: detectMotionPreference(),
  };
  if (typeof window === "undefined") return defaults;
  try {
    const contrast = window.localStorage.getItem(STORAGE_KEYS.contrast);
    const scale = window.localStorage.getItem(STORAGE_KEYS.scale);
    const motion = window.localStorage.getItem(STORAGE_KEYS.motion);
    return {
      high_contrast_enabled: contrast === "1",
      text_scale_factor: normalizeScale(scale ? Number(scale) : defaults.text_scale_factor),
      reduce_motion_enabled:
        motion === null ? defaults.reduce_motion_enabled : motion === "1",
    };
  } catch {
    return defaults;
  }
}

function normalizeScale(n: number): TextScale {
  return n === 1.25 || n === 1.5 || n === 2 ? n : 1;
}

function applyToDocument(prefs: AccessibilityPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.contrast = prefs.high_contrast_enabled ? "high" : "standard";
  root.dataset.scale = String(prefs.text_scale_factor);
  root.dataset.reduceMotion = prefs.reduce_motion_enabled ? "true" : "false";
}

export interface AccessibilityContextValue extends AccessibilityPrefs {
  update: (patch: Partial<AccessibilityPrefs>) => Promise<void>;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => ({
    high_contrast_enabled: false,
    text_scale_factor: 1,
    reduce_motion_enabled: false,
  }));

  // Hydrate from localStorage (immediate) then from DB (async) so the UI
  // applies preferences on first paint without waiting for a round-trip.
  useEffect(() => {
    const guest = readGuest();
    setPrefs(guest);
    applyToDocument(guest);

    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const { data: row } = await supabase
        .from("accessibility_preferences")
        .select("high_contrast_enabled, text_scale_factor, reduce_motion_enabled")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled || !row) return;
      const next: AccessibilityPrefs = {
        high_contrast_enabled: !!row.high_contrast_enabled,
        text_scale_factor: normalizeScale(Number(row.text_scale_factor ?? 1)),
        reduce_motion_enabled: !!row.reduce_motion_enabled,
      };
      setPrefs(next);
      applyToDocument(next);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback<AccessibilityContextValue["update"]>(async (patch) => {
    setPrefs((prev) => {
      const next: AccessibilityPrefs = { ...prev, ...patch };
      if (patch.text_scale_factor !== undefined) {
        next.text_scale_factor = normalizeScale(patch.text_scale_factor);
      }
      applyToDocument(next);
      try {
        window.localStorage.setItem(STORAGE_KEYS.contrast, next.high_contrast_enabled ? "1" : "0");
        window.localStorage.setItem(STORAGE_KEYS.scale, String(next.text_scale_factor));
        window.localStorage.setItem(STORAGE_KEYS.motion, next.reduce_motion_enabled ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });

    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid) return;
    await supabase
      .from("accessibility_preferences")
      .upsert(
        {
          user_id: uid,
          ...patch,
        },
        { onConflict: "user_id" },
      );
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({ ...prefs, update }),
    [prefs, update],
  );

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used inside <AccessibilityProvider>");
  }
  return ctx;
}
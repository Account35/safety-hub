import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { t as enDict } from "./en";
import { t as afDict } from "./af";
import type { Translations } from "./types";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  type LanguageCode,
} from "./registry";
import { supabase } from "@/integrations/supabase/client";

const DICTIONARIES: Record<LanguageCode, Translations> = {
  "en-ZA": enDict,
  "af-ZA": afDict,
};

/** Resolve a dot-path like `"dashboard.actions.report"` against a dictionary. */
function resolveKey(dict: Translations, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{{${name}}}`,
  );
}

// Client-side dedupe so a missing key doesn't spam the fallback log.
const loggedFallbacks = new Set<string>();
function logFallback(key: string, lang: LanguageCode) {
  const tag = `${lang}::${key}`;
  if (loggedFallbacks.has(tag)) return;
  loggedFallbacks.add(tag);
  // Fire and forget; RLS drops guest inserts silently.
  void supabase
    .from("translation_fallback_log")
    .insert({ translation_key: key, language_code: lang })
    .then(() => undefined, () => undefined);
}

export type TranslateFn = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => Promise<void>;
  t: TranslateFn;
  /** Pluralized variant: picks `${key}_zero|_one|_many` based on count. */
  tPlural: (
    key: string,
    count: number,
    vars?: Record<string, string | number>,
  ) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readGuestLanguage(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(stored)) return stored;
  } catch {
    // localStorage may be unavailable (private mode, SSR).
  }
  return DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);

  // On mount and on auth change: hydrate language from profile or localStorage.
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        if (!cancelled) setLanguageState(readGuestLanguage());
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("language_preference")
        .eq("id", uid)
        .maybeSingle();
      const code = profile?.language_preference;
      if (!cancelled) {
        setLanguageState(isSupportedLanguage(code) ? code : readGuestLanguage());
      }
    }

    void hydrate();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        void hydrate();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Reflect the current language on <html lang="…"> so screen readers and
  // browsers pick the right pronunciation/formatting.
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback(async (code: LanguageCode) => {
    setLanguageState(code);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // ignore
    }
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      await supabase
        .from("profiles")
        .update({ language_preference: code })
        .eq("id", uid);
    }
  }, []);

  const t = useCallback<TranslateFn>(
    (key, vars) => {
      const dict = DICTIONARIES[language];
      const primary = resolveKey(dict, key);
      if (primary !== undefined) return interpolate(primary, vars);
      // Fallback to English.
      const fallback = resolveKey(DICTIONARIES["en-ZA"], key);
      if (fallback !== undefined) {
        if (language !== "en-ZA") logFallback(key, language);
        return interpolate(fallback, vars);
      }
      // Absolute last resort: return the key itself so devs see the gap.
      return key;
    },
    [language],
  );

  const tPlural = useCallback<I18nContextValue["tPlural"]>(
    (key, count, vars) => {
      const suffix = count === 0 ? "_zero" : count === 1 ? "_one" : "_many";
      return t(`${key}${suffix}`, { count, ...(vars ?? {}) });
    },
    [t],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t, tPlural }),
    [language, setLanguage, t, tPlural],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used inside <I18nProvider>");
  }
  return ctx;
}
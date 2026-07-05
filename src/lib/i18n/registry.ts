/**
 * Language registry. Kept in code (not the DB) — it's a small static list
 * and future additions are file drops + a boolean flip, not a data change.
 */
export type LanguageCode = "en-ZA" | "af-ZA";

export interface LanguageEntry {
  code: LanguageCode;
  name_english: string;
  name_native: string;
  is_active: boolean;
  completion_percentage: number;
}

export const LANGUAGES: readonly LanguageEntry[] = [
  {
    code: "en-ZA",
    name_english: "English",
    name_native: "English",
    is_active: true,
    completion_percentage: 100,
  },
  {
    code: "af-ZA",
    name_english: "Afrikaans",
    name_native: "Afrikaans",
    is_active: true,
    completion_percentage: 100,
  },
] as const;

export const DEFAULT_LANGUAGE: LanguageCode = "en-ZA";
export const LANGUAGE_STORAGE_KEY = "cst_language_preference";

export function isSupportedLanguage(code: string | null | undefined): code is LanguageCode {
  return !!code && LANGUAGES.some((l) => l.code === code && l.is_active);
}

export function getLanguage(code: LanguageCode): LanguageEntry {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
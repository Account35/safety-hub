import { z } from "zod";
import { fallback } from "@tanstack/zod-adapter";

export const PAGE_SIZE = 20;

const csv = (allowed: readonly string[]) =>
  z.preprocess(
    (v) => {
      if (Array.isArray(v)) return v.filter((s) => typeof s === "string");
      if (typeof v === "string") return v.split(",").map((s) => s.trim());
      return [];
    },
    z.array(z.string()).default([]),
  )
  .transform((arr) => arr.filter((s) => allowed.includes(s)));

export const WANTED_CATEGORIES = [
  "Violent Crimes",
  "Property Crimes",
  "Fraud",
  "Drug Offenses",
  "Other Crimes",
] as const;

export const WANTED_TIME = ["24h", "7d", "30d", "90d", "all"] as const;
export const SORTS = ["newest", "oldest", "az", "za"] as const;
export const DANGER = ["high", "mediumHigh", "all"] as const;
export const REWARD = ["any", "rewardOnly", "noReward"] as const;

export const wantedSearchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
  q: fallback(z.string(), "").default(""),
  danger: fallback(z.enum(DANGER), "all").default("all"),
  categories: csv(WANTED_CATEGORIES),
  location: fallback(z.string(), "").default(""),
  time: fallback(z.enum(WANTED_TIME), "all").default("all"),
  reward: fallback(z.enum(REWARD), "any").default("any"),
  sort: fallback(z.enum(SORTS), "newest").default("newest"),
});

export type WantedSearch = z.infer<typeof wantedSearchSchema>;

export const MISSING_TIME = ["24h", "48h", "7d", "30d", "all"] as const;
export const AGE_GROUPS = ["child", "teen", "adult", "senior"] as const;
export const VULNERABILITIES = [
  "Minor (under 12)",
  "Minor (teen)",
  "Elderly",
  "Cognitive impairment",
  "Medical condition",
  "Mental health concerns",
  "Possible abduction",
] as const;
export const CIRCUMSTANCES = [
  "voluntary",
  "family_conflict",
  "endangered",
  "medical",
  "unknown",
] as const;

export const missingSearchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
  q: fallback(z.string(), "").default(""),
  time: fallback(z.enum(MISSING_TIME), "all").default("all"),
  ages: csv(AGE_GROUPS),
  vulns: csv(VULNERABILITIES),
  circumstances: csv(CIRCUMSTANCES),
  location: fallback(z.string(), "").default(""),
  sort: fallback(z.enum(SORTS), "newest").default("newest"),
});

export type MissingSearch = z.infer<typeof missingSearchSchema>;

export function timeWindowDays(window: string): number | null {
  switch (window) {
    case "24h":
      return 1;
    case "48h":
      return 2;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return null;
  }
}

export function ageRange(group: string): [number, number] | null {
  switch (group) {
    case "child":
      return [0, 12];
    case "teen":
      return [13, 17];
    case "adult":
      return [18, 59];
    case "senior":
      return [60, 130];
    default:
      return null;
  }
}

export function formatRelative(iso: string | null): string {
  if (!iso) return "Unknown";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function timeMissingLabel(iso: string | null): {
  text: string;
  urgent: boolean;
  critical: boolean;
} {
  if (!iso) return { text: "Unknown", urgent: false, critical: false };
  const diff = Date.now() - new Date(iso).getTime();
  const hours = diff / 3_600_000;
  if (hours < 48)
    return { text: hours < 1 ? "Just reported" : `Missing ${Math.floor(hours)}h`, urgent: true, critical: true };
  const days = Math.floor(hours / 24);
  if (days < 7) return { text: `Missing ${days} days`, urgent: true, critical: false };
  if (days < 30) return { text: `Missing ${days} days`, urgent: false, critical: false };
  const months = Math.floor(days / 30);
  return { text: `Missing ${months} mo`, urgent: false, critical: false };
}
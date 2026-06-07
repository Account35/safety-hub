import { useCallback, useEffect, useState } from "react";
import type { CaseType, ReportDraft, ReportMethod, PrivacyLevel } from "./types";

const KEY = (caseType: CaseType, caseId: string) => `report_draft:${caseType}:${caseId}`;

/**
 * Persisted to sessionStorage. Voice blob is kept in-memory only (object URLs
 * don't survive serialization); on reload, voice draft is lost.
 */
function emptyDraft(caseType: CaseType, caseId: string): ReportDraft {
  return {
    caseType,
    caseId,
    safetyAcknowledged: false,
    methods: [],
    photos: [],
    locationLandmarks: [],
    locationPrivacyLevel: "township",
    accuracyConfirmed: false,
    voluntaryConfirmed: false,
    startedAt: new Date().toISOString(),
  };
}

function read(caseType: CaseType, caseId: string): ReportDraft {
  if (typeof window === "undefined") return emptyDraft(caseType, caseId);
  try {
    const raw = sessionStorage.getItem(KEY(caseType, caseId));
    if (!raw) return emptyDraft(caseType, caseId);
    const parsed = JSON.parse(raw) as ReportDraft;
    // Voice contains object URL that's invalid after reload — drop it.
    if (parsed.voice) parsed.voice = undefined;
    return { ...emptyDraft(caseType, caseId), ...parsed };
  } catch {
    return emptyDraft(caseType, caseId);
  }
}

export function useReportDraft(caseType: CaseType, caseId: string) {
  const [draft, setDraft] = useState<ReportDraft>(() => read(caseType, caseId));

  useEffect(() => {
    setDraft(read(caseType, caseId));
  }, [caseType, caseId]);

  const persist = useCallback(
    (next: ReportDraft) => {
      try {
        // Don't persist huge dataUrls forever — but for the wizard lifetime
        // it's acceptable; sessionStorage limit ~5MB so cap photos at 5.
        const safe = { ...next, voice: undefined };
        sessionStorage.setItem(KEY(caseType, caseId), JSON.stringify(safe));
      } catch {
        // sessionStorage may be full; ignore — in-memory state still works
      }
    },
    [caseType, caseId],
  );

  const update = useCallback(
    (patch: Partial<ReportDraft> | ((d: ReportDraft) => Partial<ReportDraft>)) => {
      setDraft((prev) => {
        const p = typeof patch === "function" ? patch(prev) : patch;
        const next = { ...prev, ...p };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY(caseType, caseId));
    } catch {
      // ignore
    }
  }, [caseType, caseId]);

  return { draft, update, clear };
}

export function toggleMethod(methods: ReportMethod[], m: ReportMethod): ReportMethod[] {
  return methods.includes(m) ? methods.filter((x) => x !== m) : [...methods, m];
}

export const PRIVACY_LABELS: Record<PrivacyLevel, string> = {
  township: "Township Level Only",
  neighborhood: "Neighborhood Level",
  landmark: "Near Landmark",
};
import type { CaseType } from "./types";

export function reportHref(caseType: CaseType, caseId: string) {
  const params = new URLSearchParams({ caseType, caseId });
  return `/report?${params.toString()}`;
}

export function openReportFlow(caseType: CaseType, caseId: string) {
  const href = reportHref(caseType, caseId);
  if (typeof window === "undefined") return href;
  window.location.assign(href);
  return href;
}

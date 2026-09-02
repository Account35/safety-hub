import type { StaffRoleName } from "@/lib/admin/staff.functions";

/** Canonical SAPS rank list and the staff role each rank is granted. */
export const RANK_ROLE: Record<string, StaffRoleName> = {
  Constable: "detective",
  Sergeant: "detective",
  "Warrant Officer": "detective",
  Captain: "analyst",
  "Lieutenant Colonel": "moderator",
  Colonel: "admin",
  Brigadier: "admin",
  "Major General": "super_admin",
  "Lieutenant General": "super_admin",
  General: "super_admin",
};

export const RANKS = Object.keys(RANK_ROLE);

/** Case-insensitive rank lookup; returns null for unrecognized ranks. */
export function resolveRank(input: string): { rank: string; role: StaffRoleName } | null {
  const needle = input.trim().toLowerCase().replace(/\s+/g, " ");
  const match = RANKS.find((r) => r.toLowerCase() === needle);
  if (!match) return null;
  return { rank: match, role: RANK_ROLE[match]! };
}

/** Work email must be name.surname@saps.gov.za */
export const WORK_EMAIL_RE = /^[a-z]+(?:-[a-z]+)*\.[a-z]+(?:-[a-z]+)*@saps\.gov\.za$/;

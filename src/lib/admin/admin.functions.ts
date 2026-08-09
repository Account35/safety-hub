import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Types ─────────────────────────────────────────────────────────────────
export interface AdminReportRow {
  id: string;
  report_id: string;
  case_id: string;
  case_type: string;
  reporter_anon_code: string;
  location_township: string | null;
  confidence_level: number | null;
  status: string;
  submission_timestamp: string;
  quality_tier: string | null;
  quality_score: number | null;
}

export interface AdminOverview {
  totals: {
    reportsToday: number;
    reportsPending: number;
    openConversations: number;
    activeWanted: number;
    activeMissing: number;
  };
  latest: AdminReportRow[];
}

export interface AdminStaffCheck {
  isStaff: boolean;
  roles: string[];
}

export interface AdminCaseRow {
  id: string;
  full_name: string;
  photos: string[];
  status: string;
  subtitle: string | null;
  updated_at: string;
}

// ── Staff check (used by the /admin route gate) ────────────────────────────
export const checkStaffAccess = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminStaffCheck> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    try {
      const { roles } = await requireStaff();
      return { isStaff: true, roles };
    } catch {
      return { isStaff: false, roles: [] };
    }
  },
);

// ── Overview + realtime-backed report feed ────────────────────────────────
export const getAdminOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminOverview> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [today, pending, convos, wanted, missing, latest] = await Promise.all([
      supabaseAdmin
        .from("reports")
        .select("id", { count: "exact", head: true })
        .gte("submission_timestamp", startOfDay.toISOString()),
      supabaseAdmin
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted"),
      supabaseAdmin
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .in("status", ["awaiting_officer", "awaiting_reporter", "open"]),
      supabaseAdmin
        .from("wanted_persons")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabaseAdmin
        .from("missing_persons")
        .select("id", { count: "exact", head: true })
        .eq("case_status", "active"),
      supabaseAdmin
        .from("reports")
        .select(
          "id, report_id, case_id, case_type, reporter_anon_code, location_township, confidence_level, status, submission_timestamp, report_ai_analysis(quality_tier, quality_score)",
        )
        .order("submission_timestamp", { ascending: false })
        .limit(30),
    ]);

    type Joined = Record<string, unknown> & {
      report_ai_analysis?: { quality_tier: string; quality_score: number }[] | null;
    };

    const rows: AdminReportRow[] = ((latest.data ?? []) as Joined[]).map((r) => {
      const analysis = Array.isArray(r.report_ai_analysis) ? r.report_ai_analysis[0] : null;
      return {
        id: r.id as string,
        report_id: r.report_id as string,
        case_id: r.case_id as string,
        case_type: r.case_type as string,
        reporter_anon_code: r.reporter_anon_code as string,
        location_township: (r.location_township as string | null) ?? null,
        confidence_level: (r.confidence_level as number | null) ?? null,
        status: r.status as string,
        submission_timestamp: r.submission_timestamp as string,
        quality_tier: analysis?.quality_tier ?? null,
        quality_score: analysis?.quality_score ?? null,
      };
    });

    return {
      totals: {
        reportsToday: today.count ?? 0,
        reportsPending: pending.count ?? 0,
        openConversations: convos.count ?? 0,
        activeWanted: wanted.count ?? 0,
        activeMissing: missing.count ?? 0,
      },
      latest: rows,
    };
  },
);

export const updateReportStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["submitted", "under_review", "actioned", "closed"]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["detective", "admin", "super_admin"]);
    const { error } = await supabaseAdmin
      .from("reports")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Case management ───────────────────────────────────────────────────────
export const listAdminCases = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: z.enum(["wanted", "missing"]),
        q: z.string().max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<AdminCaseRow[]> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff();

    if (data.kind === "wanted") {
      let q = supabaseAdmin
        .from("wanted_persons")
        .select("id, full_name, photos, is_active, crime_category, updated_at")
        .order("updated_at", { ascending: false })
        .limit(200);
      if (data.q?.trim()) q = q.ilike("full_name", `%${data.q.trim()}%`);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      return (rows ?? []).map((r) => ({
        id: r.id,
        full_name: r.full_name,
        photos: (r.photos ?? []) as string[],
        status: r.is_active ? "active" : "inactive",
        subtitle: r.crime_category ?? null,
        updated_at: r.updated_at,
      }));
    }

    let q = supabaseAdmin
      .from("missing_persons")
      .select("id, full_name, photos, case_status, last_seen_location, updated_at")
      .order("updated_at", { ascending: false })
      .limit(200);
    if (data.q?.trim()) q = q.ilike("full_name", `%${data.q.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      full_name: r.full_name,
      photos: (r.photos ?? []) as string[],
      status: r.case_status,
      subtitle: r.last_seen_location ?? null,
      updated_at: r.updated_at,
    }));
  });

const caseInput = z.object({
  kind: z.enum(["wanted", "missing"]),
  id: z.string().uuid().optional(),
  full_name: z.string().min(2).max(120),
  age: z.number().int().min(0).max(120).nullable().optional(),
  gender: z.string().max(30).nullable().optional(),
  last_seen_location: z.string().max(200).nullable().optional(),
  photo_url: z.string().url().max(600).nullable().optional(),
  // wanted-only
  crime_category: z.string().max(80).nullable().optional(),
  danger_level: z.enum(["high", "medium", "low"]).optional(),
  armed: z.boolean().optional(),
  reward_amount: z.number().min(0).max(10_000_000).nullable().optional(),
  is_active: z.boolean().optional(),
  // missing-only
  circumstances: z
    .enum(["voluntary", "family_conflict", "endangered", "medical", "unknown"])
    .optional(),
  is_endangered: z.boolean().optional(),
  case_status: z.enum(["active", "found", "closed"]).optional(),
});

export const upsertCase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => caseInput.parse(data))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["detective", "admin", "super_admin"]);
    const photos = data.photo_url ? [data.photo_url] : [];

    if (data.kind === "wanted") {
      const payload = {
        full_name: data.full_name,
        age: data.age ?? null,
        gender: data.gender ?? null,
        last_seen_location: data.last_seen_location ?? null,
        crime_category: data.crime_category ?? null,
        danger_level: data.danger_level ?? "medium",
        armed: data.armed ?? false,
        reward_amount: data.reward_amount ?? null,
        is_active: data.is_active ?? true,
        ...(photos.length ? { photos } : {}),
      };
      if (data.id) {
        const { error } = await supabaseAdmin
          .from("wanted_persons")
          .update(payload)
          .eq("id", data.id);
        if (error) throw new Error(error.message);
        return { id: data.id };
      }
      const { data: row, error } = await supabaseAdmin
        .from("wanted_persons")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }

    const payload = {
      full_name: data.full_name,
      age_at_disappearance: data.age ?? null,
      gender: data.gender ?? null,
      last_seen_location: data.last_seen_location ?? null,
      circumstances: data.circumstances ?? "unknown",
      is_endangered: data.is_endangered ?? false,
      case_status: data.case_status ?? "active",
      ...(photos.length ? { photos } : {}),
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("missing_persons")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("missing_persons")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const setCaseStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: z.enum(["wanted", "missing"]),
        id: z.string().uuid(),
        status: z.enum(["active", "found", "closed", "inactive"]),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["detective", "admin", "super_admin"]);

    if (data.kind === "wanted") {
      const { error } = await supabaseAdmin
        .from("wanted_persons")
        .update({ is_active: data.status === "active" })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const next = data.status === "inactive" ? "closed" : data.status;
    const { error } = await supabaseAdmin
      .from("missing_persons")
      .update({ case_status: next as "active" | "found" | "closed" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bulkUploadCases = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        kind: z.enum(["wanted", "missing"]),
        rows: z.array(caseInput.omit({ kind: true, id: true })).min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ inserted: number }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["admin", "super_admin"]);

    if (data.kind === "wanted") {
      const payload = data.rows.map((r) => ({
        full_name: r.full_name,
        age: r.age ?? null,
        gender: r.gender ?? null,
        last_seen_location: r.last_seen_location ?? null,
        crime_category: r.crime_category ?? null,
        danger_level: r.danger_level ?? "medium",
        armed: r.armed ?? false,
        reward_amount: r.reward_amount ?? null,
        is_active: true,
        ...(r.photo_url ? { photos: [r.photo_url] } : {}),
      }));
      const { error, count } = await supabaseAdmin
        .from("wanted_persons")
        .insert(payload, { count: "exact" });
      if (error) throw new Error(error.message);
      return { inserted: count ?? payload.length };
    }

    const payload = data.rows.map((r) => ({
      full_name: r.full_name,
      age_at_disappearance: r.age ?? null,
      gender: r.gender ?? null,
      last_seen_location: r.last_seen_location ?? null,
      circumstances: r.circumstances ?? ("unknown" as const),
      is_endangered: r.is_endangered ?? false,
      case_status: "active" as const,
      ...(r.photo_url ? { photos: [r.photo_url] } : {}),
    }));
    const { error, count } = await supabaseAdmin
      .from("missing_persons")
      .insert(payload, { count: "exact" });
    if (error) throw new Error(error.message);
    return { inserted: count ?? payload.length };
  });
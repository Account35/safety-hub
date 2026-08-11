import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface AdminQueueRow {
  id: string;
  report_id: string;
  case_id: string;
  case_type: string;
  reporter_anon_code: string;
  location_township: string | null;
  confidence_level: number | null;
  status: string;
  priority: string;
  outcome: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  submission_timestamp: string;
  quality_tier: string | null;
  quality_score: number | null;
}

export interface AdminReportDetail extends AdminQueueRow {
  text_description: string | null;
  companion_description: string | null;
  reporting_methods: string[];
  sighting_date: string | null;
  sighting_time: string | null;
  location_landmarks: string[];
  location_approximate: { lat?: number; lng?: number } | null;
  photo_urls: string[];
  voice_url: string | null;
  outcome_notes: string | null;
  case_name: string | null;
  conversation_id: string | null;
  analysis: {
    quality_score: number;
    quality_tier: string;
    quality_factors: string[];
    key_details: { label: string; value: string }[];
    suggested_matches: { label: string; score: number | null }[];
    cluster_id: string | null;
    cluster_confidence: string | null;
    cluster_role: string | null;
  } | null;
}

export interface StaffOption {
  id: string;
  name: string;
  roles: string[];
}

export const listAdminReports = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        status: z.string().max(30).optional(),
        township: z.string().max(80).optional(),
        assignedToMe: z.boolean().optional(),
        q: z.string().max(80).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<AdminQueueRow[]> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const ctx = await requireStaff();
    const { supabaseAdmin } = ctx;

    let q = supabaseAdmin
      .from("reports")
      .select(
        "id, report_id, case_id, case_type, reporter_anon_code, location_township, confidence_level, status, priority, outcome, assigned_to, submission_timestamp, report_ai_analysis(quality_tier, quality_score)",
      )
      .order("submission_timestamp", { ascending: false })
      .limit(300);

    if (data.status) q = q.eq("status", data.status);
    if (data.township) q = q.eq("location_township", data.township);
    if (data.assignedToMe) q = q.eq("assigned_to", ctx.userId);
    if (data.q?.trim()) q = q.ilike("report_id", `%${data.q.trim()}%`);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const assignees = [
      ...new Set((rows ?? []).map((r) => r.assigned_to).filter((v): v is string => !!v)),
    ];
    const names = new Map<string, string>();
    if (assignees.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", assignees);
      for (const p of profiles ?? []) names.set(p.id, p.full_name);
    }

    type Joined = (typeof rows extends (infer R)[] | null ? R : never) & {
      report_ai_analysis?: { quality_tier: string; quality_score: number }[] | null;
    };

    return ((rows ?? []) as Joined[]).map((r) => {
      const a = Array.isArray(r.report_ai_analysis) ? r.report_ai_analysis[0] : null;
      return {
        id: r.id,
        report_id: r.report_id,
        case_id: r.case_id,
        case_type: r.case_type,
        reporter_anon_code: r.reporter_anon_code,
        location_township: r.location_township ?? null,
        confidence_level: r.confidence_level ?? null,
        status: r.status,
        priority: r.priority ?? "normal",
        outcome: r.outcome ?? null,
        assigned_to: r.assigned_to ?? null,
        assigned_name: r.assigned_to ? (names.get(r.assigned_to) ?? null) : null,
        submission_timestamp: r.submission_timestamp,
        quality_tier: a?.quality_tier ?? null,
        quality_score: a?.quality_score ?? null,
      };
    });
  });

export const getAdminReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<AdminReportDetail> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff();

    const { data: r, error } = await supabaseAdmin
      .from("reports")
      .select("*, report_ai_analysis(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!r) throw new Error("Report not found");

    const row = r as Record<string, unknown> & {
      report_ai_analysis?: Record<string, unknown>[] | null;
    };
    const analysisRow = Array.isArray(row.report_ai_analysis) ? row.report_ai_analysis[0] : null;

    // Signed URLs for private evidence buckets (staff-only, 10 minutes).
    const photoPaths = Array.isArray(row.photos)
      ? (row.photos as { path?: string }[]).map((p) => p?.path).filter((p): p is string => !!p)
      : [];
    const photoUrls: string[] = [];
    for (const path of photoPaths) {
      const { data: signed } = await supabaseAdmin.storage
        .from("report-photos")
        .createSignedUrl(path, 600);
      if (signed?.signedUrl) photoUrls.push(signed.signedUrl);
    }
    let voiceUrl: string | null = null;
    if (typeof row.voice_recording_path === "string" && row.voice_recording_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("report-voice")
        .createSignedUrl(row.voice_recording_path, 600);
      voiceUrl = signed?.signedUrl ?? null;
    }

    const { data: convo } = await supabaseAdmin
      .from("conversations")
      .select("id, case_name")
      .eq("report_id", data.id)
      .maybeSingle();

    let assignedName: string | null = null;
    if (row.assigned_to) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("id", row.assigned_to as string)
        .maybeSingle();
      assignedName = p?.full_name ?? null;
    }

    const loc = row.location_approximate as { lat?: number; lng?: number } | null;

    const keyDetails = Object.entries(
      (analysisRow?.key_details_extracted as Record<string, unknown> | null) ?? {},
    ).map(([label, value]) => ({
      label,
      value: Array.isArray(value) ? value.join(", ") : String(value ?? ""),
    }));

    const rawMatches = analysisRow?.suggested_case_matches;
    const suggestedMatches = (Array.isArray(rawMatches) ? rawMatches : []).map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      const label = String(o.case_name ?? o.name ?? o.case_id ?? "Possible match");
      const score = typeof o.score === "number" ? o.score : null;
      return { label, score };
    });

    return {
      id: row.id as string,
      report_id: row.report_id as string,
      case_id: row.case_id as string,
      case_type: row.case_type as string,
      reporter_anon_code: row.reporter_anon_code as string,
      location_township: (row.location_township as string | null) ?? null,
      confidence_level: (row.confidence_level as number | null) ?? null,
      status: row.status as string,
      priority: (row.priority as string | null) ?? "normal",
      outcome: (row.outcome as string | null) ?? null,
      outcome_notes: (row.outcome_notes as string | null) ?? null,
      assigned_to: (row.assigned_to as string | null) ?? null,
      assigned_name: assignedName,
      submission_timestamp: row.submission_timestamp as string,
      text_description: (row.text_description as string | null) ?? null,
      companion_description: (row.companion_description as string | null) ?? null,
      reporting_methods: (row.reporting_methods as string[] | null) ?? [],
      sighting_date: (row.sighting_date as string | null) ?? null,
      sighting_time: (row.sighting_time as string | null) ?? null,
      location_landmarks: (row.location_landmarks as string[] | null) ?? [],
      location_approximate: loc ?? null,
      photo_urls: photoUrls,
      voice_url: voiceUrl,
      case_name: convo?.case_name ?? null,
      conversation_id: convo?.id ?? null,
      quality_tier: (analysisRow?.quality_tier as string | null) ?? null,
      quality_score: (analysisRow?.quality_score as number | null) ?? null,
      analysis: analysisRow
        ? {
            quality_score: analysisRow.quality_score as number,
            quality_tier: analysisRow.quality_tier as string,
            quality_factors: (analysisRow.quality_factors as string[] | null) ?? [],
            key_details: keyDetails,
            suggested_matches: suggestedMatches,
            cluster_id: (analysisRow.cluster_id as string | null) ?? null,
            cluster_confidence: (analysisRow.cluster_confidence as string | null) ?? null,
            cluster_role: (analysisRow.cluster_role as string | null) ?? null,
          }
        : null,
    };
  });

export const listStaff = createServerFn({ method: "GET" }).handler(
  async (): Promise<StaffOption[]> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff();

    const { data: roleRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["detective", "analyst", "moderator", "admin", "super_admin"]);
    if (error) throw new Error(error.message);

    const byUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
    }
    const ids = [...byUser.keys()];
    if (!ids.length) return [];

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, is_test_seed_account")
      .in("id", ids);
    const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const testSeeds = new Set(
      (profiles ?? []).filter((p) => p.is_test_seed_account).map((p) => p.id),
    );

    return ids
      .map((id) => ({
        id,
        name: `${names.get(id) || "Unnamed staff"}${testSeeds.has(id) ? " (test account)" : ""}`,
        roles: byUser.get(id) ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
);

export const assignReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        assignedTo: z.string().uuid().nullable(),
        priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["detective", "admin", "super_admin"]);

    const { error } = await ctx.supabaseAdmin
      .from("reports")
      .update({
        assigned_to: data.assignedTo,
        assigned_at: data.assignedTo ? new Date().toISOString() : null,
        ...(data.priority ? { priority: data.priority } : {}),
        ...(data.assignedTo ? { status: "under_review" } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await logAdminAction(ctx, "report.assign", "report", data.id, {
      assigned_to: data.assignedTo,
      priority: data.priority ?? null,
    });
    return { ok: true };
  });

export const recordReportOutcome = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        outcome: z.enum([
          "verified",
          "arrest_made",
          "person_located",
          "duplicate",
          "insufficient_detail",
          "false_lead",
          "dismissed",
        ]),
        notes: z.string().max(2000).optional(),
        closeReport: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["detective", "admin", "super_admin"]);

    const { error } = await ctx.supabaseAdmin
      .from("reports")
      .update({
        outcome: data.outcome,
        outcome_notes: data.notes ?? null,
        status: data.closeReport === false ? "actioned" : "closed",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await logAdminAction(ctx, "report.outcome", "report", data.id, {
      outcome: data.outcome,
      closed: data.closeReport !== false,
    });
    return { ok: true };
  });
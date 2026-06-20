import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const photoSchema = z.object({
  path: z.string().min(1).max(500),
  caption: z.string().max(150).default(""),
});

const submitSchema = z.object({
  caseId: z.string().uuid(),
  caseType: z.enum(["wanted", "missing"]),
  reporterAnonCode: z.string().min(4).max(64),
  methods: z.array(z.enum(["text", "voice", "photo"])).min(1).max(3),
  sightingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sightingTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
  textDescription: z.string().max(1000).optional().nullable(),
  companionDescription: z.string().max(300).optional().nullable(),
  confidenceLevel: z.number().int().min(1).max(5).optional().nullable(),
  voiceRecordingPath: z.string().max(500).optional().nullable(),
  photos: z.array(photoSchema).max(5).default([]),
  locationApproximate: z
    .object({ lat: z.number(), lng: z.number() })
    .optional()
    .nullable(),
  locationTownship: z.string().max(200).optional().nullable(),
  locationLandmarks: z.array(z.string().max(200)).max(5).default([]),
  locationPrivacyLevel: z.enum(["township", "neighborhood", "landmark"]),
  safetyAcknowledgment: z.literal(true),
  accuracyConfirmed: z.literal(true),
  voluntaryConfirmed: z.literal(true),
});

function isServiceRoleKey(key: string): boolean {
  try {
    const payload = JSON.parse(atob(key.split(".")[1]!)) as { role?: string };
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

/** Client for report inserts — uses service role when available, otherwise RLS-aware user/anon client. */
async function getReportInsertClient(
  authHeader: string | null | undefined,
): Promise<SupabaseClient<Database>> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && isServiceRoleKey(serviceRoleKey)) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }

  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  const token = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : null;
  if (token) {
    return createClient<Database>(url, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
  }

  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
}

function generateReportId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 4; i++) suffix += alphabet[arr[i] % alphabet.length];
  return `RPT-${y}-${m}${d}-${suffix}`;
}

export const submitReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitSchema.parse(data))
  .handler(async ({ data }): Promise<{ reportId: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify the case exists & is active.
    const table = data.caseType === "wanted" ? "wanted_persons" : "missing_persons";
    const activeFilter = data.caseType === "wanted"
      ? { col: "is_active", val: true as const }
      : { col: "case_status", val: "active" as const };
    const { data: caseRow, error: caseErr } = await supabaseAdmin
      .from(table)
      .select("id")
      .eq("id", data.caseId)
      .eq(activeFilter.col, activeFilter.val as never)
      .maybeSingle();
    if (caseErr) throw new Error(caseErr.message);
    if (!caseRow) throw new Error("Case not found or inactive.");

    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const authHeader = getRequestHeader("authorization");

    // Resolve authenticated user id (optional).
    let reporterId: string | null = null;
    try {
      if (authHeader?.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.slice(7);
        const { data: u } = await supabaseAdmin.auth.getUser(token);
        reporterId = u.user?.id ?? null;
      }
    } catch {
      reporterId = null;
    }

    const insertClient = await getReportInsertClient(authHeader);

    // Retry on report_id collision (very unlikely).
    for (let attempt = 0; attempt < 3; attempt++) {
      const reportId = generateReportId();
      const { error } = await insertClient.from("reports").insert({
        report_id: reportId,
        case_id: data.caseId,
        case_type: data.caseType,
        reporter_id: reporterId,
        reporter_anon_code: data.reporterAnonCode,
        reporting_methods: data.methods,
        sighting_date: data.sightingDate ?? null,
        sighting_time: data.sightingTime ?? null,
        text_description: data.textDescription ?? null,
        companion_description: data.companionDescription ?? null,
        confidence_level: data.confidenceLevel ?? null,
        voice_recording_path: data.voiceRecordingPath ?? null,
        photos: data.photos,
        location_approximate: data.locationApproximate ?? null,
        location_township: data.locationTownship ?? null,
        location_landmarks: data.locationLandmarks,
        location_privacy_level: data.locationPrivacyLevel,
        safety_acknowledgment: true,
        accuracy_confirmed: true,
        voluntary_confirmed: true,
      });
      if (!error) return { reportId };
      if (!/duplicate key/i.test(error.message)) throw new Error(error.message);
    }
    throw new Error("Could not generate a unique report reference. Please try again.");
  });

const summarySchema = z.object({
  caseType: z.enum(["wanted", "missing"]),
  caseId: z.string().uuid(),
});

export interface CaseSummary {
  id: string;
  caseType: "wanted" | "missing";
  fullName: string;
  photo: string | null;
}

export const getCaseSummary = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => summarySchema.parse(data))
  .handler(async ({ data }): Promise<CaseSummary | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.caseType === "wanted") {
      const { data: row, error } = await supabaseAdmin
        .from("wanted_persons")
        .select("id, full_name, photos")
        .eq("id", data.caseId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) return null;
      return {
        id: row.id,
        caseType: "wanted",
        fullName: row.full_name,
        photo: row.photos?.[0] ?? null,
      };
    }
    const { data: row, error } = await supabaseAdmin
      .from("missing_persons")
      .select("id, full_name, photos")
      .eq("id", data.caseId)
      .eq("case_status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      id: row.id,
      caseType: "missing",
      fullName: row.full_name,
      photo: row.photos?.[0] ?? null,
    };
  });
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  email_verified: boolean;
  phone_number: string | null;
  phone_verified: boolean;
  primary_township: string | null;
  language_preference: string;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
}

export interface NotificationPrefs {
  new_message_notifications: boolean;
  report_status_notifications: boolean;
  delivery_channel: "push" | "email" | "both";
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface PrivacySettings {
  location_sharing_level: "township" | "neighborhood" | "landmark";
  data_retention_acknowledged: boolean;
}

export interface ReportHistoryItem {
  id: string;
  report_id: string;
  case_id: string;
  case_type: "wanted" | "missing";
  status: "submitted" | "under_review" | "investigated" | "resolved";
  submission_timestamp: string;
  reporting_methods: string[];
  text_description: string | null;
  voice_recording_path: string | null;
  photos: { path: string; caption: string }[];
  location_township: string | null;
  sighting_date: string | null;
  sighting_time: string | null;
  case_name?: string;
  case_photo?: string | null;
  conversation_id?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function getAdminAndUser() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const auth = getRequestHeader("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  return { supabaseAdmin, user };
}

// ── Profile ────────────────────────────────────────────────────────────────

export const getProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserProfile> => {
    const { supabaseAdmin, user } = await getAdminAndUser();
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) throw new Error(error.message);
    return {
      id: user.id,
      full_name: data.full_name,
      email: user.email ?? "",
      email_verified: !!user.email_confirmed_at,
      phone_number: (data as Record<string, unknown>).phone_number as string | null ?? null,
      phone_verified: (data as Record<string, unknown>).phone_verified as boolean ?? false,
      primary_township: (data as Record<string, unknown>).primary_township as string | null ?? null,
      language_preference: (data as Record<string, unknown>).language_preference as string ?? "English",
      avatar_url: (data as Record<string, unknown>).avatar_url as string | null ?? null,
      last_login_at: (data as Record<string, unknown>).last_login_at as string | null ?? null,
      created_at: data.created_at,
    };
  }
);

export const updateProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      full_name: z.string().trim().min(2).max(100).optional(),
      phone_number: z.string().nullable().optional(),
      primary_township: z.string().nullable().optional(),
      language_preference: z.string().optional(),
      avatar_url: z.string().nullable().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await getAdminAndUser();
    const { error } = await (supabaseAdmin as unknown as { from: (t: string) => { update: (v: unknown) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } })
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Report history ─────────────────────────────────────────────────────────

export const getMyReports = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ page: z.number().int().min(1).default(1), caseType: z.enum(["all", "wanted", "missing"]).default("all") }).parse(d)
  )
  .handler(async ({ data }): Promise<{ items: ReportHistoryItem[]; total: number }> => {
    const { supabaseAdmin, user } = await getAdminAndUser();
    const PAGE = 10;
    let q = supabaseAdmin
      .from("reports")
      .select("*", { count: "exact" })
      .eq("reporter_id", user.id)
      .order("submission_timestamp", { ascending: false });
    if (data.caseType !== "all") q = q.eq("case_type", data.caseType);
    const from = (data.page - 1) * PAGE;
    const { data: rows, count, error } = await q.range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);

    // Enrich with case name/photo and conversation id
    const items: ReportHistoryItem[] = await Promise.all(
      (rows ?? []).map(async (r) => {
        let case_name: string | undefined;
        let case_photo: string | null | undefined;

        if (r.case_type === "wanted") {
          const { data: c } = await supabaseAdmin
            .from("wanted_persons")
            .select("full_name, photos")
            .eq("id", r.case_id)
            .maybeSingle();
          case_name = c?.full_name;
          case_photo = c?.photos?.[0] ?? null;
        } else {
          const { data: c } = await supabaseAdmin
            .from("missing_persons")
            .select("full_name, photos")
            .eq("id", r.case_id)
            .maybeSingle();
          case_name = c?.full_name;
          case_photo = c?.photos?.[0] ?? null;
        }

        const { data: conv } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .eq("report_id", r.report_id)
          .maybeSingle();

        return {
          id: r.id,
          report_id: r.report_id,
          case_id: r.case_id,
          case_type: r.case_type as "wanted" | "missing",
          status: r.status as ReportHistoryItem["status"],
          submission_timestamp: r.submission_timestamp,
          reporting_methods: r.reporting_methods,
          text_description: r.text_description,
          voice_recording_path: r.voice_recording_path,
          photos: (r.photos as { path: string; caption: string }[]) ?? [],
          location_township: r.location_township,
          sighting_date: r.sighting_date,
          sighting_time: r.sighting_time,
          case_name,
          case_photo,
          conversation_id: conv?.id ?? null,
        };
      })
    );

    return { items, total: count ?? 0 };
  });

// ── Notification preferences ───────────────────────────────────────────────

export const getNotificationPrefs = createServerFn({ method: "GET" }).handler(
  async (): Promise<NotificationPrefs> => {
    const { supabaseAdmin, user } = await getAdminAndUser();
    const { data } = await (supabaseAdmin as unknown as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> } } } })
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    return {
      new_message_notifications: (data?.new_message_notifications as boolean | undefined) ?? true,
      report_status_notifications: (data?.report_status_notifications as boolean | undefined) ?? true,
      delivery_channel: (data?.delivery_channel as NotificationPrefs["delivery_channel"]) ?? "push",
      quiet_hours_enabled: (data?.quiet_hours_enabled as boolean | undefined) ?? false,
      quiet_hours_start: (data?.quiet_hours_start as string | undefined) ?? "22:00",
      quiet_hours_end: (data?.quiet_hours_end as string | undefined) ?? "07:00",
    };
  }
);

export const updateNotificationPrefs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      new_message_notifications: z.boolean().optional(),
      report_status_notifications: z.boolean().optional(),
      delivery_channel: z.enum(["push", "email", "both"]).optional(),
      quiet_hours_enabled: z.boolean().optional(),
      quiet_hours_start: z.string().optional(),
      quiet_hours_end: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await getAdminAndUser();
    await (supabaseAdmin as unknown as { from: (t: string) => { upsert: (v: unknown) => Promise<{ error: unknown }> } })
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...data, updated_at: new Date().toISOString() });
    return { ok: true };
  });

// ── Privacy settings ───────────────────────────────────────────────────────

export const getPrivacySettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PrivacySettings> => {
    const { supabaseAdmin, user } = await getAdminAndUser();
    const { data } = await (supabaseAdmin as unknown as { from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> } } } })
      .from("privacy_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    return {
      location_sharing_level: (data?.location_sharing_level as PrivacySettings["location_sharing_level"]) ?? "township",
      data_retention_acknowledged: (data?.data_retention_acknowledged as boolean | undefined) ?? false,
    };
  }
);

export const updatePrivacySettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      location_sharing_level: z.enum(["township", "neighborhood", "landmark"]).optional(),
      data_retention_acknowledged: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await getAdminAndUser();
    await (supabaseAdmin as unknown as { from: (t: string) => { upsert: (v: unknown) => Promise<{ error: unknown }> } })
      .from("privacy_settings")
      .upsert({ user_id: user.id, ...data, updated_at: new Date().toISOString() });
    return { ok: true };
  });

// ── Password change ────────────────────────────────────────────────────────

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }).parse(d)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, user } = await getAdminAndUser();
    // Verify current password by attempting sign-in
    const { error: verifyErr } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: data.currentPassword,
    });
    if (verifyErr) throw new Error("Current password is incorrect");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.newPassword,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Account deletion ───────────────────────────────────────────────────────

export const deleteAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ confirmation: z.literal("DELETE") }).parse(d))
  .handler(async () => {
    const { supabaseAdmin, user } = await getAdminAndUser();
    // Delete profile (cascades to notification_preferences, privacy_settings via FK)
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    return { ok: true };
  });

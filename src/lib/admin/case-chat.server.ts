import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface ThreadRow {
  id: string;
  status: string;
  officer_id: string | null;
  reporter_anon_code: string;
  last_activity_at: string;
  created_at: string;
}

export type EnsureThreadResult =
  | { ok: true; thread: ThreadRow }
  | { ok: false; reason: "not_assigned" | "no_account" | "missing_report" };

/**
 * Ensures the report has a case-scoped conversation and that its officer_id
 * matches the currently assigned official. Never leaks reporter identity to
 * callers — only anonymity-safe thread columns are returned.
 */
export async function ensureCaseThread(
  supabaseAdmin: SupabaseClient<Database>,
  reportId: string,
): Promise<EnsureThreadResult> {
  const { data: report, error } = await supabaseAdmin
    .from("reports")
    .select("id, report_id, case_id, case_type, reporter_id, reporter_anon_code, assigned_to")
    .eq("id", reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!report) return { ok: false, reason: "missing_report" };
  if (!report.assigned_to) return { ok: false, reason: "not_assigned" };
  if (!report.reporter_id) return { ok: false, reason: "no_account" };

  const select = "id, status, officer_id, reporter_anon_code, last_activity_at, created_at";
  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select(select)
    .eq("report_id", reportId)
    .maybeSingle();

  if (existing) {
    if (existing.officer_id !== report.assigned_to) {
      const { data: updated, error: upErr } = await supabaseAdmin
        .from("conversations")
        .update({ officer_id: report.assigned_to })
        .eq("id", existing.id)
        .select(select)
        .single();
      if (upErr) throw new Error(upErr.message);
      await supabaseAdmin.from("messages").insert({
        conversation_id: existing.id,
        sender_type: "system",
        message_content:
          "A SAPS official has been assigned to your report and can now message you here.",
      });
      return { ok: true, thread: updated as ThreadRow };
    }
    return { ok: true, thread: existing as ThreadRow };
  }

  const { data: created, error: insErr } = await supabaseAdmin
    .from("conversations")
    .insert({
      report_id: report.id,
      case_id: report.case_id,
      case_type: report.case_type,
      reporter_id: report.reporter_id,
      reporter_anon_code: report.reporter_anon_code,
      officer_id: report.assigned_to,
      status: "awaiting_reporter",
      case_name: report.report_id,
    })
    .select(select)
    .single();
  if (insErr) throw new Error(insErr.message);

  await supabaseAdmin.from("messages").insert({
    conversation_id: created.id,
    sender_type: "system",
    message_content:
      "A SAPS official has been assigned to your report and can now message you here. Never share personal details you are not comfortable sharing.",
  });

  return { ok: true, thread: created as ThreadRow };
}

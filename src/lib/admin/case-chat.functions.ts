import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type CaseThreadState = "ready" | "not_assigned" | "no_account" | "missing_report";

export interface CaseChatMessage {
  id: string;
  sender_type: "reporter" | "officer" | "system";
  message_content: string;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  is_deleted: boolean;
  attachment_reference: string | null;
  conversation_id: string;
}

export interface CaseThread {
  state: CaseThreadState;
  /** Anonymity-safe thread meta. No reporter identity is ever included. */
  thread: {
    id: string;
    status: string;
    reporter_anon_code: string;
    last_activity_at: string;
    created_at: string;
    is_mine: boolean;
    readOnly: boolean;
  } | null;
  messages: CaseChatMessage[];
}

const CLOSED = ["closed", "archived"];

/** Officer view of the case thread: creates it lazily when the report is assigned. */
export const getCaseThread = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<CaseThread> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { ensureCaseThread } = await import("@/lib/admin/case-chat.server");
    const ctx = await requireStaff();

    const result = await ensureCaseThread(ctx.supabaseAdmin, data.reportId);
    if (!result.ok) return { state: result.reason, thread: null, messages: [] };

    const { data: rows, error } = await ctx.supabaseAdmin
      .from("messages")
      .select(
        "id, conversation_id, sender_type, message_content, attachment_reference, is_deleted, sent_at, delivered_at, read_at",
      )
      .eq("conversation_id", result.thread.id)
      .eq("is_deleted", false)
      .order("sent_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);

    return {
      state: "ready",
      thread: {
        id: result.thread.id,
        status: result.thread.status,
        reporter_anon_code: result.thread.reporter_anon_code,
        last_activity_at: result.thread.last_activity_at,
        created_at: result.thread.created_at,
        is_mine: result.thread.officer_id === ctx.userId,
        readOnly: CLOSED.includes(result.thread.status),
      },
      messages: (rows ?? []) as CaseChatMessage[],
    };
  });

/** Sends an officer message. Only the assigned official (or admins) may send. */
export const sendCaseMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ reportId: z.string().uuid(), content: z.string().trim().min(1).max(500) })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { ensureCaseThread } = await import("@/lib/admin/case-chat.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff();

    const result = await ensureCaseThread(ctx.supabaseAdmin, data.reportId);
    if (!result.ok) throw new Error("This report has no active case thread.");
    if (CLOSED.includes(result.thread.status)) throw new Error("This conversation is closed.");

    const isAdmin = ctx.roles.some((r) => r === "admin" || r === "super_admin");
    if (result.thread.officer_id !== ctx.userId && !isAdmin) {
      throw new Error("Only the assigned official can message this reporter.");
    }

    const { error } = await ctx.supabaseAdmin.from("messages").insert({
      conversation_id: result.thread.id,
      sender_type: "officer",
      message_content: data.content.trim(),
    });
    if (error) throw new Error(error.message);

    await logAdminAction(ctx, "case_chat.message", "conversation", result.thread.id, {
      report_id: data.reportId,
      length: data.content.trim().length,
    });
    return { ok: true };
  });

/** Marks reporter messages in the thread as read by staff. */
export const markCaseThreadRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ reportId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const ctx = await requireStaff();

    const { data: convo } = await ctx.supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("report_id", data.reportId)
      .maybeSingle();
    if (!convo) return { ok: true };

    await ctx.supabaseAdmin
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", convo.id)
      .eq("sender_type", "reporter")
      .is("read_at", null);
    return { ok: true };
  });

/** Closes the case thread; history is preserved and becomes read-only. */
export const closeCaseThread = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ reportId: z.string().uuid(), reason: z.string().trim().max(300).optional() }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["detective", "admin", "super_admin"]);

    const { data: convo } = await ctx.supabaseAdmin
      .from("conversations")
      .select("id, status")
      .eq("report_id", data.reportId)
      .maybeSingle();
    if (!convo) throw new Error("This report has no case thread.");
    if (CLOSED.includes(convo.status)) return { ok: true };

    const { error } = await ctx.supabaseAdmin
      .from("conversations")
      .update({ status: "closed", closure_reason: data.reason ?? null })
      .eq("id", convo.id);
    if (error) throw new Error(error.message);

    await ctx.supabaseAdmin.from("messages").insert({
      conversation_id: convo.id,
      sender_type: "system",
      message_content: "A SAPS official has closed this conversation. Your history is preserved.",
    });

    await logAdminAction(ctx, "case_chat.close", "conversation", convo.id, {
      report_id: data.reportId,
      reason: data.reason ?? null,
    });
    return { ok: true };
  });

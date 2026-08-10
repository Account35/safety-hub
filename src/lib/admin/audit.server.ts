import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { StaffContext } from "./admin.server";

/**
 * Appends an immutable entry to the admin audit log. Never throws into the
 * caller's happy path — a failed audit write is logged, not fatal, so a
 * legitimate staff action is never lost because of logging.
 */
export async function logAdminAction(
  ctx: StaffContext,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  const supabase = ctx.supabaseAdmin as SupabaseClient<Database>;
  const { error } = await supabase.from("admin_audit_log").insert({
    actor_id: ctx.userId,
    actor_roles: ctx.roles,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details as never,
  });
  if (error) console.error("[audit] failed to record action", action, error.message);
}
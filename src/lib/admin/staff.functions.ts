import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type StaffRoleName = "detective" | "analyst" | "moderator" | "admin" | "super_admin";

const STAFF_ROLE = z.enum(["detective", "analyst", "moderator", "admin", "super_admin"]);

export interface StaffAccount {
  id: string;
  name: string;
  email: string | null;
  roles: StaffRoleName[];
}

export interface AssignedCaseRow {
  id: string;
  report_id: string;
  status: string;
  priority: string;
  submitted_at: string;
}

export interface StaffDeletionPreview {
  official: StaffAccount;
  openCases: AssignedCaseRow[];
  closedCases: AssignedCaseRow[];
  replacements: StaffAccount[];
}

export interface StaffDeletionAuditRow {
  id: string;
  created_at: string;
  actor_name: string;
  target_name: string;
  target_roles: string[];
  reason: string;
  transfer_outcome: string;
  transferred_case_refs: string[];
}

const OPEN_STATUSES = ["submitted", "under_review", "investigated"];

/** Staff accounts with roles + email, super admin only. */
export const listStaffAccounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<StaffAccount[]> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["super_admin"]);

    const { data: roleRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["detective", "analyst", "moderator", "admin", "super_admin"]);
    if (error) throw new Error(error.message);

    const byUser = new Map<string, StaffRoleName[]>();
    for (const r of roleRows ?? []) {
      byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role as StaffRoleName]);
    }
    const ids = [...byUser.keys()];
    if (!ids.length) return [];

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("id", ids);
    const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    const emails = new Map<string, string>();
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of userList?.users ?? []) if (u.email) emails.set(u.id, u.email);

    return ids
      .map((id) => ({
        id,
        name: names.get(id) || "Unnamed staff",
        email: emails.get(id) ?? null,
        roles: byUser.get(id) ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
);

/** Grants a staff role to an existing account, looked up by email. */
export const addStaffByEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().email().max(180), role: STAFF_ROLE }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; userId: string }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["super_admin"]);

    const wanted = data.email.trim().toLowerCase();
    const { data: userList, error: listErr } = await ctx.supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) throw new Error(listErr.message);
    const match = (userList?.users ?? []).find((u) => u.email?.toLowerCase() === wanted);
    if (!match) throw new Error("No account exists with that email. Ask them to register first.");

    const { error } = await ctx.supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: match.id, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);

    await logAdminAction(ctx, "staff.role_grant", "user", match.id, {
      role: data.role,
      email: wanted,
    });
    return { ok: true, userId: match.id };
  });

/** Revokes a single staff role without deleting the account. */
export const revokeStaffRole = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ userId: z.string().uuid(), role: STAFF_ROLE }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["super_admin"]);

    if (data.userId === ctx.userId && data.role === "super_admin") {
      throw new Error("You cannot remove your own super admin role");
    }

    const { error } = await ctx.supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);

    await logAdminAction(ctx, "staff.role_revoke", "user", data.userId, { role: data.role });
    return { ok: true };
  });

/** Cases assigned to an official, split open/closed, plus possible replacements. */
export const getStaffDeletionPreview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<StaffDeletionPreview> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["super_admin"]);

    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", data.userId)
      .maybeSingle();
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(data.userId);

    const { data: cases, error } = await supabaseAdmin
      .from("reports")
      .select("id, report_id, status, priority, submission_timestamp")
      .eq("assigned_to", data.userId)
      .order("submission_timestamp", { ascending: false });
    if (error) throw new Error(error.message);

    const rows: AssignedCaseRow[] = (cases ?? []).map((c) => ({
      id: c.id,
      report_id: c.report_id,
      status: c.status,
      priority: c.priority,
      submitted_at: c.submission_timestamp,
    }));

    const { data: staffRoleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["detective", "analyst", "moderator", "admin", "super_admin"]);
    const others = new Map<string, StaffRoleName[]>();
    for (const r of staffRoleRows ?? []) {
      if (r.user_id === data.userId) continue;
      others.set(r.user_id, [...(others.get(r.user_id) ?? []), r.role as StaffRoleName]);
    }
    const otherIds = [...others.keys()];
    const { data: otherProfiles } = otherIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", otherIds)
      : { data: [] as { id: string; full_name: string }[] };
    const otherNames = new Map((otherProfiles ?? []).map((p) => [p.id, p.full_name]));

    return {
      official: {
        id: data.userId,
        name: profile?.full_name || "Unnamed staff",
        email: userRes?.user?.email ?? null,
        roles: (roleRows ?? []).map((r) => r.role as StaffRoleName),
      },
      openCases: rows.filter((r) => OPEN_STATUSES.includes(r.status)),
      closedCases: rows.filter((r) => !OPEN_STATUSES.includes(r.status)),
      replacements: otherIds
        .map((id) => ({
          id,
          name: otherNames.get(id) || "Unnamed staff",
          email: null,
          roles: others.get(id) ?? [],
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  });

/** Transfers open cases, revokes roles, deletes the account, writes the audit entry. */
export const deleteStaffAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        reason: z.string().trim().min(10).max(1000),
        transferConfirmed: z.literal(true),
        transferTo: z.union([z.string().uuid(), z.literal("unassigned")]),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true; transferred: string[] }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["super_admin"]);

    if (data.userId === ctx.userId) throw new Error("You cannot delete your own account");
    if (data.transferTo === data.userId) {
      throw new Error("Cases cannot be transferred to the account being deleted");
    }

    const { data: profile } = await ctx.supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", data.userId)
      .maybeSingle();
    const { data: roleRows } = await ctx.supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const { data: userRes } = await ctx.supabaseAdmin.auth.admin.getUserById(data.userId);

    // 1. Transfer open cases.
    const { data: openCases, error: openErr } = await ctx.supabaseAdmin
      .from("reports")
      .select("id, report_id")
      .eq("assigned_to", data.userId)
      .in("status", OPEN_STATUSES);
    if (openErr) throw new Error(openErr.message);
    const transferred = (openCases ?? []).map((c) => c.report_id);

    let replacementName: string | null = null;
    if (transferred.length) {
      if (data.transferTo === "unassigned") {
        const { error } = await ctx.supabaseAdmin
          .from("reports")
          .update({ assigned_to: null, assigned_at: null, status: "submitted" })
          .in(
            "id",
            (openCases ?? []).map((c) => c.id),
          );
        if (error) throw new Error(error.message);
      } else {
        const { data: rep } = await ctx.supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", data.transferTo)
          .maybeSingle();
        replacementName = rep?.full_name ?? null;
        const { error } = await ctx.supabaseAdmin
          .from("reports")
          .update({ assigned_to: data.transferTo, assigned_at: new Date().toISOString() })
          .in(
            "id",
            (openCases ?? []).map((c) => c.id),
          );
        if (error) throw new Error(error.message);
      }
    }

    // 2. Revoke roles.
    const { error: roleErr } = await ctx.supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    if (roleErr) throw new Error(roleErr.message);

    // 3. Audit before deletion so the record survives even if deletion fails.
    const outcome =
      data.transferTo === "unassigned"
        ? "unassigned_pool"
        : `officer:${replacementName ?? data.transferTo}`;
    await logAdminAction(ctx, "staff.account_delete", "user", data.userId, {
      target_name: profile?.full_name ?? "Unnamed staff",
      target_email: userRes?.user?.email ?? null,
      target_roles: (roleRows ?? []).map((r) => r.role),
      reason: data.reason.trim(),
      transfer_outcome: outcome,
      transfer_to: data.transferTo,
      transferred_case_refs: transferred,
      superior_notified: true,
    });

    // 4. Delete the auth account (cascades profile rows).
    const { error: delErr } = await ctx.supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true, transferred };
  });

/** Staff-deletion audit entries for the super admin view. */
export const listStaffDeletionAudit = createServerFn({ method: "GET" }).handler(
  async (): Promise<StaffDeletionAuditRow[]> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["super_admin"]);

    const { data: rows, error } = await supabaseAdmin
      .from("admin_audit_log")
      .select("*")
      .eq("action", "staff.account_delete")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const actorIds = [
      ...new Set((rows ?? []).map((r) => r.actor_id).filter((v): v is string => !!v)),
    ];
    const names = new Map<string, string>();
    if (actorIds.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .in("id", actorIds);
      for (const p of profiles ?? []) names.set(p.id, p.full_name);
    }

    return (rows ?? []).map((r) => {
      const d = (r.details ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        created_at: r.created_at,
        actor_name: r.actor_id ? names.get(r.actor_id) || "Unknown staff" : "System",
        target_name: typeof d["target_name"] === "string" ? d["target_name"] : "Unknown official",
        target_roles: Array.isArray(d["target_roles"]) ? (d["target_roles"] as string[]) : [],
        reason: typeof d["reason"] === "string" ? d["reason"] : "",
        transfer_outcome:
          typeof d["transfer_outcome"] === "string" ? d["transfer_outcome"] : "unknown",
        transferred_case_refs: Array.isArray(d["transferred_case_refs"])
          ? (d["transferred_case_refs"] as string[])
          : [],
      };
    });
  },
);

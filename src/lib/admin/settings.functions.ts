import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface AdminSettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  actor_name: string;
  actor_roles: string[];
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  name: string;
  roles: string[];
}

export const getAdminSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminSettingRow[]> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff();
    const { data, error } = await supabaseAdmin
      .from("admin_settings")
      .select("key, value, updated_at")
      .order("key");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      key: r.key,
      value: JSON.stringify(r.value, null, 2),
      updated_at: r.updated_at,
    }));
  },
);

export const updateAdminSetting = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ key: z.string().min(2).max(80), value: z.string().max(8000) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["admin", "super_admin"]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(data.value);
    } catch {
      throw new Error("Value must be valid JSON");
    }

    const { error } = await ctx.supabaseAdmin
      .from("admin_settings")
      .upsert(
        { key: data.key, value: parsed as never, updated_by: ctx.userId },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);

    await logAdminAction(ctx, "settings.update", "admin_setting", data.key, { value: parsed });
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ q: z.string().max(80).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<AuditEntry[]> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff();

    let query = supabaseAdmin
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.q?.trim()) query = query.ilike("action", `%${data.q.trim()}%`);

    const { data: rows, error } = await query;
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

    return (rows ?? []).map((r) => ({
      id: r.id,
      actor_name: r.actor_id ? (names.get(r.actor_id) || "Unknown staff") : "System",
      actor_roles: (r.actor_roles ?? []) as string[],
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      details: JSON.stringify(r.details ?? {}),
      created_at: r.created_at,
    }));
  });

export const listAdminUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminUserRow[]> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["admin", "super_admin"]);

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
      .select("id, full_name")
      .in("id", ids);
    const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    return ids
      .map((id) => ({ id, name: names.get(id) || "Unnamed staff", roles: byUser.get(id) ?? [] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
);

export const setStaffRole = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["detective", "analyst", "moderator", "admin", "super_admin"]),
        grant: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["super_admin"]);

    if (data.grant) {
      const { error } = await ctx.supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      if (data.userId === ctx.userId && data.role === "super_admin") {
        throw new Error("You cannot remove your own super admin role");
      }
      const { error } = await ctx.supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }

    await logAdminAction(ctx, data.grant ? "role.grant" : "role.revoke", "user", data.userId, {
      role: data.role,
    });
    return { ok: true };
  });
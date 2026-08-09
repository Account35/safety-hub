import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getAuthenticatedUser } from "@/lib/supabase-auth";

export type AdminRole = "detective" | "analyst" | "moderator" | "admin" | "super_admin";

const STAFF_ROLES: AdminRole[] = ["detective", "analyst", "moderator", "admin", "super_admin"];

export interface StaffContext {
  supabaseAdmin: SupabaseClient<Database>;
  userId: string;
  roles: AdminRole[];
}

/** Verifies the caller is signed in AND holds a staff role. Throws otherwise. */
export async function requireStaff(allowed: AdminRole[] = STAFF_ROLES): Promise<StaffContext> {
  const { supabaseAdmin, user } = await getAuthenticatedUser();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);

  const roles = (data ?? [])
    .map((r) => r.role as AdminRole)
    .filter((r) => STAFF_ROLES.includes(r));

  if (!roles.some((r) => allowed.includes(r))) throw new Error("Forbidden");
  return { supabaseAdmin, userId: user.id, roles };
}
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function getRequestAuthToken(): Promise<string | null> {
  const { getRequestHeader } = await import("@tanstack/react-start/server");

  const candidates = [
    getRequestHeader("authorization"),
    getRequestHeader("Authorization"),
    getRequestHeader("x-supabase-access-token"),
    getRequestHeader("X-Supabase-Access-Token"),
  ];

  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const normalized = raw.trim();
    if (!normalized) continue;
    if (normalized.toLowerCase().startsWith("bearer ")) {
      return normalized.slice(7).trim();
    }
    return normalized;
  }

  return null;
}

export async function getAuthenticatedUser(): Promise<{
  supabaseAdmin: SupabaseClient<Database>;
  user: { id: string; email?: string | null; email_confirmed_at?: string | null };
  token: string;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const token = await getRequestAuthToken();

  if (!token) throw new Error("Unauthorized");

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");

  return { supabaseAdmin, user, token };
}

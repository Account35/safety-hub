import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Types ──────────────────────────────────────────────────────────────────

export type EligibilityStatus = "eligible" | "claimed" | "paid" | "expired";
export type ClaimStatus = "submitted" | "verification_pending" | "approved" | "paid" | "rejected";
export type PaymentMethodType = "bank_transfer" | "mobile_money" | "cash_pickup";

export interface RewardEligibility {
  id: string;
  report_id: string;
  case_id: string;
  case_type: "wanted" | "missing";
  reward_amount: number;
  eligibility_status: EligibilityStatus;
  eligibility_date: string;
  claim_deadline: string;
  case_name?: string;
  case_photo?: string | null;
  conversation_id?: string | null;
  claim?: RewardClaim | null;
}

export interface RewardClaim {
  id: string;
  claim_id: string;
  report_id: string;
  claim_status: ClaimStatus;
  payment_method_type: PaymentMethodType;
  rejection_reason: string | null;
  submitted_at: string;
}

// ── Helper ─────────────────────────────────────────────────────────────────

async function getAdminAndUser() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const auth = getRequestHeader("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error("Unauthorized");
  // Cast to loose type: some referenced tables (reward_eligibility, reward_claims)
  // are not yet in the generated types.
  return { supabaseAdmin: supabaseAdmin as unknown as AnySupabase, user };
}

// Loose Supabase client type used only in this file until reward tables exist.
type AnyQuery = {
  select: (c?: string) => AnyQuery;
  update: (v: unknown) => AnyQuery;
  insert: (v: unknown) => AnyQuery;
  eq: (c: string, v: unknown) => AnyQuery;
  lt: (c: string, v: unknown) => AnyQuery;
  order: (c: string, o?: unknown) => AnyQuery;
  maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
} & Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
type AnySupabase = {
  from: (t: string) => AnyQuery;
  auth: {
    getUser: (t: string) => Promise<{ data: { user: { id: string; email?: string } | null }; error: { message: string } | null }>;
    admin: {
      getUserById: (id: string) => Promise<{ data: { user: { email_confirmed_at?: string | null } | null } }>;
    };
  };
};

function generateClaimId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 4; i++) suffix += alphabet[arr[i] % alphabet.length];
  return `CLM-${y}-${m}${d}-${suffix}`;
}

// ── Fetch rewards ──────────────────────────────────────────────────────────

export const getMyRewards = createServerFn({ method: "GET" }).handler(
  async (): Promise<RewardEligibility[]> => {
    const { supabaseAdmin, user } = await getAdminAndUser();

    // Auto-expire overdue eligibility records
    await supabaseAdmin
      .from("reward_eligibility")
      .update({ eligibility_status: "expired" })
      .eq("reporter_id", user.id)
      .eq("eligibility_status", "eligible")
      .lt("claim_deadline", new Date().toISOString());

    const { data: rows, error } = await supabaseAdmin
      .from("reward_eligibility")
      .select("*")
      .eq("reporter_id", user.id)
      .order("eligibility_date", { ascending: false });
    if (error) throw new Error(error.message);

    return Promise.all(
      (rows ?? []).map(async (r) => {
        // Case enrichment (same pattern as Phase 5)
        let case_name: string | undefined;
        let case_photo: string | null | undefined;
        if (r.case_type === "wanted") {
          const { data: c } = await supabaseAdmin
            .from("wanted_persons").select("full_name, photos").eq("id", r.case_id).maybeSingle();
          case_name = c?.full_name; case_photo = c?.photos?.[0] ?? null;
        } else {
          const { data: c } = await supabaseAdmin
            .from("missing_persons").select("full_name, photos").eq("id", r.case_id).maybeSingle();
          case_name = c?.full_name; case_photo = c?.photos?.[0] ?? null;
        }

        const { data: conv } = await supabaseAdmin
          .from("conversations").select("id").eq("report_id", r.report_id).maybeSingle();

        const { data: claim } = await supabaseAdmin
          .from("reward_claims")
          .select("id, claim_id, report_id, claim_status, payment_method_type, rejection_reason, submitted_at")
          .eq("report_id", r.report_id)
          .maybeSingle();

        return {
          id: r.id,
          report_id: r.report_id,
          case_id: r.case_id,
          case_type: r.case_type as "wanted" | "missing",
          reward_amount: r.reward_amount,
          eligibility_status: r.eligibility_status as EligibilityStatus,
          eligibility_date: r.eligibility_date,
          claim_deadline: r.claim_deadline,
          case_name,
          case_photo,
          conversation_id: conv?.id ?? null,
          claim: claim as RewardClaim | null,
        };
      })
    );
  }
);

// ── Submit claim ───────────────────────────────────────────────────────────

const claimSchema = z.object({
  report_id: z.string(),
  full_name: z.string().min(2),
  id_number: z.string().length(13).regex(/^\d{13}$/),
  payment_method_type: z.enum(["bank_transfer", "mobile_money", "cash_pickup"]),
  payment_details: z.record(z.string()),
});

export const submitRewardClaim = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => claimSchema.parse(d))
  .handler(async ({ data }): Promise<{ claim_id: string }> => {
    const { supabaseAdmin, user } = await getAdminAndUser();

    // Verify eligibility exists and is still 'eligible'
    const { data: elig, error: eligErr } = await supabaseAdmin
      .from("reward_eligibility")
      .select("id, eligibility_status")
      .eq("report_id", data.report_id)
      .eq("reporter_id", user.id)
      .maybeSingle();
    if (eligErr) throw new Error(eligErr.message);
    if (!elig) throw new Error("Reward eligibility not found");
    if (elig.eligibility_status !== "eligible") throw new Error("This reward is no longer available to claim");

    // Verify user has email + phone verified
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    if (!authUser.user?.email_confirmed_at) throw new Error("Email verification required");

    for (let attempt = 0; attempt < 3; attempt++) {
      const claim_id = generateClaimId();
      const { error } = await supabaseAdmin.from("reward_claims").insert({
        claim_id,
        report_id: data.report_id,
        user_id: user.id,
        // identity_confirmation intentionally separate from reporter_id - see architecture note in migration
        identity_confirmation: { full_name: data.full_name, id_number: data.id_number },
        payment_method_type: data.payment_method_type,
        payment_details: data.payment_details,
      });
      if (!error) {
        await supabaseAdmin
          .from("reward_eligibility")
          .update({ eligibility_status: "claimed" })
          .eq("id", elig.id);
        return { claim_id };
      }
      if (!/duplicate key/i.test(error.message)) throw new Error(error.message);
    }
    throw new Error("Could not generate unique claim reference. Please try again.");
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface AdminEligibilityRow {
  id: string;
  report_id: string;
  report_ref: string | null;
  reporter_anon_code: string;
  case_type: string;
  reward_amount: number;
  eligibility_status: string;
  claim_deadline: string | null;
  created_at: string;
}

export interface AdminClaimRow {
  id: string;
  claim_id: string;
  report_id: string;
  reporter_anon_code: string;
  reward_amount: number;
  payment_method: string;
  claim_status: string;
  rejection_reason: string | null;
  paid_at: string | null;
  created_at: string;
  identity_summary: string;
}

export const listAdminRewards = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    eligibility: AdminEligibilityRow[];
    claims: AdminClaimRow[];
    totals: { pendingClaims: number; paidTotal: number; eligibleTotal: number };
  }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff();

    const [{ data: elig, error: e1 }, { data: claims, error: e2 }] = await Promise.all([
      supabaseAdmin
        .from("reward_eligibility")
        .select(
          "id, report_id, reporter_anon_code, case_type, reward_amount, eligibility_status, claim_deadline, created_at, reports(report_id)",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("reward_claims")
        .select(
          "id, claim_id, report_id, reporter_anon_code, reward_amount, payment_method, claim_status, rejection_reason, paid_at, created_at, identity_confirmation",
        )
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);

    const eligibility: AdminEligibilityRow[] = (
      (elig ?? []) as unknown as (Record<string, unknown> & {
        reports?: { report_id: string } | { report_id: string }[] | null;
      })[]
    ).map((r) => {
      const rep = Array.isArray(r.reports) ? r.reports[0] : r.reports;
      return {
        id: r.id as string,
        report_id: r.report_id as string,
        report_ref: rep?.report_id ?? null,
        reporter_anon_code: r.reporter_anon_code as string,
        case_type: r.case_type as string,
        reward_amount: Number(r.reward_amount ?? 0),
        eligibility_status: r.eligibility_status as string,
        claim_deadline: (r.claim_deadline as string | null) ?? null,
        created_at: r.created_at as string,
      };
    });

    const claimRows: AdminClaimRow[] = (
      (claims ?? []) as unknown as Record<string, unknown>[]
    ).map((c) => {
      const ident = (c.identity_confirmation as Record<string, unknown> | null) ?? {};
      const initials = String(ident.full_name ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p[0]?.toUpperCase())
        .join("");
      const id = String(ident.id_number ?? "");
      const masked = id ? `ID ••••${id.slice(-4)}` : "no ID on file";
      return {
        id: c.id as string,
        claim_id: c.claim_id as string,
        report_id: c.report_id as string,
        reporter_anon_code: c.reporter_anon_code as string,
        reward_amount: Number(c.reward_amount ?? 0),
        payment_method: c.payment_method as string,
        claim_status: c.claim_status as string,
        rejection_reason: (c.rejection_reason as string | null) ?? null,
        paid_at: (c.paid_at as string | null) ?? null,
        created_at: c.created_at as string,
        identity_summary: `${initials || "—"} · ${masked}`,
      };
    });

    return {
      eligibility,
      claims: claimRows,
      totals: {
        pendingClaims: claimRows.filter((c) => ["submitted", "verifying"].includes(c.claim_status))
          .length,
        paidTotal: claimRows
          .filter((c) => c.claim_status === "paid")
          .reduce((s, c) => s + c.reward_amount, 0),
        eligibleTotal: eligibility
          .filter((e) => e.eligibility_status === "eligible")
          .reduce((s, e) => s + e.reward_amount, 0),
      },
    };
  },
);

export const updateClaimStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["verifying", "approved", "paid", "rejected"]),
        rejectionReason: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { logAdminAction } = await import("@/lib/admin/audit.server");
    const ctx = await requireStaff(["admin", "super_admin"]);

    if (data.status === "rejected" && !data.rejectionReason?.trim()) {
      throw new Error("A rejection reason is required");
    }

    const { error } = await ctx.supabaseAdmin
      .from("reward_claims")
      .update({
        claim_status: data.status,
        rejection_reason: data.status === "rejected" ? (data.rejectionReason ?? null) : null,
        paid_at: data.status === "paid" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await logAdminAction(ctx, "reward_claim.status", "reward_claim", data.id, {
      status: data.status,
    });
    return { ok: true };
  });
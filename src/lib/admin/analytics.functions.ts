import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface AdminAnalytics {
  range: { days: number; from: string };
  reports: {
    total: number;
    byStatus: { label: string; count: number }[];
    byTownship: { label: string; count: number }[];
    byDay: { day: string; count: number }[];
    resolutionRate: number;
    avgInvestigationDays: number | null;
    avgQualityScore: number | null;
  };
  cases: { activeWanted: number; activeMissing: number; resolvedMissing: number };
  engagement: { conversations: number; messages: number; campaignsSent: number };
  rewards: { claimsPaid: number; amountPaid: number; claimsPending: number };
}

export const getAdminAnalytics = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(7).max(365).default(30) }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<AdminAnalytics> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff();

    const from = new Date(Date.now() - data.days * 86_400_000).toISOString();

    const [reportRows, wanted, missingActive, missingFound, convos, messages, sent, claims] =
      await Promise.all([
        supabaseAdmin
          .from("reports")
          .select("status, outcome, location_township, submission_timestamp, updated_at")
          .gte("submission_timestamp", from)
          .limit(5000),
        supabaseAdmin
          .from("wanted_persons")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabaseAdmin
          .from("missing_persons")
          .select("id", { count: "exact", head: true })
          .eq("case_status", "active"),
        supabaseAdmin
          .from("missing_persons")
          .select("id", { count: "exact", head: true })
          .eq("case_status", "found"),
        supabaseAdmin
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .gte("created_at", from),
        supabaseAdmin
          .from("messages")
          .select("id", { count: "exact", head: true })
          .gte("sent_at", from),
        supabaseAdmin
          .from("campaigns")
          .select("id", { count: "exact", head: true })
          .eq("status", "sent")
          .gte("scheduled_send_timestamp", from),
        supabaseAdmin
          .from("reward_claims")
          .select("claim_status, reward_amount")
          .gte("created_at", from)
          .limit(2000),
      ]);

    const rows = reportRows.data ?? [];
    const count = <T extends string>(vals: (T | null)[]) => {
      const m = new Map<string, number>();
      for (const v of vals) {
        const key = v ?? "unknown";
        m.set(key, (m.get(key) ?? 0) + 1);
      }
      return [...m.entries()]
        .map(([label, c]) => ({ label, count: c }))
        .sort((a, b) => b.count - a.count);
    };

    const byDayMap = new Map<string, number>();
    for (let i = data.days - 1; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      byDayMap.set(d, 0);
    }
    for (const r of rows) {
      const day = r.submission_timestamp.slice(0, 10);
      if (byDayMap.has(day)) byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
    }

    const resolved = rows.filter((r) => r.status === "closed" || r.status === "actioned");
    const durations = resolved
      .map((r) => new Date(r.updated_at).getTime() - new Date(r.submission_timestamp).getTime())
      .filter((ms) => ms > 0);

    const { data: analysis } = await supabaseAdmin
      .from("report_ai_analysis")
      .select("quality_score")
      .gte("created_at", from)
      .limit(5000);
    const scores = (analysis ?? []).map((a) => a.quality_score);

    const claimRows = claims.data ?? [];

    return {
      range: { days: data.days, from },
      reports: {
        total: rows.length,
        byStatus: count(rows.map((r) => r.status)),
        byTownship: count(rows.map((r) => r.location_township)).slice(0, 10),
        byDay: [...byDayMap.entries()].map(([day, c]) => ({ day, count: c })),
        resolutionRate: rows.length ? Math.round((resolved.length / rows.length) * 100) : 0,
        avgInvestigationDays: durations.length
          ? Math.round(
              (durations.reduce((s, ms) => s + ms, 0) / durations.length / 86_400_000) * 10,
            ) / 10
          : null,
        avgQualityScore: scores.length
          ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
          : null,
      },
      cases: {
        activeWanted: wanted.count ?? 0,
        activeMissing: missingActive.count ?? 0,
        resolvedMissing: missingFound.count ?? 0,
      },
      engagement: {
        conversations: convos.count ?? 0,
        messages: messages.count ?? 0,
        campaignsSent: sent.count ?? 0,
      },
      rewards: {
        claimsPaid: claimRows.filter((c) => c.claim_status === "paid").length,
        amountPaid: claimRows
          .filter((c) => c.claim_status === "paid")
          .reduce((s, c) => s + Number(c.reward_amount ?? 0), 0),
        claimsPending: claimRows.filter((c) =>
          ["submitted", "verifying", "approved"].includes(c.claim_status),
        ).length,
      },
    };
  });
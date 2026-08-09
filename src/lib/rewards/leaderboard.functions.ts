import { createServerFn } from "@tanstack/react-start";

export interface LeaderboardEntry {
  rank: number;
  anonCode: string;
  verifiedReports: number;
  totalRewarded: number;
  isMe: boolean;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  myEntry: LeaderboardEntry | null;
  totalContributors: number;
}

/**
 * Anonymous community leaderboard. Aggregates paid/claimed reward eligibility
 * per reporter and exposes only the reporter's anonymous code — never a name,
 * phone number, area, or user id.
 */
export const getRewardLeaderboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeaderboardResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestAuthToken } = await import("@/lib/supabase-auth");

    let myUserId: string | null = null;
    const token = await getRequestAuthToken();
    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token);
      myUserId = data.user?.id ?? null;
    }

    const { data: rows, error } = await supabaseAdmin
      .from("reward_eligibility")
      .select("reward_amount, eligibility_status, reports!inner(reporter_id, reporter_anon_code)")
      .eq("eligibility_status", "claimed")
      .limit(1000);
    if (error) throw new Error(error.message);

    type Row = {
      reward_amount: number | string | null;
      reports:
        | { reporter_id: string | null; reporter_anon_code: string }
        | { reporter_id: string | null; reporter_anon_code: string }[]
        | null;
    };

    const byUser = new Map<string, { anonCode: string; count: number; total: number }>();
    for (const raw of (rows ?? []) as unknown as Row[]) {
      const rep = Array.isArray(raw.reports) ? raw.reports[0] : raw.reports;
      if (!rep?.reporter_id) continue;
      const key = rep.reporter_id;
      const prev = byUser.get(key) ?? { anonCode: rep.reporter_anon_code, count: 0, total: 0 };
      prev.count += 1;
      prev.total += Number(raw.reward_amount ?? 0);
      byUser.set(key, prev);
    }

    const sorted = [...byUser.entries()].sort(
      (a, b) => b[1].total - a[1].total || b[1].count - a[1].count,
    );

    const all: LeaderboardEntry[] = sorted.map(([userId, v], i) => ({
      rank: i + 1,
      anonCode: v.anonCode,
      verifiedReports: v.count,
      totalRewarded: v.total,
      isMe: myUserId === userId,
    }));

    const myEntry = all.find((e) => e.isMe) ?? null;

    return {
      entries: all.slice(0, 20),
      myEntry,
      totalContributors: all.length,
    };
  },
);
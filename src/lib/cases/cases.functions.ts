import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  PAGE_SIZE,
  ageRange,
  timeWindowDays,
  wantedSearchSchema,
  missingSearchSchema,
} from "./filters";
import type {
  MissingListItem,
  MissingPerson,
  PagedResult,
  WantedListItem,
  WantedPerson,
} from "./types";

const wantedSelect =
  "id, full_name, age, height_cm, build, crime_category, danger_level, armed, last_seen_location, last_seen_at, reward_amount, photos, created_at";

const missingSelect =
  "id, full_name, age_at_disappearance, height_cm, build, circumstances, last_seen_location, last_seen_at, is_endangered, vulnerability_indicators, photos, created_at";

function applySort<T extends { eq: (k: string, v: string) => T; order: (col: string, opts: { ascending: boolean }) => T }>(
  q: T,
  sort: string,
  fallbackCol = "created_at",
): T {
  switch (sort) {
    case "oldest":
      return q.order(fallbackCol, { ascending: true });
    case "az":
      return q.order("full_name", { ascending: true });
    case "za":
      return q.order("full_name", { ascending: false });
    case "newest":
    default:
      return q.order(fallbackCol, { ascending: false });
  }
}

export const listWanted = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => wantedSearchSchema.parse(data))
  .handler(async ({ data }): Promise<PagedResult<WantedListItem>> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("wanted_persons")
      .select(wantedSelect, { count: "exact" })
      .eq("is_active", true);

    if (data.q.trim()) {
      q = q.ilike("full_name", `%${data.q.trim()}%`);
    }
    if (data.danger === "high") q = q.eq("danger_level", "high");
    if (data.danger === "mediumHigh") q = q.in("danger_level", ["high", "medium"]);
    if (data.categories.length) q = q.in("crime_category", data.categories);
    if (data.location.trim()) q = q.ilike("last_seen_location", `%${data.location.trim()}%`);
    const days = timeWindowDays(data.time);
    if (days != null) {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      q = q.gte("created_at", since);
    }
    if (data.reward === "rewardOnly") q = q.not("reward_amount", "is", null);
    if (data.reward === "noReward") q = q.is("reward_amount", null);

    q = applySort(q, data.sort);

    const from = (data.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: items, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);

    return {
      items: (items ?? []) as WantedListItem[],
      total: count ?? 0,
      page: data.page,
      pageSize: PAGE_SIZE,
    };
  });

export const listMissing = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => missingSearchSchema.parse(data))
  .handler(async ({ data }): Promise<PagedResult<MissingListItem>> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("missing_persons")
      .select(missingSelect, { count: "exact" })
      .eq("case_status", "active");

    if (data.q.trim()) q = q.ilike("full_name", `%${data.q.trim()}%`);
    if (data.location.trim()) q = q.ilike("last_seen_location", `%${data.location.trim()}%`);
    if (data.circumstances.length)
      q = q.in(
        "circumstances",
        data.circumstances as Array<
          "voluntary" | "family_conflict" | "endangered" | "medical" | "unknown"
        >,
      );
    if (data.vulns.length) q = q.overlaps("vulnerability_indicators", data.vulns);
    if (data.ages.length) {
      const ranges = data.ages.map(ageRange).filter(Boolean) as [number, number][];
      const min = Math.min(...ranges.map(([a]) => a));
      const max = Math.max(...ranges.map(([, b]) => b));
      q = q.gte("age_at_disappearance", min).lte("age_at_disappearance", max);
    }
    const days = timeWindowDays(data.time);
    if (days != null) {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      q = q.gte("last_seen_at", since);
    }

    q = applySort(q, data.sort, "last_seen_at");

    const from = (data.page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: items, count, error } = await q.range(from, to);
    if (error) throw new Error(error.message);

    return {
      items: (items ?? []) as MissingListItem[],
      total: count ?? 0,
      page: data.page,
      pageSize: PAGE_SIZE,
    };
  });

export const getWanted = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<WantedPerson | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("wanted_persons")
      .select("*")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMissing = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<MissingPerson | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("missing_persons")
      .select("*")
      .eq("id", data.id)
      .eq("case_status", "active")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const getCaseCounts = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ wanted: number; missing: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [w, m] = await Promise.all([
      supabaseAdmin
        .from("wanted_persons")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      supabaseAdmin
        .from("missing_persons")
        .select("id", { count: "exact", head: true })
        .eq("case_status", "active"),
    ]);
    return { wanted: w.count ?? 0, missing: m.count ?? 0 };
  },
);
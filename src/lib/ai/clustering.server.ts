// ARCHITECTURAL CONSTRAINT: clustering groups by report_id/reporter_id only.
// No join to profiles / user_id / identity_confirmation.

type Row = {
  id: string;
  report_id: string;
  case_id: string;
  case_type: "wanted" | "missing";
  location_township: string | null;
  sighting_date: string | null;
  sighting_time: string | null;
  created_at: string;
};

function combineTime(date: string | null, time: string | null): number | null {
  if (!date) return null;
  const iso = `${date}T${time ?? "12:00:00"}`;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function extractClothing(details: unknown): string[] {
  if (!details || typeof details !== "object") return [];
  const clothing = (details as { clothing?: Array<{ text?: string }> }).clothing ?? [];
  return clothing.map((c) => (c.text ?? "").toLowerCase().trim()).filter(Boolean);
}

/** Attach a newly-analysed report to an existing cluster, or start a new one. */
export async function clusterReportRealtime(reportRowId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: r } = await supabaseAdmin
    .from("reports")
    .select("id, case_id, case_type, location_township, sighting_date, sighting_time, created_at")
    .eq("id", reportRowId)
    .maybeSingle();
  if (!r) return;
  const row = r as unknown as Row & { id: string };
  const myTime = combineTime(row.sighting_date, row.sighting_time) ?? Date.parse(row.created_at);

  // Candidate window: last 48h, same case_id
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: peers } = await supabaseAdmin
    .from("reports")
    .select("id, case_id, location_township, sighting_date, sighting_time, created_at")
    .eq("case_id", row.case_id)
    .neq("id", row.id)
    .gte("created_at", since);

  let bestCluster: { cluster_id: string; confidence: "high" | "medium" } | null = null;
  for (const p of peers ?? []) {
    const pTime = combineTime(p.sighting_date as string | null, p.sighting_time as string | null) ?? Date.parse(p.created_at);
    const timeOk = Math.abs(pTime - myTime) <= 2 * 3600 * 1000;
    const townshipOk = !!row.location_township && !!p.location_township &&
      row.location_township.toLowerCase() === (p.location_township as string).toLowerCase();
    const caseOk = true;
    const criteria = Number(timeOk) + Number(townshipOk) + Number(caseOk);
    if (criteria < 2) continue;
    const conf: "high" | "medium" = criteria === 3 ? "high" : "medium";

    const { data: peerAnalysis } = await supabaseAdmin
      .from("report_ai_analysis")
      .select("cluster_id, cluster_confidence, cluster_role")
      .eq("report_id", p.id)
      .maybeSingle();
    if (peerAnalysis?.cluster_id) {
      bestCluster = { cluster_id: peerAnalysis.cluster_id as string, confidence: conf };
      if (conf === "high") break;
    }
  }

  if (bestCluster) {
    await supabaseAdmin
      .from("report_ai_analysis")
      .update({
        cluster_id: bestCluster.cluster_id,
        cluster_confidence: bestCluster.confidence,
        cluster_role: "supporting",
      })
      .eq("report_id", row.id);

    // Bump supporting count on the cluster primary
    await supabaseAdmin.rpc("noop_touch").then(() => undefined, () => undefined);
    const { data: members } = await supabaseAdmin
      .from("report_ai_analysis")
      .select("id, cluster_role")
      .eq("cluster_id", bestCluster.cluster_id);
    const supporting = (members ?? []).filter((m) => m.cluster_role === "supporting").length;
    await supabaseAdmin
      .from("report_ai_analysis")
      .update({ cluster_supporting_count: supporting })
      .eq("cluster_id", bestCluster.cluster_id)
      .eq("cluster_primary", true);
    // TODO(Phase 9): notify assigned investigator that a corroborating report arrived.
  }
}

/** Daily sweep: contradictions, concentrated sightings, expiry. */
export async function clusterDailySweep(): Promise<{ processed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let processed = 0;

  // Contradictions: compare clothing hints inside each cluster
  const { data: clusters } = await supabaseAdmin
    .from("report_ai_analysis")
    .select("cluster_id")
    .not("cluster_id", "is", null);
  const seen = new Set<string>();
  for (const c of clusters ?? []) {
    const id = c.cluster_id as string;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const { data: members } = await supabaseAdmin
      .from("report_ai_analysis")
      .select("id, key_details_extracted")
      .eq("cluster_id", id);
    const clothingSets = (members ?? []).map((m) => extractClothing(m.key_details_extracted));
    const contradictions: string[] = [];
    for (let i = 0; i < clothingSets.length; i++) {
      for (let j = i + 1; j < clothingSets.length; j++) {
        const a = clothingSets[i];
        const b = clothingSets[j];
        if (a.length && b.length && !a.some((x) => b.includes(x))) {
          contradictions.push(`clothing differs between reports in cluster`);
        }
      }
    }
    if (contradictions.length) {
      await supabaseAdmin
        .from("report_ai_analysis")
        .update({ cluster_contradictions: contradictions.slice(0, 5) })
        .eq("cluster_id", id)
        .eq("cluster_primary", true);
    }
    processed++;
  }

  // Missing-person concentrated sighting: 3+ missing reports, same township, 2h window
  const since = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: missingReports } = await supabaseAdmin
    .from("reports")
    .select("id, location_township, sighting_date, sighting_time, created_at")
    .eq("case_type", "missing")
    .gte("created_at", since);
  const byTownship = new Map<string, Array<{ id: string; t: number }>>();
  for (const m of missingReports ?? []) {
    const twn = (m.location_township as string | null)?.toLowerCase();
    if (!twn) continue;
    const t = combineTime(m.sighting_date as string | null, m.sighting_time as string | null) ?? Date.parse(m.created_at);
    if (!byTownship.has(twn)) byTownship.set(twn, []);
    byTownship.get(twn)!.push({ id: m.id, t });
  }
  for (const list of byTownship.values()) {
    list.sort((a, b) => a.t - b.t);
    for (let i = 0; i < list.length; i++) {
      const window = list.filter((x) => Math.abs(x.t - list[i].t) <= 2 * 3600 * 1000);
      if (window.length >= 3) {
        await supabaseAdmin
          .from("report_ai_analysis")
          .update({ concentrated_sighting: true })
          .in("report_id", window.map((w) => w.id));
        break;
      }
    }
  }

  // Expiry: clear cluster fields for old clusters
  const wantedCutoff = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const missingCutoff = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
  const { data: oldReports } = await supabaseAdmin
    .from("reports")
    .select("id, case_type, created_at");
  for (const r of oldReports ?? []) {
    const cutoff = r.case_type === "wanted" ? wantedCutoff : missingCutoff;
    if ((r.created_at as string) < cutoff) {
      await supabaseAdmin
        .from("report_ai_analysis")
        .update({ cluster_id: null, cluster_confidence: null, cluster_role: null, cluster_primary: false, cluster_supporting_count: 0 })
        .eq("report_id", r.id);
    }
  }

  return { processed };
}
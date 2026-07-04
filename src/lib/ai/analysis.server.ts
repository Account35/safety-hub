// ARCHITECTURAL CONSTRAINT (Phase 6/7): This module accesses reports via
// report_id and reporter_id ONLY. It never joins to profiles / user_id /
// identity_confirmation. Any future maintainer must preserve this.
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAi } from "./ai-gateway.server";

type ReportRow = {
  id: string;
  reporter_id: string | null;
  case_id: string;
  case_type: "wanted" | "missing";
  reporting_methods: string[];
  sighting_date: string | null;
  sighting_time: string | null;
  text_description: string | null;
  companion_description: string | null;
  confidence_level: number | null;
  location_township: string | null;
  location_landmarks: string[];
  created_at: string;
};

interface ScoredDimensions {
  detail: number;
  temporal: number;
  location: number;
  method: number;
  confidence: number;
}

function scoreDimensions(r: ReportRow, caseTownship: string | null): ScoredDimensions {
  // Detail richness (0-100)
  const text = (r.text_description ?? "").trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const specificHits = (text.match(/\b(red|blue|black|white|green|yellow|jacket|shirt|jeans|hoodie|shoes|hat|scar|tattoo|walking|running|driving|car|taxi|bakkie|bicycle|towards?|north|south|east|west)\b/gi) ?? []).length;
  let detail = 0;
  if (words >= 20) detail += 40;
  if (words >= 50) detail += 20;
  detail += Math.min(40, specificHits * 8);

  // Temporal precision
  let temporal = 0;
  if (r.sighting_date) temporal += 30;
  if (r.sighting_time) temporal += 30;
  if (r.sighting_date) {
    const ageHrs = (Date.now() - new Date(r.sighting_date).getTime()) / 3.6e6;
    if (ageHrs <= 24) temporal += 40;
    else if (ageHrs <= 72) temporal += 20;
  }
  temporal = Math.min(100, temporal);

  // Location specificity
  let location = 0;
  if (r.location_township) location += 40;
  if (r.location_landmarks?.length) location += Math.min(40, r.location_landmarks.length * 20);
  if (caseTownship && r.location_township && caseTownship.toLowerCase() === r.location_township.toLowerCase()) {
    location += 20;
  }
  location = Math.min(100, location);

  // Method completeness
  const methodCount = r.reporting_methods?.length ?? 0;
  const method = methodCount >= 3 ? 100 : methodCount === 2 ? 70 : 40;

  // Reporter confidence
  const confidence = r.confidence_level ? (r.confidence_level / 5) * 100 : 40;

  return { detail, temporal, location, method, confidence };
}

function combineScore(d: ScoredDimensions): number {
  return Math.round(
    d.detail * 0.25 + d.temporal * 0.2 + d.location * 0.25 + d.method * 0.2 + d.confidence * 0.1,
  );
}

function scoreToTier(score: number): "detailed" | "standard" | "limited" {
  if (score >= 70) return "detailed";
  if (score >= 40) return "standard";
  return "limited";
}

function factorsFor(r: ReportRow, d: ScoredDimensions, caseTownship: string | null): string[] {
  const out: string[] = [];
  if (d.detail >= 60) out.push("Specific descriptive details provided");
  else if (d.detail < 30) out.push("Limited descriptive detail");
  if (r.sighting_date && r.sighting_time) out.push("Exact sighting date and time recorded");
  if (r.location_landmarks?.length) out.push(`${r.location_landmarks.length} landmark(s) referenced`);
  if (caseTownship && r.location_township && caseTownship.toLowerCase() === r.location_township.toLowerCase()) {
    out.push("Location matches case's last known area");
  }
  if ((r.reporting_methods?.length ?? 0) >= 2) out.push("Multi-channel report (text + voice/photo)");
  return out;
}

const ExtractionSchema = z.object({
  clothing: z.array(z.object({ text: z.string(), confirmed: z.boolean() })).default([]),
  locations: z.array(z.object({ text: z.string(), confirmed: z.boolean() })).default([]),
  times: z.array(z.object({ text: z.string(), confirmed: z.boolean() })).default([]),
  companions: z.array(z.object({ text: z.string(), confirmed: z.boolean() })).default([]),
  movement: z.array(z.object({ text: z.string(), confirmed: z.boolean() })).default([]),
});

async function extractDetails(text: string) {
  if (!text || text.trim().length < 15) return { clothing: [], locations: [], times: [], companions: [], movement: [] };
  try {
    const gateway = createLovableAi();
    const { output } = await Promise.race([
      generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: ExtractionSchema }),
        prompt:
          "Extract structured observation details from this SAPS sighting report. " +
          "For each item, mark confirmed=true only when the text explicitly states it; " +
          "mark confirmed=false when reasonably inferred from context.\n\nText:\n" + text,
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 25000)),
    ]);
    return output;
  } catch (e) {
    console.warn("[analysis] extraction failed:", (e as Error).message);
    return null;
  }
}

export async function analyzeReport(reportRowId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Access strictly via report id — no join to profiles.
  const { data: report, error } = await supabaseAdmin
    .from("reports")
    .select("id, reporter_id, case_id, case_type, reporting_methods, sighting_date, sighting_time, text_description, companion_description, confidence_level, location_township, location_landmarks, created_at")
    .eq("id", reportRowId)
    .maybeSingle();
  if (error || !report) {
    console.warn("[analysis] report not found:", reportRowId, error?.message);
    return;
  }

  const r = report as unknown as ReportRow;

  // Load linked case for location comparison
  let caseTownship: string | null = null;
  if (r.case_type === "wanted") {
    const { data } = await supabaseAdmin.from("wanted_persons").select("last_seen_location").eq("id", r.case_id).maybeSingle();
    caseTownship = (data as { last_seen_location?: string } | null)?.last_seen_location ?? null;
  } else {
    const { data } = await supabaseAdmin.from("missing_persons").select("last_seen_location").eq("id", r.case_id).maybeSingle();
    caseTownship = (data as { last_seen_location?: string } | null)?.last_seen_location ?? null;
  }

  const dims = scoreDimensions(r, caseTownship);
  const quality_score = combineScore(dims);
  const quality_tier = scoreToTier(quality_score);
  const quality_factors = factorsFor(r, dims, caseTownship);

  // Insert pending record first (idempotent upsert on report_id)
  await supabaseAdmin
    .from("report_ai_analysis")
    .upsert({ report_id: r.id, quality_score, quality_tier, quality_factors, status: "pending" }, { onConflict: "report_id" });

  const extracted = await extractDetails(r.text_description ?? "");
  const status = extracted ? "complete" : "partial";

  // Secondary case matching — simple township + text overlap on active cases.
  const suggested = await suggestSecondaryMatches(r, extracted).catch(() => []);

  await supabaseAdmin
    .from("report_ai_analysis")
    .update({
      key_details_extracted: extracted ?? {},
      suggested_case_matches: suggested,
      status,
    })
    .eq("report_id", r.id);

  // Real-time clustering hook
  try {
    const { clusterReportRealtime } = await import("./clustering.server");
    await clusterReportRealtime(r.id);
  } catch (e) {
    console.warn("[analysis] clustering failed:", (e as Error).message);
  }
}

async function suggestSecondaryMatches(
  r: ReportRow,
  extracted: z.infer<typeof ExtractionSchema> | null,
): Promise<Array<{ case_id: string; case_type: "wanted" | "missing"; confidence: number }>> {
  if (!r.location_township) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [wanted, missing] = await Promise.all([
    supabaseAdmin.from("wanted_persons").select("id, last_seen_location").eq("is_active", true).ilike("last_seen_location", `%${r.location_township}%`).limit(10),
    supabaseAdmin.from("missing_persons").select("id, last_seen_location").eq("case_status", "active").ilike("last_seen_location", `%${r.location_township}%`).limit(10),
  ]);
  const candidates: Array<{ case_id: string; case_type: "wanted" | "missing"; confidence: number }> = [];
  const clothingHint = extracted?.clothing?.map((c) => c.text.toLowerCase()).join(" ") ?? "";
  for (const w of wanted.data ?? []) {
    if (w.id === r.case_id) continue;
    let conf = 60;
    if (clothingHint) conf += 10;
    candidates.push({ case_id: w.id, case_type: "wanted", confidence: conf });
  }
  for (const m of missing.data ?? []) {
    if (m.id === r.case_id) continue;
    let conf = 60;
    if (clothingHint) conf += 10;
    candidates.push({ case_id: m.id, case_type: "missing", confidence: conf });
  }
  return candidates.filter((c) => c.confidence >= 70).slice(0, 3);
}

/**
 * Fire-and-forget: never rejects; catches internally so callers can `void` it.
 */
export function scheduleAnalysis(reportRowId: string): void {
  void analyzeReport(reportRowId).catch((e) => {
    console.warn("[analysis] failed for", reportRowId, e);
  });
}
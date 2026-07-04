import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { CAMPAIGN_TYPES, CAMPAIGN_AUDIENCES, isAlertCampaign, type CampaignType } from "./campaigns.constants";

export interface CampaignRow {
  id: string;
  campaign_type: CampaignType;
  title: string;
  body_content: string;
  case_id: string | null;
  case_type: "wanted" | "missing" | null;
  sent_timestamp: string | null;
  language_code: string;
}

export interface CampaignInboxItem {
  delivery_id: string;
  campaign: CampaignRow;
  delivered_timestamp: string | null;
  opened_timestamp: string | null;
  case_thumbnail: string | null;
  case_full_name: string | null;
}

export const getMyCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(50).default(20), offset: z.number().int().min(0).default(0) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CampaignInboxItem[]> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("campaign_delivery")
      .select("id, delivered_timestamp, opened_timestamp, campaigns:campaign_id ( id, campaign_type, title, body_content, case_id, case_type, sent_timestamp, language_code )")
      .order("delivered_timestamp", { ascending: false, nullsFirst: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (error) throw new Error(error.message);

    const items: CampaignInboxItem[] = [];
    for (const r of rows ?? []) {
      const c = r.campaigns as unknown as CampaignRow | null;
      if (!c) continue;
      let thumb: string | null = null;
      let fullName: string | null = null;
      if (c.case_id && (c.campaign_type === "missing_person_alert" || c.campaign_type === "wanted_person_alert")) {
        const table = c.campaign_type === "wanted_person_alert" ? "wanted_persons" : "missing_persons";
        const { data: caseRow } = await supabase.from(table).select("full_name, photos").eq("id", c.case_id).maybeSingle();
        thumb = (caseRow as { photos?: string[] } | null)?.photos?.[0] ?? null;
        fullName = (caseRow as { full_name?: string } | null)?.full_name ?? null;
      }
      items.push({
        delivery_id: r.id,
        campaign: c,
        delivered_timestamp: r.delivered_timestamp,
        opened_timestamp: r.opened_timestamp,
        case_thumbnail: thumb,
        case_full_name: fullName,
      });
    }
    return items;
  });

export const markCampaignOpened = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ deliveryId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("campaign_delivery")
      .update({ opened_timestamp: new Date().toISOString() })
      .eq("id", data.deliveryId)
      .is("opened_timestamp", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<CampaignRow | null> => {
    const { data: c, error } = await context.supabase
      .from("campaigns")
      .select("id, campaign_type, title, body_content, case_id, case_type, sent_timestamp, language_code")
      .eq("id", data.id)
      .eq("status", "sent")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (c as unknown as CampaignRow | null) ?? null;
  });

const CreateCampaign = z.object({
  campaign_type: z.enum(CAMPAIGN_TYPES),
  title: z.string().min(5).max(80),
  body_content: z.string().min(10).max(500),
  target_audience: z.enum(CAMPAIGN_AUDIENCES).default("all_users"),
  target_townships: z.array(z.string()).default([]),
  case_id: z.string().uuid().optional().nullable(),
  case_type: z.enum(["wanted", "missing"]).optional().nullable(),
  scheduled_send_timestamp: z.string(),
  language_code: z.string().default("en-ZA"),
});

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateCampaign.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    if (isAlertCampaign(data.campaign_type) && !data.case_id) throw new Error("Alert campaigns require case_id");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        campaign_type: data.campaign_type,
        title: data.title,
        body_content: data.body_content,
        target_audience: data.target_audience,
        target_townships: data.target_townships,
        case_id: data.case_id ?? null,
        case_type: data.case_type ?? null,
        scheduled_send_timestamp: data.scheduled_send_timestamp,
        status: "scheduled",
        created_by: context.userId,
        language_code: data.language_code,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const cancelCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabaseAdmin.from("campaigns").select("status").eq("id", data.id).maybeSingle();
    if (!c) throw new Error("Not found");
    if (c.status === "sent") throw new Error("Cannot cancel a campaign that has already been sent");
    await supabaseAdmin.from("campaigns").update({ status: "cancelled" }).eq("id", data.id);
    await supabaseAdmin.from("campaign_delivery").delete().eq("campaign_id", data.id);
    return { ok: true };
  });
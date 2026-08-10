import { createServerFn } from "@tanstack/react-start";

export interface AdminCampaignRow {
  id: string;
  campaign_type: string;
  title: string;
  body_content: string;
  target_audience: string;
  target_townships: string[];
  status: string;
  scheduled_send_timestamp: string;
  sent_timestamp: string | null;
  language_code: string;
  delivered: number;
  opened: number;
}

export const listAdminCampaigns = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminCampaignRow[]> => {
    const { requireStaff } = await import("@/lib/admin/admin.server");
    const { supabaseAdmin } = await requireStaff(["moderator", "admin", "super_admin"]);

    const { data: rows, error } = await supabaseAdmin
      .from("campaigns")
      .select("*")
      .order("scheduled_send_timestamp", { ascending: false })
      .limit(150);
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    const delivered = new Map<string, number>();
    const opened = new Map<string, number>();
    if (ids.length) {
      const { data: deliveries } = await supabaseAdmin
        .from("campaign_delivery")
        .select("campaign_id, delivered_timestamp, opened_timestamp")
        .in("campaign_id", ids)
        .limit(5000);
      for (const d of deliveries ?? []) {
        if (d.delivered_timestamp)
          delivered.set(d.campaign_id, (delivered.get(d.campaign_id) ?? 0) + 1);
        if (d.opened_timestamp) opened.set(d.campaign_id, (opened.get(d.campaign_id) ?? 0) + 1);
      }
    }

    return (rows ?? []).map((r) => ({
      id: r.id,
      campaign_type: r.campaign_type,
      title: r.title,
      body_content: r.body_content,
      target_audience: r.target_audience,
      target_townships: (r.target_townships ?? []) as string[],
      status: r.status,
      scheduled_send_timestamp: r.scheduled_send_timestamp,
      sent_timestamp: r.sent_timestamp,
      language_code: r.language_code,
      delivered: delivered.get(r.id) ?? 0,
      opened: opened.get(r.id) ?? 0,
    }));
  },
);
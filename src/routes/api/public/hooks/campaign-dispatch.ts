import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/campaign-dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("apikey");
        if (!auth || auth !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();

        // Fetch due, still-scheduled campaigns
        const { data: due } = await supabaseAdmin
          .from("campaigns")
          .select("id, campaign_type, target_audience, target_townships, language_code")
          .eq("status", "scheduled")
          .lte("scheduled_send_timestamp", nowIso);

        let sent = 0;
        for (const c of due ?? []) {
          // Flip to sent first to dedupe
          const { error: flipErr } = await supabaseAdmin
            .from("campaigns")
            .update({ status: "sent", sent_timestamp: nowIso })
            .eq("id", c.id)
            .eq("status", "scheduled");
          if (flipErr) continue;

          // Resolve recipients from profiles
          let query = supabaseAdmin.from("profiles").select("id, primary_township, language_preference");
          if (Array.isArray(c.target_townships) && c.target_townships.length) {
            query = query.in("primary_township", c.target_townships as string[]);
          }
          const { data: profiles } = await query;

          const rows = (profiles ?? [])
            .filter((p) => {
              const langOk = !c.language_code || !p.language_preference || p.language_preference === c.language_code || c.language_code === "en-ZA";
              return langOk;
            })
            .map((p) => ({
              campaign_id: c.id,
              recipient_user_id: p.id,
              delivered_timestamp: nowIso,
            }));
          if (rows.length) {
            await supabaseAdmin.from("campaign_delivery").insert(rows);
          }
          sent++;
        }
        return new Response(JSON.stringify({ ok: true, dispatched: sent }), { headers: { "Content-Type": "application/json" } });
      },
    },
  },
});
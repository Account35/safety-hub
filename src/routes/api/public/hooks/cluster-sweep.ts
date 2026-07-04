import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/cluster-sweep")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("apikey");
        if (!auth || auth !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { clusterDailySweep } = await import("@/lib/ai/clustering.server");
        try {
          const result = await clusterDailySweep();
          return new Response(JSON.stringify({ ok: true, ...result }), { headers: { "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500 });
        }
      },
    },
  },
});
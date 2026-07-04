import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/saps/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getMyCampaigns, type CampaignInboxItem } from "@/lib/campaigns/campaigns.functions";
import { formatRelativeTime } from "@/lib/chat-utils";

export const Route = createFileRoute("/campaigns/")({
  head: () => ({ meta: [{ title: "SAPS Announcements · Community Safety Tracker" }] }),
  component: CampaignsIndex,
});

function CampaignsIndex() {
  const fetchList = useServerFn(getMyCampaigns);
  const [items, setItems] = useState<CampaignInboxItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchList({ data: { limit: 50, offset: 0 } })
      .then((rows) => setItems(rows))
      .finally(() => setLoading(false));
  }, [fetchList]);

  return (
    <PageShell>
      <h1 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
        <Shield className="size-6" aria-hidden="true" /> SAPS Announcements
      </h1>
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <Skeleton key={n} className="h-20 w-full rounded-xl" />)}
        </div>
      )}
      {!loading && items.length === 0 && (
        <p className="text-muted-foreground">No announcements yet.</p>
      )}
      <ul className="space-y-3">
        {items.map((it) => {
          const unread = !it.opened_timestamp;
          const alert = it.campaign.campaign_type === "missing_person_alert" || it.campaign.campaign_type === "wanted_person_alert";
          const to = alert && it.campaign.case_id
            ? (it.campaign.campaign_type === "wanted_person_alert" ? "/cases/wanted/$id" : "/cases/missing/$id")
            : "/campaigns/$id";
          const params = alert && it.campaign.case_id ? { id: it.campaign.case_id } : { id: it.campaign.id };
          return (
            <li key={it.delivery_id}>
              <Link
                to={to}
                params={params}
                className="block rounded-xl border border-border bg-card p-4 min-h-[64px] hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring outline-none"
                aria-label={`Campaign from SAPS, ${it.campaign.title}, ${it.delivered_timestamp ? formatRelativeTime(it.delivered_timestamp) : ""}, ${unread ? "unread" : "read"}`}
              >
                <div className="flex items-start gap-3">
                  {alert && it.case_thumbnail && (
                    <img
                      src={it.case_thumbnail}
                      alt={it.case_full_name ? `Photograph of ${it.case_full_name}` : "Case photo"}
                      className="size-8 rounded-full object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-primary truncate">{it.campaign.title}</h2>
                      {unread && <span aria-hidden="true" className="size-2 rounded-full bg-accent" />}
                    </div>
                    {alert && (
                      <p className={`text-xs font-medium ${it.campaign.campaign_type === "wanted_person_alert" ? "text-destructive" : "text-primary"}`}>
                        {it.campaign.campaign_type === "wanted_person_alert" ? "Wanted Person" : "Missing Person"}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground line-clamp-2">{it.campaign.body_content.slice(0, 80)}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {it.delivered_timestamp ? formatRelativeTime(it.delivered_timestamp) : ""}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
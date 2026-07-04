import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, ExternalLink } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { PageShell } from "@/components/saps/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCampaign, type CampaignRow } from "@/lib/campaigns/campaigns.functions";

export const Route = createFileRoute("/campaigns/$id")({
  head: () => ({ meta: [{ title: "SAPS Announcement · Community Safety Tracker" }] }),
  component: CampaignDetailPage,
});

function CampaignDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const router = useRouter();
  const fetchCampaign = useServerFn(getCampaign);
  const [c, setC] = useState<CampaignRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaign({ data: { id } })
      .then((row) => setC(row))
      .finally(() => setLoading(false));
  }, [id, fetchCampaign]);

  if (loading) {
    return (
      <PageShell>
        <Skeleton className="h-8 w-3/4 mb-4" />
        <Skeleton className="h-32 w-full" />
      </PageShell>
    );
  }
  if (!c) {
    return (
      <PageShell>
        <p className="text-muted-foreground">This announcement is no longer available.</p>
        <Button className="mt-4" onClick={() => router.history.back()}>Go back</Button>
      </PageShell>
    );
  }

  const dateLabel = c.sent_timestamp
    ? new Date(c.sent_timestamp).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const isAlert = c.campaign_type === "missing_person_alert" || c.campaign_type === "wanted_person_alert";

  return (
    <PageShell>
      <article aria-labelledby="campaign-title">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="size-6 text-primary" aria-label="Official SAPS communication" />
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">SAPS Announcement</span>
        </div>
        <h1 id="campaign-title" className="text-2xl font-bold text-primary mb-4">{c.title}</h1>
        <p className="text-base leading-relaxed whitespace-pre-line text-foreground">{c.body_content}</p>
        <p className="mt-6 text-sm text-muted-foreground">From SAPS{dateLabel ? `, ${dateLabel}` : ""}</p>

        {isAlert && c.case_id && c.case_type && (
          <Button
            className="mt-6 min-h-[44px]"
            onClick={() => navigate({ to: c.case_type === "wanted" ? "/cases/wanted/$id" : "/cases/missing/$id", params: { id: c.case_id! } })}
          >
            <ExternalLink className="size-4" />
            View Case Details
          </Button>
        )}

        <div className="mt-8">
          <Link to="/campaigns" className="text-sm text-primary underline underline-offset-4">All announcements</Link>
        </div>
      </article>
    </PageShell>
  );
}
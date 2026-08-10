import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAdminCampaigns } from "@/lib/admin/campaigns.functions";
import { useStaff } from "@/lib/admin/use-staff";

export const Route = createFileRoute("/admin/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns · SAPS Admin" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Awareness campaign performance for SAPS staff." },
    ],
  }),
  component: AdminCampaignsPage,
});

function AdminCampaignsPage() {
  const { roles } = useStaff();
  const { data, error } = useQuery({
    queryKey: ["admin", "campaigns"],
    queryFn: () => listAdminCampaigns(),
  });

  return (
    <AdminShell title="Campaigns" description="Scheduled and sent public awareness campaigns." roles={roles}>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load campaigns: {error.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((c) => (
          <Card key={c.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-medium">{c.title}</h2>
              <Badge variant="secondary" className="text-xs">{c.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {c.campaign_type.replace(/_/g, " ")} · {c.target_audience.replace("_", " ")}
            </p>
          </Card>
        ))}
        {!(data ?? []).length ? (
          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
        ) : null}
      </div>
    </AdminShell>
  );
}
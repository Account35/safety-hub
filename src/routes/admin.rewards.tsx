import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAdminRewards } from "@/lib/admin/rewards.functions";
import { useStaff } from "@/lib/admin/use-staff";

export const Route = createFileRoute("/admin/rewards")({
  head: () => ({
    meta: [
      { title: "Reward claims · SAPS Admin" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Review reward eligibility and process claims." },
    ],
  }),
  component: AdminRewardsPage,
});

function AdminRewardsPage() {
  const { roles } = useStaff();
  const { data, error } = useQuery({
    queryKey: ["admin", "rewards"],
    queryFn: () => listAdminRewards(),
  });

  return (
    <AdminShell title="Rewards" description="Eligibility records and submitted claims." roles={roles}>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load rewards: {error.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums">{data?.totals.pendingClaims ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Pending claims</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums">R{data?.totals.paidTotal ?? 0}</p>
          <p className="text-xs text-muted-foreground">Paid out</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-semibold tabular-nums">R{data?.totals.eligibleTotal ?? 0}</p>
          <p className="text-xs text-muted-foreground">Eligible, unclaimed</p>
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Reward claims</caption>
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2">Claim</th>
              <th scope="col" className="px-4 py-2">Reporter</th>
              <th scope="col" className="px-4 py-2">Amount</th>
              <th scope="col" className="px-4 py-2">Method</th>
              <th scope="col" className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.claims ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{c.claim_id}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.reporter_anon_code}</td>
                <td className="px-4 py-2">R{c.reward_amount}</td>
                <td className="px-4 py-2">{c.payment_method.replace("_", " ")}</td>
                <td className="px-4 py-2">
                  <Badge variant="secondary" className="text-xs">{c.claim_status}</Badge>
                </td>
              </tr>
            ))}
            {!(data?.claims ?? []).length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No claims submitted yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </AdminShell>
  );
}
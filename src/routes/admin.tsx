import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Loader2 } from "lucide-react";
import { checkStaffAccess } from "@/lib/admin/admin.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SAPS Admin · Community Safety Tracker" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Restricted SAPS staff workspace for reports, cases, rewards and campaigns.",
      },
    ],
  }),
  component: AdminGate,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md p-8">
      <p role="alert" className="text-sm text-destructive">
        Admin workspace error: {error.message}
      </p>
    </div>
  ),
  notFoundComponent: () => null,
});

function AdminGate() {
  const { data, isPending } = useQuery({
    queryKey: ["admin", "staff-check"],
    queryFn: () => checkStaffAccess(),
    staleTime: 60_000,
  });

  if (isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (!data?.isStaff) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md space-y-4 p-6 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
          <h1 className="text-lg font-semibold">Staff access required</h1>
          <p className="text-sm text-muted-foreground">
            This workspace is limited to SAPS staff accounts. Sign in with your staff account, or
            ask a super admin to grant your account a staff role.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to site</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <Outlet />;
}
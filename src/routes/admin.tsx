import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Loader2, KeyRound, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { checkStaffAccess } from "@/lib/admin/admin.functions";
import { changePassword } from "@/lib/profile.functions";
import { PasswordChangeForm } from "@/components/password-change-form";
import { supabase } from "@/integrations/supabase/client";
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
  const queryClient = useQueryClient();
  const router = useRouter();
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

  if (data.mustChangePassword) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md space-y-3 p-6">
          <KeyRound className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-semibold">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            This staff account was provisioned with a temporary password. Choose a new password to
            continue into the admin workspace.
          </p>
          <PasswordChangeForm
            onCancel={async () => {
              await supabase.auth.signOut();
              queryClient.clear();
            }}
            onSubmit={async (current, next) => {
              // Same server path as the citizen Security settings page: it
              // verifies the current password, updates it, and clears the
              // temporary-password requirement in one step.
              await changePassword({ data: { currentPassword: current, newPassword: next } });
              toast.success("Password updated — please sign in with your new password");
              // Changing the password invalidates the current session's refresh
              // token, so sign out cleanly instead of leaving a dead session.
              await queryClient.cancelQueries();
              queryClient.clear();
              await supabase.auth.signOut();
              await router.navigate({ to: "/auth", replace: true });
            }}
          />
        </Card>
      </div>
    );
  }

  return <Outlet />;
}

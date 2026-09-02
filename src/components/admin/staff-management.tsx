import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StaffDeleteDialog } from "@/components/admin/staff-delete-dialog";
import {
  addStaffByEmail,
  listStaffAccounts,
  listStaffDeletionAudit,
  revokeStaffRole,
  type StaffAccount,
  type StaffRoleName,
} from "@/lib/admin/staff.functions";

const ROLES: StaffRoleName[] = ["detective", "analyst", "moderator", "admin", "super_admin"];

export function StaffManagement() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRoleName>("detective");
  const [target, setTarget] = useState<StaffAccount | null>(null);

  const staff = useQuery({
    queryKey: ["admin", "staff-accounts"],
    queryFn: () => listStaffAccounts(),
  });
  const deletions = useQuery({
    queryKey: ["admin", "staff-deletion-audit"],
    queryFn: () => listStaffDeletionAudit(),
  });

  const add = useMutation({
    mutationFn: () => addStaffByEmail({ data: { email: email.trim(), role } }),
    onSuccess: async () => {
      setEmail("");
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff-accounts"] });
    },
  });

  const revoke = useMutation({
    mutationFn: (v: { userId: string; role: StaffRoleName }) => revokeStaffRole({ data: v }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "staff-accounts"] }),
  });

  return (
    <>
      <Card className="mb-6 p-4">
        <h2 className="mb-1 text-sm font-semibold">Staff &amp; roles</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Super admin only. Adding, revoking and deleting staff accounts is recorded in the audit
          trail.
        </p>

        <form
          className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Account email</Label>
            <Input
              id="staff-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@saps.gov.za"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffRoleName)}>
              <SelectTrigger id="staff-role" className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={add.isPending || !email.trim()}>
            <UserPlus className="mr-2 size-4" aria-hidden="true" />
            {add.isPending ? "Adding…" : "Add staff"}
          </Button>
        </form>

        {add.error ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {add.error.message}
          </p>
        ) : null}
        {revoke.error ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {revoke.error.message}
          </p>
        ) : null}

        <ul className="space-y-2">
          {(staff.data ?? []).map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.email ?? "No email on file"}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {s.roles.map((r) => (
                    <Badge key={r} variant="outline" className="text-[10px]">
                      {r.replace(/_/g, " ")}
                      <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        aria-label={`Revoke ${r} from ${s.name}`}
                        onClick={() => revoke.mutate({ userId: s.id, role: r })}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setTarget(s)}>
                <Trash2 className="mr-2 size-4" aria-hidden="true" />
                Delete account
              </Button>
            </li>
          ))}
          {!(staff.data ?? []).length ? (
            <li className="text-sm text-muted-foreground">No staff accounts found.</li>
          ) : null}
        </ul>
      </Card>

      <Card className="mb-6 p-4">
        <h2 className="mb-3 text-sm font-semibold">Staff deletions</h2>
        <ul className="space-y-2 text-sm">
          {(deletions.data ?? []).map((d) => (
            <li key={d.id} className="rounded-md bg-muted/50 p-3">
              <p className="font-medium">
                {d.target_name}
                {d.target_roles.length ? ` · ${d.target_roles.join(", ")}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                Deleted by {d.actor_name} on {new Date(d.created_at).toLocaleString("en-ZA")}
              </p>
              <p className="mt-1 text-xs">Reason: {d.reason}</p>
              <p className="text-xs text-muted-foreground">
                Cases:{" "}
                {d.transfer_outcome === "unassigned_pool"
                  ? "sent to unassigned pool"
                  : `transferred to ${d.transfer_outcome.replace("officer:", "")}`}
                {d.transferred_case_refs.length
                  ? ` (${d.transferred_case_refs.length}: ${d.transferred_case_refs.join(", ")})`
                  : " (none)"}
              </p>
            </li>
          ))}
          {!(deletions.data ?? []).length ? (
            <li className="text-muted-foreground">No staff accounts have been deleted.</li>
          ) : null}
        </ul>
      </Card>

      <StaffDeleteDialog official={target} onClose={() => setTarget(null)} />
    </>
  );
}

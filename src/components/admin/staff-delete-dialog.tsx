import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteStaffAccount,
  getStaffDeletionPreview,
  type AssignedCaseRow,
  type StaffAccount,
} from "@/lib/admin/staff.functions";

interface Props {
  official: StaffAccount | null;
  onClose: () => void;
}

function CaseList({ title, rows }: { title: string; rows: AssignedCaseRow[] }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} ({rows.length})
      </h4>
      {rows.length ? (
        <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md bg-muted/50 p-2 text-xs">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2">
              <span className="font-mono">{r.report_id}</span>
              <Badge variant="outline" className="text-[10px]">
                {r.status.replace(/_/g, " ")}
              </Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">None.</p>
      )}
    </div>
  );
}

export function StaffDeleteDialog({ official, onClose }: Props) {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [transferTo, setTransferTo] = useState<string>("");
  const [reason, setReason] = useState("");

  const preview = useQuery({
    queryKey: ["admin", "staff-delete-preview", official?.id],
    queryFn: () => getStaffDeletionPreview({ data: { userId: official!.id } }),
    enabled: !!official,
  });

  const mutation = useMutation({
    mutationFn: () =>
      deleteStaffAccount({
        data: {
          userId: official!.id,
          reason: reason.trim(),
          transferConfirmed: true as const,
          transferTo: transferTo as string,
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      reset();
      onClose();
    },
  });

  function reset() {
    setConfirmed(false);
    setTransferTo("");
    setReason("");
    mutation.reset();
  }

  const canDelete = confirmed && !!transferTo && reason.trim().length >= 10;

  return (
    <Dialog
      open={!!official}
      onOpenChange={(open) => {
        if (!open) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delete {official?.name}</DialogTitle>
          <DialogDescription>
            This permanently removes the official&apos;s account and staff access.
          </DialogDescription>
        </DialogHeader>

        <div
          role="alert"
          className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          <p>
            This deletion is permanently recorded and will be reported to the official&apos;s
            superior for review.
          </p>
        </div>

        {preview.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading assigned cases…</p>
        ) : preview.error ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load assigned cases: {preview.error.message}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <CaseList title="Open cases" rows={preview.data?.openCases ?? []} />
            <CaseList title="Closed cases" rows={preview.data?.closedCases ?? []} />
          </div>
        )}

        <div className="flex items-start gap-2">
          <Checkbox
            id="transfer-confirm"
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
          />
          <Label htmlFor="transfer-confirm" className="text-sm font-normal leading-snug">
            I confirm the open cases above must be transferred as selected below.
          </Label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transfer-target">Transfer open cases to</Label>
          <Select value={transferTo} onValueChange={setTransferTo}>
            <SelectTrigger id="transfer-target">
              <SelectValue placeholder="Choose a destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">General unassigned / pending pool</SelectItem>
              {(preview.data?.replacements ?? []).map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} · {r.roles.join(", ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="delete-reason">Reason for deletion (required)</Label>
          <Textarea
            id="delete-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this account is being removed (minimum 10 characters)"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{reason.trim().length}/10 characters</p>
        </div>

        {mutation.error ? (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.message}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!canDelete || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Deleting…" : "Delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

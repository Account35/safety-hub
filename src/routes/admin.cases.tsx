import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listAdminCases } from "@/lib/admin/admin.functions";
import { useStaff } from "@/lib/admin/use-staff";

export const Route = createFileRoute("/admin/cases")({
  head: () => ({
    meta: [
      { title: "Case management · SAPS Admin" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Manage wanted and missing person cases." },
    ],
  }),
  component: AdminCasesPage,
});

function AdminCasesPage() {
  const { roles } = useStaff();
  const [kind, setKind] = useState<"wanted" | "missing">("wanted");
  const [q, setQ] = useState("");
  const { data, isPending, error } = useQuery({
    queryKey: ["admin", "cases", kind, q],
    queryFn: () => listAdminCases({ data: { kind, ...(q.trim() ? { q: q.trim() } : {}) } }),
  });

  return (
    <AdminShell title="Case management" description="Wanted and missing person records." roles={roles}>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["wanted", "missing"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${
              kind === k
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {k}
          </button>
        ))}
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search cases by name"
          placeholder="Search by name"
          className="ml-auto w-full sm:w-64"
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Could not load cases: {error.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((c) => (
          <Card key={c.id} className="flex gap-3 p-3">
            {c.photos[0] ? (
              <img
                src={c.photos[0]}
                alt={`Case photo of ${c.full_name}`}
                className="h-16 w-16 rounded-md object-cover"
                loading="lazy"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate font-medium">{c.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{c.subtitle ?? "—"}</p>
              <Badge variant="outline" className="mt-1 text-xs capitalize">
                {c.status}
              </Badge>
            </div>
          </Card>
        ))}
        {!isPending && !(data ?? []).length ? (
          <p className="text-sm text-muted-foreground">No cases found.</p>
        ) : null}
      </div>
    </AdminShell>
  );
}
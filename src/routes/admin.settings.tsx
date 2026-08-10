import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listAuditLog, getAdminSettings } from "@/lib/admin/settings.functions";
import { useStaff } from "@/lib/admin/use-staff";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings & audit log · SAPS Admin" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Admin configuration and the immutable staff audit trail." },
    ],
  }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { roles } = useStaff();
  const settings = useQuery({ queryKey: ["admin", "settings"], queryFn: () => getAdminSettings() });
  const audit = useQuery({ queryKey: ["admin", "audit"], queryFn: () => listAuditLog({ data: {} }) });

  return (
    <AdminShell
      title="Settings & audit log"
      description="Every staff action is recorded in an immutable audit trail."
      roles={roles}
    >
      <Card className="mb-6 p-4">
        <h2 className="mb-3 text-sm font-semibold">Configuration</h2>
        {settings.error ? (
          <p role="alert" className="text-sm text-destructive">
            Could not load settings: {settings.error.message}
          </p>
        ) : null}
        <ul className="space-y-2 text-sm">
          {(settings.data ?? []).map((s) => (
            <li key={s.key} className="rounded-md bg-muted/50 p-2">
              <p className="font-medium">{s.key}</p>
              <pre className="overflow-x-auto text-xs text-muted-foreground">{s.value}</pre>
            </li>
          ))}
          {!(settings.data ?? []).length ? (
            <li className="text-muted-foreground">No configuration entries yet.</li>
          ) : null}
        </ul>
      </Card>

      <Card className="overflow-x-auto">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Audit log</h2>
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">Immutable staff audit log</caption>
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-2">When</th>
              <th scope="col" className="px-4 py-2">Staff</th>
              <th scope="col" className="px-4 py-2">Action</th>
              <th scope="col" className="px-4 py-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {(audit.data ?? []).map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("en-ZA")}
                </td>
                <td className="px-4 py-2">{a.actor_name}</td>
                <td className="px-4 py-2">
                  <Badge variant="outline" className="text-xs">{a.action}</Badge>
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {a.entity_type}
                  {a.entity_id ? ` · ${a.entity_id.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
            {!(audit.data ?? []).length ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No admin actions recorded yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </AdminShell>
  );
}
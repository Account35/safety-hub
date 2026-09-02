import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RANKS } from "@/lib/admin/ranks";
import {
  commitStaffRows,
  validateStaffRows,
  type CommitResult,
  type RawStaffRow,
  type ValidationResult,
} from "@/lib/admin/bulk-staff.functions";

const MAX_ROWS = 500;

function pick(record: Record<string, unknown>, name: string): string {
  const key = Object.keys(record).find(
    (k) => k.trim().toLowerCase().replace(/\s+/g, " ") === name,
  );
  const value = key ? record[key] : "";
  return value == null ? "" : String(value);
}

export function BulkStaffDialog() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<RawStaffRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [summary, setSummary] = useState<CommitResult | null>(null);

  function reset() {
    setFileName("");
    setRows([]);
    setResult(null);
    setSummary(null);
    setParseError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const validateMutation = useMutation({
    mutationFn: (parsed: RawStaffRow[]) => validateStaffRows({ data: { rows: parsed } }),
    onSuccess: (r) => setResult(r),
  });

  const commit = useMutation({
    mutationFn: () => commitStaffRows({ data: { rows } }),
    onSuccess: async (r) => {
      setSummary(r);
      setResult(null);
      toast.success(`${r.created.length} account(s) invited, ${r.skipped.length} skipped`);
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff-accounts"] });
    },
  });

  async function handleFile(file: File) {
    reset();
    setFileName(file.name);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("The workbook has no sheets");
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, {
        defval: "",
      });
      const parsed: RawStaffRow[] = json.map((r, i) => ({
        row: i + 2,
        fullName: pick(r, "full name"),
        rank: pick(r, "rank"),
        email: pick(r, "work email"),
      }));
      const nonEmpty = parsed.filter((r) => r.fullName || r.rank || r.email);
      if (!nonEmpty.length) {
        throw new Error("No data rows found. Expected columns: Full Name, Rank, Work Email.");
      }
      if (nonEmpty.length > MAX_ROWS) {
        throw new Error(`This file has ${nonEmpty.length} rows; the limit is ${MAX_ROWS}.`);
      }
      setRows(nonEmpty);
      validateMutation.mutate(nonEmpty);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Could not read that file");
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="mr-2 size-4" aria-hidden="true" />
        Bulk add staff
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk add staff from Excel</DialogTitle>
            <DialogDescription>
              Upload an .xlsx file with columns <strong>Full Name</strong>, <strong>Rank</strong>{" "}
              and <strong>Work Email</strong> (name.surname@saps.gov.za). Nothing is created until
              you confirm. Each staff member receives a unique expiring invite link and sets their
              own password on first login.
            </DialogDescription>
          </DialogHeader>

          {!summary ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="bulk-staff-file"
                  className="mb-1.5 block text-sm font-medium leading-none"
                >
                  Excel file
                </label>
                <input
                  ref={inputRef}
                  id="bulk-staff-file"
                  type="file"
                  accept=".xlsx"
                  className="block w-full rounded-md border border-input bg-background p-2 text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Accepted ranks: {RANKS.join(", ")}.
                </p>
              </div>

              {parseError ? (
                <p role="alert" className="text-sm text-destructive">
                  {parseError}
                </p>
              ) : null}
              {validateMutation.isPending ? (
                <p className="text-sm text-muted-foreground">Validating {fileName}…</p>
              ) : null}
              {validateMutation.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {validateMutation.error.message}
                </p>
              ) : null}

              {result ? (
                <div className="space-y-4">
                  <p className="text-sm">
                    <strong>{result.valid.length}</strong> row(s) ready ·{" "}
                    <strong>{result.errors.length}</strong> row(s) with errors, from {fileName}.
                  </p>

                  {result.errors.length ? (
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-sm">
                        <caption className="sr-only">Rows that cannot be imported</caption>
                        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                          <tr>
                            <th scope="col" className="px-3 py-2">
                              Row
                            </th>
                            <th scope="col" className="px-3 py-2">
                              Email
                            </th>
                            <th scope="col" className="px-3 py-2">
                              Problem
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.errors.map((e) => (
                            <tr key={`${e.row}-${e.email}`} className="border-t border-border">
                              <td className="px-3 py-2">{e.row}</td>
                              <td className="px-3 py-2">{e.email || "—"}</td>
                              <td className="px-3 py-2 text-destructive">{e.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {result.valid.length ? (
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-sm">
                        <caption className="sr-only">Rows ready to import</caption>
                        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                          <tr>
                            <th scope="col" className="px-3 py-2">
                              Row
                            </th>
                            <th scope="col" className="px-3 py-2">
                              Name
                            </th>
                            <th scope="col" className="px-3 py-2">
                              Rank
                            </th>
                            <th scope="col" className="px-3 py-2">
                              Email
                            </th>
                            <th scope="col" className="px-3 py-2">
                              Role
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.valid.map((v) => (
                            <tr key={v.email} className="border-t border-border">
                              <td className="px-3 py-2">{v.row}</td>
                              <td className="px-3 py-2">{v.fullName}</td>
                              <td className="px-3 py-2">{v.rank}</td>
                              <td className="px-3 py-2">{v.email}</td>
                              <td className="px-3 py-2">{v.role.replace(/_/g, " ")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {commit.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {commit.error.message}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                <strong>{summary.created.length}</strong> account(s) created and invited ·{" "}
                <strong>{summary.skipped.length}</strong> row(s) skipped.
              </p>
              {summary.skipped.length ? (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <caption className="sr-only">Skipped rows and reasons</caption>
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-3 py-2">
                          Row
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Email
                        </th>
                        <th scope="col" className="px-3 py-2">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.skipped.map((s) => (
                        <tr key={`${s.row}-${s.email}`} className="border-t border-border">
                          <td className="px-3 py-2">{s.row}</td>
                          <td className="px-3 py-2">{s.email || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter>
            {summary ? (
              <>
                <Button variant="outline" onClick={reset}>
                  Upload another file
                </Button>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={!result?.valid.length || commit.isPending}
                  onClick={() => commit.mutate()}
                >
                  <Upload className="mr-2 size-4" aria-hidden="true" />
                  {commit.isPending
                    ? "Creating accounts…"
                    : `Create ${result?.valid.length ?? 0} account(s)`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

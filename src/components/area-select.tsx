import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TOWNSHIPS } from "@/lib/reports/townships";
import { readDraft, writeDraft } from "@/lib/ui/sticky-draft";

/**
 * Searchable picker over the canonical township/area list.
 * The same list backs the citizen dashboard, profile and report wizard,
 * and the officer report queue filter, so saved values always match.
 */
export function AreaSelect({
  value,
  onChange,
  storageKey,
  label = "Area",
  options = TOWNSHIPS,
}: {
  value: string | null;
  onChange: (v: string) => void;
  storageKey: string;
  label?: string;
  options?: string[];
}) {
  const [search, setSearch] = useState("");

  // Restore any search text typed before navigating away.
  useEffect(() => {
    const saved = readDraft(storageKey);
    if (saved) setSearch(saved);
  }, [storageKey]);

  function updateSearch(next: string) {
    setSearch(next);
    writeDraft(storageKey, next);
  }

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => o.toLowerCase().includes(needle));
  }, [options, search]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="absolute left-2.5 top-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Search areas"
          aria-label={`Search ${label.toLowerCase()}`}
          className="h-11 pl-8"
        />
      </div>
      <ul
        className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-1"
        aria-label={`${label} options`}
      >
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-sm text-muted-foreground">No matching area.</li>
        )}
        {filtered.map((o) => (
          <li key={o}>
            <button
              type="button"
              aria-pressed={value === o}
              onClick={() => onChange(o)}
              className={
                value === o
                  ? "w-full rounded-md bg-primary px-3 py-2 text-left text-sm font-medium text-primary-foreground"
                  : "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              }
              style={{ minHeight: 44 }}
            >
              {o}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

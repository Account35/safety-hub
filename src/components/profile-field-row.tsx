import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  label: string;
  value: string | null;
  placeholder?: string;
  onSave: (v: string) => Promise<void>;
  validate?: (v: string) => string | null;
  inputType?: string;
}

export function ProfileFieldRow({ label, value, placeholder = "Not provided", onSave, validate, inputType = "text" }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function handleSave() {
    const err = validate?.(draft) ?? null;
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(false);
      setTimeout(() => editBtnRef.current?.focus(), 50);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(value ?? "");
    setError(null);
    setEditing(false);
    setTimeout(() => editBtnRef.current?.focus(), 50);
  }

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        {!editing && (
          <button
            ref={editBtnRef}
            className="p-2.5 rounded hover:bg-muted text-muted-foreground"
            style={{ minWidth: 44, minHeight: 44 }}
            onClick={() => { setDraft(value ?? ""); setEditing(true); }}
            aria-label={`Edit ${label}`}
          >
            {saved ? <Check className="size-4 text-green-600" /> : <Pencil className="size-4" />}
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-1 space-y-2">
          <Input
            ref={inputRef}
            type={inputType}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(null); }}
            aria-label={label}
            aria-invalid={!!error}
            aria-describedby={error ? `${label}-err` : undefined}
            className="h-10"
          />
          {error && <p id={`${label}-err`} className="text-xs text-destructive" role="alert">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-9">
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} className="h-9">
              <X className="size-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className={`mt-0.5 text-sm ${value ? "text-foreground" : "text-muted-foreground italic"}`}>
          {value ?? placeholder}
        </p>
      )}
    </div>
  );
}

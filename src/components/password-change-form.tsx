import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const passwordRule = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Needs an uppercase letter")
  .regex(/[0-9]/, "Needs a number")
  .regex(/[^A-Za-z0-9]/, "Needs a special character");

function strength(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return { score: s as 0 | 1 | 2 | 3, label: ["Too short", "Weak", "Medium", "Strong"][s] };
}

interface Props {
  onSubmit: (current: string, next: string) => Promise<void>;
  onCancel: () => void;
}

export function PasswordChangeForm({ onSubmit, onCancel }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showC, setShowC] = useState(false);
  const [showN, setShowN] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const str = strength(next);
  const strengthColors = ["bg-muted", "bg-destructive", "bg-amber-500", "bg-accent"];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!current) errs.current = "Required";
    const parsed = passwordRule.safeParse(next);
    if (!parsed.success) errs.next = parsed.error.issues[0].message;
    if (next !== confirm) errs.confirm = "Passwords do not match";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await onSubmit(current, next);
    } catch (err: unknown) {
      setErrors({ current: err instanceof Error ? err.message : "Current password is incorrect" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-3" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="cp-current">Current Password</Label>
        <div className="relative">
          <Input id="cp-current" type={showC ? "text" : "password"} value={current}
            onChange={e => { setCurrent(e.target.value); setErrors(p => ({ ...p, current: "" })); }}
            className="h-10 pr-10" aria-invalid={!!errors.current}
            aria-describedby={errors.current ? "cp-current-err" : undefined} />
          <button type="button" onClick={() => setShowC(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted-foreground"
            aria-label={showC ? "Hide password" : "Show password"}>
            {showC ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.current && <p id="cp-current-err" className="text-xs text-destructive" role="alert">{errors.current}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cp-next">New Password</Label>
        <div className="relative">
          <Input id="cp-next" type={showN ? "text" : "password"} value={next}
            onChange={e => { setNext(e.target.value); setErrors(p => ({ ...p, next: "" })); }}
            className="h-10 pr-10" aria-invalid={!!errors.next}
            aria-describedby="cp-next-hint" />
          <button type="button" onClick={() => setShowN(s => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-muted-foreground"
            aria-label={showN ? "Hide password" : "Show password"}>
            {showN ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {next && (
          <div className="space-y-1">
            <div className="flex h-1.5 gap-1" aria-hidden="true">
              {[0, 1, 2].map(i => (
                <span key={i} className={`flex-1 rounded ${i < str.score ? strengthColors[str.score] : "bg-muted"}`} />
              ))}
            </div>
            <p id="cp-next-hint" className="text-xs text-muted-foreground">
              Strength: <span className="font-medium">{str.label}</span> · 8+ chars, uppercase, number, symbol
            </p>
          </div>
        )}
        {errors.next && <p className="text-xs text-destructive" role="alert">{errors.next}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cp-confirm">Confirm New Password</Label>
        <Input id="cp-confirm" type="password" value={confirm}
          onChange={e => { setConfirm(e.target.value); setErrors(p => ({ ...p, confirm: "" })); }}
          className="h-10" aria-invalid={!!errors.confirm}
          aria-describedby={errors.confirm ? "cp-confirm-err" : undefined} />
        {errors.confirm && <p id="cp-confirm-err" className="text-xs text-destructive" role="alert">{errors.confirm}</p>}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="h-9">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Change Password"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="h-9">Cancel</Button>
      </div>
    </form>
  );
}

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Heart } from "lucide-react";
import type { CaseType } from "@/lib/reports/types";

const WANTED_POINTS = [
  "Do not approach the suspect under any circumstances",
  "Report from a safe location away from the person",
  "Your identity is completely protected and never revealed to anyone",
  "If you are in immediate danger, call 10111 first then report",
];
const MISSING_POINTS = [
  "Your information could help bring this person home safely",
  "All information you share is confidential",
  "Your identity is always protected",
  "Contact SAPS on 10111 if this is an emergency",
];

export function SafetyModal({
  open,
  caseType,
  onContinue,
  onCancel,
}: {
  open: boolean;
  caseType: CaseType;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const [ack, setAck] = useState(false);
  const isWanted = caseType === "wanted";
  const points = isWanted ? WANTED_POINTS : MISSING_POINTS;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="p-0 sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <div
          className={
            isWanted
              ? "flex items-center gap-3 rounded-t-lg bg-destructive p-4 text-destructive-foreground"
              : "flex items-center gap-3 rounded-t-lg bg-primary p-4 text-primary-foreground"
          }
        >
          {isWanted ? (
            <AlertTriangle className="h-8 w-8 shrink-0" aria-hidden />
          ) : (
            <Heart className="h-8 w-8 shrink-0" aria-hidden />
          )}
          <DialogHeader className="space-y-0 text-left">
            <DialogTitle className="text-lg font-bold text-current">
              BEFORE YOU REPORT
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="space-y-4 p-6 pt-4">
          <ul className="space-y-2 text-sm">
            {points.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-muted/40 p-3">
            <Checkbox
              checked={ack}
              onCheckedChange={(v) => setAck(v === true)}
              className="mt-0.5"
              aria-label="Acknowledge safety information"
            />
            <span className="text-sm font-medium leading-snug">
              I have read and understood the safety information above
            </span>
          </label>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-between">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!ack}
            onClick={onContinue}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Continue to Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { Pencil, Lock, ShieldCheck, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIVACY_LABELS } from "@/lib/reports/draft";
import type { ReportDraft } from "@/lib/reports/types";
import type { CaseSummary } from "@/lib/reports/reports.functions";

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1 text-xs font-medium text-accent-foreground hover:underline"
            aria-label={`Edit ${title}`}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>
      <div className="space-y-1 text-sm">{children}</div>
    </Card>
  );
}

export function PreviewStep({
  draft,
  summary,
  submitting,
  onChange,
  onEdit,
  onBack,
  onSubmit,
}: {
  draft: ReportDraft;
  summary: CaseSummary | null;
  submitting: boolean;
  onChange: (patch: Partial<ReportDraft>) => void;
  onEdit: (step: "text" | "voice" | "photo" | "location") => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const [showFull, setShowFull] = useState(false);
  const desc = draft.textDescription ?? "";
  const truncated = desc.length > 200 && !showFull ? desc.slice(0, 200) + "…" : desc;

  const locText = draft.locationTownship
    ? `Near ${draft.locationTownship}`
    : draft.locationLandmarks[0]
      ? `Near ${draft.locationLandmarks[0]}`
      : "Not specified";

  const canSubmit = draft.accuracyConfirmed && draft.voluntaryConfirmed && !submitting;

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-xl font-bold text-primary">Review Your Report</h2>
        <p className="text-xs text-muted-foreground">
          Check everything below. Tap Edit on any section to make changes.
        </p>
      </header>

      <Section title="Case">
        <p>
          <span className="font-medium">{summary?.fullName ?? "Loading…"}</span> ·{" "}
          <span className="text-muted-foreground">
            {draft.caseType === "wanted" ? "Wanted Person" : "Missing Person"}
          </span>
        </p>
      </Section>

      <Section title="Time and Location" onEdit={() => onEdit("location")}>
        <p>
          <span className="text-muted-foreground">When:</span>{" "}
          {draft.sightingDate ?? "Not specified"} {draft.sightingTime ? `· ${draft.sightingTime}` : ""}
        </p>
        <p>
          <span className="text-muted-foreground">Where:</span> {locText}
        </p>
        <p className="text-xs text-muted-foreground">
          Privacy: {PRIVACY_LABELS[draft.locationPrivacyLevel]}
        </p>
      </Section>

      {draft.methods.includes("text") && (
        <Section title="Description" onEdit={() => onEdit("text")}>
          {desc ? (
            <>
              <p className="whitespace-pre-wrap">{truncated}</p>
              {desc.length > 200 && (
                <button
                  type="button"
                  onClick={() => setShowFull((s) => !s)}
                  className="text-xs font-medium text-accent-foreground hover:underline"
                >
                  {showFull ? "Read Less" : "Read More"}
                </button>
              )}
              {draft.companionDescription && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Companions: {draft.companionDescription}
                </p>
              )}
              {draft.confidence && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Confidence: {draft.confidence}/5
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">No description added.</p>
          )}
        </Section>
      )}

      {draft.methods.includes("voice") && (
        <Section title="Voice Report" onEdit={() => onEdit("voice")}>
          {draft.voice ? (
            <div className="flex items-center gap-3">
              <Play className="h-4 w-4 text-accent" />
              <span>Voice: {formatDuration(draft.voice.durationSec)}</span>
              <audio src={draft.voice.previewUrl} controls className="h-8" />
            </div>
          ) : (
            <p className="text-muted-foreground">
              Voice recording not available (may be lost after page reload).
            </p>
          )}
        </Section>
      )}

      {draft.methods.includes("photo") && (
        <Section title={`Photos (${draft.photos.length})`} onEdit={() => onEdit("photo")}>
          {draft.photos.length === 0 ? (
            <p className="text-muted-foreground">No photos added.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto">
              {draft.photos.map((p) => (
                <img
                  key={p.id}
                  src={p.previewUrl}
                  alt={p.caption || "Report photo"}
                  className="h-20 w-20 shrink-0 rounded object-cover"
                />
              ))}
            </div>
          )}
        </Section>
      )}

      <Card className="flex items-start gap-2 border-accent/40 bg-accent/5 p-3 text-xs">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>All personal information removed. Location shows approximate area only.</p>
      </Card>

      <div className="space-y-2 rounded-md border p-3">
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={draft.accuracyConfirmed}
            onCheckedChange={(v) => onChange({ accuracyConfirmed: v === true })}
            className="mt-0.5"
          />
          <span className="text-sm">
            The information I have provided is accurate to the best of my knowledge.
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={draft.voluntaryConfirmed}
            onCheckedChange={(v) => onChange({ voluntaryConfirmed: v === true })}
            className="mt-0.5"
          />
          <span className="text-sm">
            I confirm I submitted this report voluntarily without being pressured by anyone.
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          These confirmations help ensure report quality. False reports waste police resources and are
          taken seriously.
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Your identity is protected. Only your anonymous reference code is sent.
      </p>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={submitting}>
          Back
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Lock className="h-4 w-4" />
          {submitting ? "Submitting your report…" : "Submit Report to SAPS"}
        </Button>
      </div>
    </div>
  );
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec} sec`;
  return `${m} min ${sec} sec`;
}
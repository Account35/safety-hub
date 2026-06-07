import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ReportDraft, CaseType } from "@/lib/reports/types";

const PROMPT_CHIPS = [
  "What were they wearing?",
  "Which direction were they moving?",
  "Who were they with?",
  "What vehicle were they near?",
];
const CONFIDENCE = [
  { v: 5, label: "I am certain this is the person" },
  { v: 4, label: "Very likely this is the person" },
  { v: 3, label: "Probably this is the person" },
  { v: 2, label: "Not sure but possibly this person" },
  { v: 1, label: "I think it might be but I'm not confident" },
] as const;

function maxDate(): string {
  return new Date().toISOString().slice(0, 10);
}
function minDate(caseType: CaseType): string {
  const d = new Date();
  d.setDate(d.getDate() - (caseType === "wanted" ? 30 : 180));
  return d.toISOString().slice(0, 10);
}

export function TextStep({
  draft,
  onChange,
  onBack,
  onContinue,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [errors, setErrors] = useState<{ date?: string; desc?: string }>({});
  const [chips, setChips] = useState(PROMPT_CHIPS);
  const desc = draft.textDescription ?? "";

  function appendChip(c: string) {
    const newDesc = desc ? `${desc.trimEnd()}\n${c} ` : `${c} `;
    onChange({ textDescription: newDesc.slice(0, 1000) });
    setChips((cs) => cs.filter((x) => x !== c));
  }

  function handleContinue() {
    const errs: typeof errors = {};
    if (!draft.sightingDate) errs.date = "Please enter when you saw this person.";
    if (!desc.trim()) errs.desc = "Please describe what you saw, even briefly.";
    setErrors(errs);
    if (Object.keys(errs).length === 0) onContinue();
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-primary">Describe What You Saw</h2>
        <p className="text-xs text-muted-foreground">
          Everything you write here is confidential and anonymous.
        </p>
      </header>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-primary">When Did You See This Person?</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sd">Date</Label>
            <Input
              id="sd"
              type="date"
              min={minDate(draft.caseType)}
              max={maxDate()}
              value={draft.sightingDate ?? ""}
              onChange={(e) => onChange({ sightingDate: e.target.value })}
              className="h-11"
            />
            {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st">Time (approximate is fine)</Label>
            <Input
              id="st"
              type="time"
              value={draft.sightingTime ?? ""}
              onChange={(e) => onChange({ sightingTime: e.target.value })}
              className="h-11"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Approximate times are fine. Your best recollection is valuable.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-primary">What Did You See?</h3>
        <Textarea
          value={desc}
          maxLength={1000}
          onChange={(e) => onChange({ textDescription: e.target.value })}
          placeholder="Describe what you saw. For example: clothing colors and style, direction of movement, what the person was doing, who they were with, any vehicles involved"
          rows={5}
          className="resize-y"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{desc.length}/1000</span>
          {errors.desc && <span className="text-destructive">{errors.desc}</span>}
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => appendChip(c)}
                className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent/20"
              >
                + {c}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-primary">Was Anyone With Them?</h3>
        <Textarea
          value={draft.companionDescription ?? ""}
          maxLength={300}
          onChange={(e) => onChange({ companionDescription: e.target.value })}
          placeholder="Describe anyone accompanying the person"
          rows={2}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Leave blank if the person was alone.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-base font-semibold text-primary">How Confident Are You?</h3>
        <RadioGroup
          value={String(draft.confidence ?? "")}
          onValueChange={(v) =>
            onChange({ confidence: Number(v) as 1 | 2 | 3 | 4 | 5 })
          }
        >
          {CONFIDENCE.map((c) => (
            <label
              key={c.v}
              className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50"
            >
              <RadioGroupItem value={String(c.v)} id={`c-${c.v}`} />
              <span className="text-sm">{c.label}</span>
            </label>
          ))}
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Honest assessment helps investigators prioritize. All confidence levels are valuable.
        </p>
      </section>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={handleContinue}
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
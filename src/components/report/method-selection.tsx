import { Card } from "@/components/ui/card";
import { Check, Keyboard, Mic, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CaseType, ReportMethod } from "@/lib/reports/types";
import { toggleMethod } from "@/lib/reports/draft";

const CARDS: Array<{
  key: ReportMethod;
  icon: typeof Keyboard;
  title: string;
  desc: string;
}> = [
  {
    key: "text",
    icon: Keyboard,
    title: "Describe What You Saw",
    desc: "Type a detailed description. Good for recalling specific details, clothing, and behavior.",
  },
  {
    key: "voice",
    icon: Mic,
    title: "Record Your Voice",
    desc: "Speak your report out loud. Quick and natural, especially while on the move.",
  },
];

export function MethodSelection({
  caseType,
  selected,
  onChange,
  onContinue,
}: {
  caseType: CaseType;
  selected: ReportMethod[];
  onChange: (next: ReportMethod[]) => void;
  onContinue: () => void;
}) {
  const photoCard = {
    key: "photo" as const,
    icon: Camera,
    title: caseType === "wanted" ? "Upload a Photo (Caution)" : "Upload a Photo",
    desc:
      caseType === "wanted"
        ? "Only upload photos taken safely from distance. Do not photograph a dangerous suspect."
        : "Share photos that might help identify or locate this person.",
  };
  const all = [...CARDS, photoCard];

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold text-primary">How Would You Like to Report?</h2>
        <p className="text-sm text-muted-foreground">
          Choose one or more ways to share what you know. More detail helps investigators.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {all.map(({ key, icon: Icon, title, desc }) => {
          const isSelected = selected.includes(key);
          return (
            <Card
              key={key}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => onChange(toggleMethod(selected, key))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(toggleMethod(selected, key));
                }
              }}
              className={cn(
                "relative min-h-[140px] cursor-pointer border-2 p-4 transition-colors hover:bg-accent/5",
                isSelected ? "border-accent" : "border-border",
              )}
            >
              {isSelected && (
                <div className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-4 w-4" />
                </div>
              )}
              <Icon className="mb-2 h-7 w-7 text-accent" aria-hidden />
              <h3 className="text-base font-semibold text-primary">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              {key === "photo" && caseType === "wanted" && (
                <p className="mt-2 text-xs font-medium text-destructive">
                  Photographing a dangerous suspect puts you at serious risk. Text or voice reporting is safer.
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {selected.length} method{selected.length === 1 ? "" : "s"} selected
      </p>

      <Button
        size="lg"
        disabled={selected.length === 0}
        onClick={onContinue}
        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        Start Reporting
      </Button>
    </div>
  );
}
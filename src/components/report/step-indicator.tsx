import { cn } from "@/lib/utils";

export interface StepDef {
  key: string;
  label: string;
}

export function StepIndicator({
  steps,
  currentIndex,
}: {
  steps: StepDef[];
  currentIndex: number;
}) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Report progress">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-1.5">
            <div
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold",
                done && "border-accent bg-accent text-accent-foreground",
                current && "border-accent text-accent-foreground bg-accent/20",
                !done && !current && "border-muted text-muted-foreground",
              )}
              aria-current={current ? "step" : undefined}
            >
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded",
                  i < currentIndex ? "bg-accent" : "bg-muted",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
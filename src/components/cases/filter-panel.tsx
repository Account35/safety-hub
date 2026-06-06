import type { ReactNode } from "react";
import { Filter, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WANTED_CATEGORIES,
  WANTED_TIME,
  DANGER,
  REWARD,
  MISSING_TIME,
  AGE_GROUPS,
  VULNERABILITIES,
  CIRCUMSTANCES,
  SORTS,
  type WantedSearch,
  type MissingSearch,
} from "@/lib/cases/filters";

function FilterTrigger({ activeCount }: { activeCount: number }) {
  return (
    <Button variant="outline" className="h-11 gap-2">
      <Filter className="size-4" aria-hidden="true" />
      <span>Filters</span>
      {activeCount > 0 && (
        <span className="grid size-5 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {activeCount}
        </span>
      )}
    </Button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

const TIME_LABELS: Record<string, string> = {
  "24h": "Last 24 hours",
  "48h": "Last 48 hours",
  "7d": "Last week",
  "30d": "Last month",
  "90d": "Last 3 months",
  all: "Any time",
};

const SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  az: "Name A–Z",
  za: "Name Z–A",
};

const DANGER_LABELS: Record<string, string> = {
  high: "High risk only",
  mediumHigh: "Medium & high risk",
  all: "All danger levels",
};

const REWARD_LABELS: Record<string, string> = {
  any: "Any case",
  rewardOnly: "Reward cases only",
  noReward: "No reward",
};

const CIRCUMSTANCE_LABELS: Record<string, string> = {
  voluntary: "Voluntary missing",
  family_conflict: "Family conflict",
  endangered: "Endangered / abducted",
  medical: "Medical emergency",
  unknown: "Unknown circumstance",
};

const AGE_LABELS: Record<string, string> = {
  child: "Children (0–12)",
  teen: "Teens (13–17)",
  adult: "Adults (18–59)",
  senior: "Seniors (60+)",
};

export function WantedFilterPanel({
  search,
  onChange,
  onClear,
  activeCount,
}: {
  search: WantedSearch;
  onChange: (patch: Partial<WantedSearch>) => void;
  onClear: () => void;
  activeCount: number;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <FilterTrigger activeCount={activeCount} />
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter wanted persons</SheetTitle>
          <SheetDescription>Narrow results by danger, crime, location, time, or reward.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <Section title="Danger level">
            <RadioGroup
              value={search.danger}
              onValueChange={(v) => onChange({ danger: v as WantedSearch["danger"], page: 1 })}
            >
              {DANGER.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <RadioGroupItem id={`d-${d}`} value={d} />
                  <Label htmlFor={`d-${d}`}>{DANGER_LABELS[d]}</Label>
                </div>
              ))}
            </RadioGroup>
          </Section>

          <Section title="Crime category">
            {WANTED_CATEGORIES.map((c) => {
              const checked = search.categories.includes(c);
              return (
                <div key={c} className="flex items-center gap-2">
                  <Checkbox
                    id={`c-${c}`}
                    checked={checked}
                    onCheckedChange={(v) =>
                      onChange({
                        categories: v
                          ? [...search.categories, c]
                          : search.categories.filter((x) => x !== c),
                        page: 1,
                      })
                    }
                  />
                  <Label htmlFor={`c-${c}`}>{c}</Label>
                </div>
              );
            })}
          </Section>

          <Section title="Location">
            <Input
              placeholder="e.g. Soweto, Johannesburg"
              value={search.location}
              onChange={(e) => onChange({ location: e.target.value, page: 1 })}
              className="h-10"
              aria-label="Filter by location"
            />
          </Section>

          <Section title="Time added">
            <RadioGroup
              value={search.time}
              onValueChange={(v) => onChange({ time: v as WantedSearch["time"], page: 1 })}
            >
              {WANTED_TIME.map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <RadioGroupItem id={`t-${t}`} value={t} />
                  <Label htmlFor={`t-${t}`}>{TIME_LABELS[t]}</Label>
                </div>
              ))}
            </RadioGroup>
          </Section>

          <Section title="Reward">
            <RadioGroup
              value={search.reward}
              onValueChange={(v) => onChange({ reward: v as WantedSearch["reward"], page: 1 })}
            >
              {REWARD.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem id={`r-${r}`} value={r} />
                  <Label htmlFor={`r-${r}`}>{REWARD_LABELS[r]}</Label>
                </div>
              ))}
            </RadioGroup>
          </Section>

          <Section title="Sort by">
            <Select
              value={search.sort}
              onValueChange={(v) => onChange({ sort: v as WantedSearch["sort"] })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClear} className="gap-2">
            <X className="size-4" /> Clear all
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function MissingFilterPanel({
  search,
  onChange,
  onClear,
  activeCount,
}: {
  search: MissingSearch;
  onChange: (patch: Partial<MissingSearch>) => void;
  onClear: () => void;
  activeCount: number;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <FilterTrigger activeCount={activeCount} />
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter missing persons</SheetTitle>
          <SheetDescription>Filter by time missing, age, vulnerability, or circumstance.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <Section title="Time missing">
            <RadioGroup
              value={search.time}
              onValueChange={(v) => onChange({ time: v as MissingSearch["time"], page: 1 })}
            >
              {MISSING_TIME.map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <RadioGroupItem id={`mt-${t}`} value={t} />
                  <Label htmlFor={`mt-${t}`}>{TIME_LABELS[t]}</Label>
                </div>
              ))}
            </RadioGroup>
          </Section>

          <Section title="Age group">
            {AGE_GROUPS.map((a) => {
              const checked = search.ages.includes(a);
              return (
                <div key={a} className="flex items-center gap-2">
                  <Checkbox
                    id={`a-${a}`}
                    checked={checked}
                    onCheckedChange={(v) =>
                      onChange({
                        ages: v ? [...search.ages, a] : search.ages.filter((x) => x !== a),
                        page: 1,
                      })
                    }
                  />
                  <Label htmlFor={`a-${a}`}>{AGE_LABELS[a]}</Label>
                </div>
              );
            })}
          </Section>

          <Section title="Vulnerability">
            {VULNERABILITIES.map((v) => {
              const checked = search.vulns.includes(v);
              return (
                <div key={v} className="flex items-center gap-2">
                  <Checkbox
                    id={`v-${v}`}
                    checked={checked}
                    onCheckedChange={(val) =>
                      onChange({
                        vulns: val ? [...search.vulns, v] : search.vulns.filter((x) => x !== v),
                        page: 1,
                      })
                    }
                  />
                  <Label htmlFor={`v-${v}`}>{v}</Label>
                </div>
              );
            })}
          </Section>

          <Section title="Circumstance">
            {CIRCUMSTANCES.map((c) => {
              const checked = search.circumstances.includes(c);
              return (
                <div key={c} className="flex items-center gap-2">
                  <Checkbox
                    id={`cc-${c}`}
                    checked={checked}
                    onCheckedChange={(v) =>
                      onChange({
                        circumstances: v
                          ? [...search.circumstances, c]
                          : search.circumstances.filter((x) => x !== c),
                        page: 1,
                      })
                    }
                  />
                  <Label htmlFor={`cc-${c}`}>{CIRCUMSTANCE_LABELS[c]}</Label>
                </div>
              );
            })}
          </Section>

          <Section title="Location">
            <Input
              placeholder="e.g. Soweto"
              value={search.location}
              onChange={(e) => onChange({ location: e.target.value, page: 1 })}
              className="h-10"
              aria-label="Filter by location"
            />
          </Section>

          <Section title="Sort by">
            <Select
              value={search.sort}
              onValueChange={(v) => onChange({ sort: v as MissingSearch["sort"] })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SORT_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Section>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClear} className="gap-2">
            <X className="size-4" /> Clear all
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
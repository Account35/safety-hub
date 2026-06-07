import { useState } from "react";
import { MapPin, Landmark, Navigation, ShieldCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { fuzzCoords } from "@/lib/reports/fuzz";
import { TOWNSHIPS } from "@/lib/reports/townships";
import { PRIVACY_LABELS } from "@/lib/reports/draft";
import type { ReportDraft, PrivacyLevel } from "@/lib/reports/types";

type Mode = "auto" | "list" | "landmark";

const PRIVACY_NOTES: Record<PrivacyLevel, string> = {
  township: "Investigators know which township. Maximum privacy.",
  neighborhood: "Investigators know which part of the township. Balanced privacy.",
  landmark: "Investigators know the specific area. Most helpful for investigation.",
};

export function LocationStep({
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
  const [mode, setMode] = useState<Mode | null>(
    draft.locationApproximate ? "auto" : draft.locationTownship ? "list" : draft.locationLandmarks.length ? "landmark" : null,
  );
  const [search, setSearch] = useState("");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  async function useCurrent() {
    setGeoError(null);
    if (!("geolocation" in navigator)) {
      setGeoError("Location access declined. Choose your area manually below.");
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fuzzed = fuzzCoords(pos.coords.latitude, pos.coords.longitude);
        onChange({
          locationApproximate: fuzzed,
          locationTownship: draft.locationTownship ?? "Approximate area",
        });
        setMode("auto");
        setRequesting(false);
      },
      () => {
        setGeoError("Location access declined. Choose your area manually below.");
        setRequesting(false);
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  const filtered = TOWNSHIPS.filter((t) => t.toLowerCase().includes(search.toLowerCase())).slice(0, 30);

  const summary = draft.locationTownship
    ? `Near ${draft.locationTownship}`
    : draft.locationLandmarks[0]
      ? `Near ${draft.locationLandmarks[0]}`
      : null;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-bold text-primary">Where Did You See This Person?</h2>
      </header>

      <div className="flex items-start gap-2 rounded-md bg-primary p-3 text-primary-foreground">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p className="text-sm">
          Your exact location is never shared. Only an approximate area is recorded.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <OptionCard
          icon={<Navigation className="h-6 w-6 text-accent" />}
          title="Use My Current Area"
          desc="Detect my approximate area automatically"
          active={mode === "auto"}
          onClick={useCurrent}
          extra={
            requesting ? <p className="text-xs text-muted-foreground">Requesting…</p> : null
          }
        />
        <OptionCard
          icon={<MapPin className="h-6 w-6 text-accent" />}
          title="Select My Township"
          desc="Choose from a list of townships"
          active={mode === "list"}
          onClick={() => setMode("list")}
        />
        <OptionCard
          icon={<Landmark className="h-6 w-6 text-accent" />}
          title="Describe Landmarks"
          desc="Describe where you were without exact address"
          active={mode === "landmark"}
          onClick={() => setMode("landmark")}
        />
      </div>

      {geoError && <p className="text-sm text-destructive">{geoError}</p>}

      {mode === "list" && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search townships…"
              className="pl-8"
            />
          </div>
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {filtered.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => onChange({ locationTownship: t, locationApproximate: undefined })}
                  className={
                    draft.locationTownship === t
                      ? "w-full rounded-md bg-accent/20 px-3 py-2 text-left text-sm font-medium"
                      : "w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                  }
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === "landmark" && (
        <div className="space-y-2 rounded-md border p-3">
          <Input
            value={draft.locationLandmarks[0] ?? ""}
            maxLength={200}
            onChange={(e) =>
              onChange({
                locationLandmarks: e.target.value ? [e.target.value] : [],
              })
            }
            placeholder="For example: Near Shoprite on Main Road, opposite the taxi rank"
          />
        </div>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-primary">How much should investigators see?</h3>
        <RadioGroup
          value={draft.locationPrivacyLevel}
          onValueChange={(v) => onChange({ locationPrivacyLevel: v as PrivacyLevel })}
        >
          {(Object.keys(PRIVACY_LABELS) as PrivacyLevel[]).map((p) => (
            <label
              key={p}
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50"
            >
              <RadioGroupItem value={p} id={`p-${p}`} className="mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">{PRIVACY_LABELS[p]}</p>
                <p className="text-xs text-muted-foreground">{PRIVACY_NOTES[p]}</p>
              </div>
            </label>
          ))}
        </RadioGroup>
      </section>

      {summary && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          <p>
            <span className="font-medium">Your report will indicate:</span> {summary}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This is all investigators will see. Your exact address is never recorded.
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button
          onClick={onContinue}
          disabled={!draft.locationTownship && draft.locationLandmarks.length === 0}
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function OptionCard({
  icon,
  title,
  desc,
  active,
  onClick,
  extra,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={
        active
          ? "cursor-pointer border-2 border-accent p-4 transition-colors"
          : "cursor-pointer border-2 border-border p-4 transition-colors hover:bg-accent/5"
      }
    >
      {icon}
      <p className="mt-2 text-sm font-semibold text-primary">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      {extra}
    </Card>
  );
}
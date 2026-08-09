import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MapPin,
  Shield,
  Phone,
  AlertTriangle,
  Search,
  UserSearch,
  FileText,
  Gift,
  MessageSquare,
  Navigation,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { t } from "@/lib/i18n/en";
import { listStations } from "@/lib/dashboard/dashboard.functions";
import { CrimeStatsModal } from "@/components/saps/crime-stats-modal";

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return t.dashboard.morning;
  if (h < 18) return t.dashboard.afternoon;
  return t.dashboard.evening;
}

export function TimeAndGreeting() {
  const { user, profile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const name = profile?.full_name?.split(" ")[0];
  const time = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section aria-labelledby="greeting-heading" className="space-y-2">
      <p className="text-sm text-muted-foreground" suppressHydrationWarning>
        {mounted ? (
          <>
            {date} · <span className="tabular-nums">{time}</span>
          </>
        ) : (
          <span className="tabular-nums">&nbsp;</span>
        )}
      </p>
      <h1
        id="greeting-heading"
        className="text-3xl font-bold tracking-tight"
        suppressHydrationWarning
      >
        {user
          ? mounted
            ? `${greetingFor(now)}${name ? `, ${name}` : ""}.`
            : `Welcome back${name ? `, ${name}` : ""}.`
          : t.dashboard.welcomeGuest}
      </h1>
      <p className="max-w-2xl text-base text-muted-foreground">
        {user
          ? "Let's keep the community safe."
          : t.app.tagline + ". Browse cases or report a sighting safely."}
      </p>
    </section>
  );
}

export function LocationCard() {
  const { user, profile, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(profile?.area ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValue(profile?.area ?? "");
  }, [profile?.area]);

  if (!user) {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <MapPin className="mt-1 size-5 text-accent-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold">Set your area after signing in</p>
            <p className="text-sm text-muted-foreground">
              We never share your exact location — only a general area.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ area: value.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Area updated");
    setEditing(false);
    await refresh();
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MapPin className="mt-1 size-5 text-accent-foreground" aria-hidden="true" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.dashboard.locationLabel}
            </p>
            {editing ? (
              <div className="mt-1 flex gap-2">
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. Soweto"
                  className="h-10 w-48"
                  aria-label="Area name"
                />
                <Button onClick={save} disabled={saving} size="sm" className="h-10">
                  {t.dashboard.saveArea}
                </Button>
              </div>
            ) : (
              <p className="font-semibold">{profile?.area || "Not set"}</p>
            )}
          </div>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            {profile?.area ? "Change" : "Set area"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface ActionCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "primary" | "accent" | "destructive";
}

function ActionCard({ to, icon: Icon, title, description, tone = "primary" }: ActionCardProps) {
  const toneClass =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "accent"
        ? "bg-accent/30 text-accent-foreground"
        : "bg-primary/10 text-primary";

  return (
    <Link to={to} onClick={() => console.debug("ActionCard navigate to", to)} className="group block focus:outline-none">
      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-accent">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <span
            aria-hidden="true"
            className={`grid size-11 place-items-center rounded-md ${toneClass}`}
          >
            <Icon className="size-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ActionGrid() {
  const { user } = useAuth();
  return (
    <section aria-labelledby="actions-heading" className="space-y-3">
      <h2 id="actions-heading" className="text-xl font-semibold">
        Quick actions
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          to="/cases/wanted"
          icon={Search}
          title={t.dashboard.actions.browseWanted}
          description={t.dashboard.actions.browseWantedDesc}
          tone="destructive"
        />
        <ActionCard
          to="/cases/missing"
          icon={UserSearch}
          title={t.dashboard.actions.browseMissing}
          description={t.dashboard.actions.browseMissingDesc}
          tone="primary"
        />
        <ActionCard
          to="/report"
          icon={AlertTriangle}
          title={t.dashboard.actions.report}
          description={t.dashboard.actions.reportDesc}
          tone="accent"
        />
        {user && (
          <>
            <ActionCard
              to="/profile/reports"
              icon={FileText}
              title={t.dashboard.actions.myReports}
              description={t.dashboard.actions.myReportsDesc}
            />
            <ActionCard
              to="/profile/rewards"
              icon={Gift}
              title={t.dashboard.actions.rewards}
              description={t.dashboard.actions.rewardsDesc}
              tone="accent"
            />
            <ActionCard
              to="/chats"
              icon={MessageSquare}
              title="My Conversations"
              description="View responses from SAPS officers"
            />
          </>
        )}
      </div>
    </section>
  );
}

export function StationCard() {
  const { profile } = useAuth();
  const stationsFn = useServerFn(listStations);
  const area = profile?.area ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["nearest-station", area],
    queryFn: () => stationsFn({ data: { area, limit: 1 } }),
    staleTime: 10 * 60 * 1000,
  });

  const station = data?.stations[0];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-md bg-primary text-primary-foreground"
            >
              <Shield className="size-5" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t.dashboard.nearestStation}
              </p>
              {isLoading ? (
                <p className="font-semibold text-muted-foreground">Finding your station…</p>
              ) : station ? (
                <>
                  <p className="font-semibold">{station.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {station.address}
                    {station.is_24_hour ? " · 24-hour service" : ""}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Navigation className="size-3" aria-hidden="true" />
                    approx. {station.distanceKm} km from {data?.areaLabel}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Station directory unavailable right now.
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {station?.phone && (
              <Button asChild variant="outline" className="gap-2">
                <a href={`tel:${station.phone.replace(/\s+/g, "")}`} aria-label={`Call ${station.name}`}>
                  <Phone className="size-4" /> {station.phone}
                </a>
              </Button>
            )}
            <Button asChild variant="outline" className="gap-2">
              <a href="tel:10111" aria-label="Call emergency line 10111">
                <Phone className="size-4" /> 10111
              </a>
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
          <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
            <Link to="/stations">
              <Shield className="size-4" aria-hidden="true" /> All SAPS stations
            </Link>
          </Button>
          <CrimeStatsModal />
        </div>
      </CardContent>
    </Card>
  );
}
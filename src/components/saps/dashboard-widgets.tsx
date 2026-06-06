import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Shield,
  Phone,
  AlertTriangle,
  Search,
  UserSearch,
  FileText,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { t } from "@/lib/i18n/en";

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return t.dashboard.morning;
  if (h < 18) return t.dashboard.afternoon;
  return t.dashboard.evening;
}

export function TimeAndGreeting() {
  const { user, profile } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
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
      <p className="text-sm text-muted-foreground">
        {date} · <span className="tabular-nums">{time}</span>
      </p>
      <h1 id="greeting-heading" className="text-3xl font-bold tracking-tight">
        {user
          ? `${greetingFor(now)}${name ? `, ${name}` : ""}.`
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
  badge?: string;
}

function ActionCard({ to, icon: Icon, title, description, tone = "primary", badge }: ActionCardProps) {
  const toneClass =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "accent"
        ? "bg-accent/30 text-accent-foreground"
        : "bg-primary/10 text-primary";

  return (
    <Link to={to} className="group block focus:outline-none">
      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-accent">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between">
            <span
              aria-hidden="true"
              className={`grid size-11 place-items-center rounded-md ${toneClass}`}
            >
              <Icon className="size-5" />
            </span>
            {badge && <Badge variant="secondary">{badge}</Badge>}
          </div>
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
          badge="Soon"
        />
        {user && (
          <>
            <ActionCard
              to="/activity"
              icon={FileText}
              title={t.dashboard.actions.myReports}
              description={t.dashboard.actions.myReportsDesc}
              badge="Soon"
            />
            <ActionCard
              to="/activity"
              icon={Trophy}
              title={t.dashboard.actions.rewards}
              description={t.dashboard.actions.rewardsDesc}
              tone="accent"
              badge="Soon"
            />
            <ActionCard
              to="/activity"
              icon={Users}
              title={t.dashboard.actions.community}
              description={t.dashboard.actions.communityDesc}
              badge="Soon"
            />
          </>
        )}
      </div>
    </section>
  );
}

export function StationCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="font-semibold">Johannesburg Central SAPS</p>
            <p className="text-sm text-muted-foreground">
              1 Commissioner St · 24-hour service
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <a href="tel:10111" aria-label="Call emergency line 10111">
            <Phone className="size-4" /> 10111
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
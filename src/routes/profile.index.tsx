import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, FileText, MessageSquare, Bell, Lock, Gift, Languages, Accessibility, ChevronRight, Search} from "lucide-react";
import { PageShell } from "@/components/saps/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileFieldRow } from "@/components/profile-field-row";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { getProfile, updateProfile } from "@/lib/profile.functions";
import { getMyRewards } from "@/lib/rewards.functions";
import { getTotalUnread } from "@/lib/chat-utils";
import type { UserProfile } from "@/lib/profile.functions";
import { TOWNSHIPS } from "@/lib/reports/townships";
import { stripExifToDataUrl } from "@/lib/reports/exif-strip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/i18n-context";
import { getLanguage } from "@/lib/i18n/registry";
import { useAccessibility } from "@/lib/accessibility/accessibility-context";

export const Route = createFileRoute("/profile/")({
  head: () => ({ meta: [{ title: "My Profile · Community Safety Tracker" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, status, roles } = useAuth();

  if (status === "loading") return <PageShell><Skeleton className="h-40 w-full rounded-xl" /></PageShell>;
  if (!user) return <GuestPrompt />;
  return <AuthenticatedProfile roles={roles} />;
}

// ── Guest prompt ───────────────────────────────────────────────────────────

function GuestPrompt() {
  return (
    <PageShell>
      <div className="flex flex-col items-center gap-6 py-16 text-center max-w-sm mx-auto">
        <Shield className="size-16 text-accent" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Create an Account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track your reports, manage your conversations with SAPS, and prepare for future rewards.
          </p>
        </div>
        <ul className="text-sm text-left space-y-2 w-full" role="list">
          {[
            "See the status of reports you've submitted",
            "Access your conversations with SAPS officers",
            "Control your notification and privacy settings",
          ].map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-accent font-bold">•</span> {b}
            </li>
          ))}
        </ul>
        <Button asChild className="w-full bg-accent text-accent-foreground">
          <Link to="/auth">Create Free Account</Link>
        </Button>
        <Link to="/auth" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          Already have an account? Sign In
        </Link>
      </div>
    </PageShell>
  );
}

// ── Authenticated profile ──────────────────────────────────────────────────

function AuthenticatedProfile({ roles }: { roles: string[] }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const a11y = useAccessibility();
  const a11yCustomized =
    a11y.high_contrast_enabled || a11y.text_scale_factor !== 1 || a11y.reduce_motion_enabled;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unread] = useState(() => getTotalUnread());
  const [eligibleRewards, setEligibleRewards] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProfile(), getMyRewards()])
      .then(([loadedProfile, rewards]) => {
        setProfile(loadedProfile);
        setEligibleRewards(rewards.filter((e) => e.eligibility_status === "eligible").length);
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Failed to load profile or rewards", err);
        toast.error(err instanceof Error ? err.message : "Failed to load profile data");
      })
      .finally(() => setLoading(false));
  }, []);

  async function save(field: Record<string, unknown>) {
    const payload = Object.fromEntries(Object.entries(field).filter(([, value]) => value !== undefined));
    try {
      await updateProfile({ data: payload });
      const refreshed = await getProfile();
      setProfile(refreshed);
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      // Surface the error for easier debugging and show a toast to the user
      // eslint-disable-next-line no-console
      console.error("Failed to update profile", err);
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
      throw err;
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
    try {
      const { dataUrl } = await stripExifToDataUrl(file, 400, 0.8);
      const path = `avatars/${user!.id}/${Date.now()}.jpg`;
      const blob = await (await fetch(dataUrl)).blob();
      const { error } = await supabase.storage.from("profile-photos").upload(path, blob, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
      await save({ avatar_url: data.publicUrl });
      toast.success("Privacy protected ✓ — photo saved");
    } catch {
      toast.error("Failed to upload photo");
    }
    e.target.value = "";
  }

  const initials = (profile?.full_name ?? user?.email ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const accountTypeLabel = roles.includes("super_admin")
    ? "Super Admin"
    : roles.includes("admin")
    ? "Admin"
    : roles.includes("moderator")
    ? "Moderator"
    : roles.includes("analyst")
    ? "Analyst"
    : roles.includes("detective")
    ? "Detective"
    : roles.includes("user")
    ? "Registered User"
    : "Unknown Role";

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-ZA", { month: "long", year: "numeric" })
    : "";

  if (loading) return <PageShell><div className="space-y-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div></PageShell>;

  return (
    <PageShell>
      <h1 className="sr-only">My Profile</h1>

      {/* Header */}
      <div className="flex flex-col items-center gap-3 pb-6 text-center">
        <label className="relative cursor-pointer group" aria-label="Change profile photo">
          <div className="size-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold overflow-hidden">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              : initials}
          </div>
          <span className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity">Edit</span>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} aria-hidden="true" />
        </label>
        <div>
          <h2 className="text-xl font-bold text-primary">{profile?.full_name ?? "—"}</h2>
          {profile?.email_verified ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 rounded-full px-2 py-0.5 mt-1">
              ✓ Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mt-1">
              ⚠ Email Not Verified
            </span>
          )}
          {memberSince && <p className="text-xs text-muted-foreground mt-1">Member since {memberSince}</p>}
        </div>
      </div>

      {/* Personal info */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Personal Information</h3>
          <ProfileFieldRow
            label="Full Name"
            value={profile?.full_name ?? null}
            onSave={(v) => save({ full_name: v })}
            validate={(v) => v.trim().length < 2 ? "Name must be at least 2 characters" : null}
          />
          <div className="py-3 border-b border-border">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Email Address</span>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm">{profile?.email}</p>
              {profile?.email_verified
                ? <span className="text-xs text-green-700 bg-green-100 rounded-full px-2 py-0.5">✓ Verified</span>
                : <button className="text-xs text-amber-700 underline" onClick={() => supabase.auth.resend({ type: "signup", email: profile!.email })}>Verify Now</button>}
            </div>
          </div>
          <ProfileFieldRow
            label="Phone Number"
            value={profile?.phone_number ?? null}
            placeholder="Not provided"
            inputType="tel"
            onSave={(v) => save({ phone_number: v || null })}
            validate={(v) => v && !/^(0\d{9}|\+27\d{9})$/.test(v.replace(/\s/g, "")) ? "Enter a valid South African phone number" : null}
          />
          <ProfileFieldRow
            label="Primary Township"
            value={profile?.primary_township ?? null}
            placeholder="Not set"
            options={TOWNSHIPS}
            draftKey="profile:primary_township"
            onSave={(v) => save({ primary_township: v || null })}
            validate={(v) => v && !TOWNSHIPS.includes(v) ? "Select a valid township" : null}
          />
        </CardContent>
      </Card>

      {/* Account type */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-1">Account Type</h3>
          <p className="text-sm font-medium">{accountTypeLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Your reports and conversations are linked to your account while keeping your identity hidden from SAPS officers, as explained in your privacy settings below.
          </p>
        </CardContent>
      </Card>

      {/* Quick nav — 2x2 grid + full-width rewards card */}
      <div className="grid grid-cols-2 gap-3 mb-3" role="navigation" aria-label="Profile sections">
        {[
          { label: "My Reports", icon: FileText, sub: "View submissions", to: "/profile/reports" as const },
          { label: "My Conversations", icon: MessageSquare, sub: unread > 0 ? `${unread} Unread` : "No new messages", to: "/chats" as const },
          { label: "Notifications", icon: Bell, sub: "Manage alerts", to: "/profile/notifications" as const },
          { label: "Privacy & Security", icon: Lock, sub: "Settings & account", to: "/profile/privacy-security" as const },
        ].map(({ label, icon: Icon, sub, to }) => (
          <Link key={to} to={to} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1 hover:bg-muted/50 transition-colors focus-visible:outline-2">
            <Icon className="size-5 text-primary mb-1" aria-hidden="true" />
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs text-muted-foreground">{sub}</span>
          </Link>
        ))}
      </div>
      {/* Track a report — full-width */}
      <Link to="/track" className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors focus-visible:outline-2 mb-3">
        <Search className="size-5 text-primary shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <span className="text-sm font-semibold">Track a Report</span>
          <p className="text-xs text-muted-foreground">Check status with your reference number</p>
        </div>
      </Link>

      {/* My Rewards — full-width fifth card */}
      <Link to="/profile/rewards" className="rounded-xl border border-border bg-card p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors focus-visible:outline-2 mb-6">
        <Gift className="size-5 text-primary shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <span className="text-sm font-semibold">My Rewards</span>
          {eligibleRewards > 0
            ? <p className="text-xs text-accent font-medium">{eligibleRewards} Reward{eligibleRewards > 1 ? "s" : ""} Available</p>
            : <p className="text-xs text-muted-foreground">View reward eligibility</p>}
        </div>
      </Link>

      {/* Language + Accessibility rows */}
      <div className="rounded-xl border border-border bg-card mb-6 divide-y divide-border">
        <Link
          to="/profile/language"
          className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors focus-visible:outline-2 rounded-t-xl"
          style={{ minHeight: 56 }}
        >
          <Languages className="size-5 text-primary shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-semibold">{t("profile.language")}</div>
          </div>
          <span className="text-sm text-muted-foreground">{getLanguage(language).name_native}</span>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </Link>
        <Link
          to="/profile/privacy-security"
          className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors focus-visible:outline-2 rounded-b-xl"
          style={{ minHeight: 56 }}
        >
          <Accessibility className="size-5 text-primary shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-semibold">{t("profile.accessibility")}</div>
            {a11yCustomized && (
              <div className="text-xs text-accent">{t("profile.accessibilitySummary")}</div>
            )}
          </div>
          <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
        </Link>
      </div>

      <Button variant="outline" className="w-full" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
        Sign Out
      </Button>
    </PageShell>
  );
}
